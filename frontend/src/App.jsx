import { useState, useEffect, useCallback } from 'react';
import './App.css';

// Backend base URL: set in .env as VITE_API_BASE_URL or default to localhost
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

const POLL_INTERVAL_MS = 5000;

function App() {
  const [top10, setTop10] = useState([]);
  const [topLoading, setTopLoading] = useState(true);
  const [topError, setTopError] = useState(null);

  const [lookupUserId, setLookupUserId] = useState('');
  const [lookupResult, setLookupResult] = useState(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState(null);

  const [submitUserId, setSubmitUserId] = useState('');
  const [submitScore, setSubmitScore] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [submitSuccess, setSubmitSuccess] = useState(null);

  const fetchTop10 = useCallback(async () => {
    setTopError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/leaderboard/top`);
      if (!response.ok) {
        throw new Error('Failed to fetch leaderboard');
      }
      const json = await response.json();
      if (!json.success || !Array.isArray(json.data)) {
        throw new Error('Invalid response from server');
      }
      setTop10(json.data);
    } catch (err) {
      setTopError(err.message);
      setTop10([]);
    } finally {
      setTopLoading(false);
    }
  }, []);

  // Initial fetch and poll every 5 seconds
  useEffect(() => {
    fetchTop10();
    const interval = setInterval(fetchTop10, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchTop10]);

  const handleRankLookup = async (e) => {
    e.preventDefault();
    const userId = lookupUserId.trim();
    if (!userId) return;

    setLookupError(null);
    setLookupResult(null);
    setLookupLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/leaderboard/rank/${encodeURIComponent(userId)}`);
      const json = await response.json();

      if (!response.ok) {
        throw new Error(json.error || 'User not found');
      }
      if (!json.success || !json.data) {
        throw new Error('Invalid response from server');
      }
      setLookupResult(json.data);
    } catch (err) {
      setLookupError(err.message);
      setLookupResult(null);
    } finally {
      setLookupLoading(false);
    }
  };

  const handleSubmitScore = async (e) => {
    e.preventDefault();
    const userId = submitUserId.trim();
    const score = submitScore.trim();

    if (!userId || !score) return;

    setSubmitError(null);
    setSubmitSuccess(null);
    setSubmitLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/leaderboard/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: parseInt(userId),
          score: parseInt(score),
        }),
      });

      const json = await response.json();

      if (!response.ok) {
        throw new Error(json.error || 'Failed to submit score');
      }
      if (!json.success || !json.data) {
        throw new Error('Invalid response from server');
      }

      setSubmitSuccess(`Score submitted! User ${json.data.user_id} now has rank ${json.data.rank} with total score ${Number(json.data.total_score).toLocaleString()}`);
      setSubmitUserId('');
      setSubmitScore('');
      
      // Refresh top 10 leaderboard
      fetchTop10();
    } catch (err) {
      setSubmitError(err.message);
      setSubmitSuccess(null);
    } finally {
      setSubmitLoading(false);
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>Leaderboard</h1>
        <p>Top 10 · Refreshes every 5s</p>
      </header>

      <main className="app-main">
        <section className="section submit-section">
          <h2>Submit Score</h2>
          <form onSubmit={handleSubmitScore} className="submit-form">
            <div className="form-group">
              <label htmlFor="submit-user-id">User ID</label>
              <input
                id="submit-user-id"
                type="number"
                value={submitUserId}
                onChange={(e) => setSubmitUserId(e.target.value)}
                placeholder="e.g. 1"
                disabled={submitLoading}
                min="1"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="submit-score">Score</label>
              <input
                id="submit-score"
                type="number"
                value={submitScore}
                onChange={(e) => setSubmitScore(e.target.value)}
                placeholder="e.g. 1000"
                disabled={submitLoading}
                min="0"
                required
              />
            </div>
            <button type="submit" disabled={submitLoading} className="submit-button">
              {submitLoading ? 'Submitting…' : 'Submit Score'}
            </button>
          </form>
          {submitError && (
            <div className="message message-error" role="alert">
              {submitError}
            </div>
          )}
          {submitSuccess && (
            <div className="message message-success" role="alert">
              {submitSuccess}
            </div>
          )}
        </section>

        <section className="section leaderboard-section">
          <h2>Top 10</h2>
          {topError && (
            <div className="message message-error" role="alert">
              {topError}
            </div>
          )}
          {topLoading && top10.length === 0 ? (
            <div className="message message-loading">Loading…</div>
          ) : top10.length === 0 ? (
            <div className="message message-empty">No entries yet.</div>
          ) : (
            <div className="table-wrap">
              <table className="leaderboard-table">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>User</th>
                    <th>Score</th>
                  </tr>
                </thead>
                <tbody>
                  {top10.map((row) => (
                    <tr key={row.user_id}>
                      <td className="col-rank">{row.rank}</td>
                      <td className="col-user">{row.username ?? `User ${row.user_id}`}</td>
                      <td className="col-score">{Number(row.total_score).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {topLoading && top10.length > 0 && (
            <div className="refreshing">Updating…</div>
          )}
        </section>

        <section className="section lookup-section">
          <h2>Rank Lookup</h2>
          <form onSubmit={handleRankLookup} className="lookup-form">
            <label htmlFor="user-id">User ID</label>
            <div className="lookup-row">
              <input
                id="user-id"
                type="text"
                value={lookupUserId}
                onChange={(e) => setLookupUserId(e.target.value)}
                placeholder="e.g. 1"
                disabled={lookupLoading}
                autoComplete="off"
              />
              <button type="submit" disabled={lookupLoading}>
                {lookupLoading ? 'Looking up…' : 'Look up'}
              </button>
            </div>
          </form>
          {lookupError && (
            <div className="message message-error" role="alert">
              {lookupError}
            </div>
          )}
          {lookupResult && (
            <div className="lookup-result">
              <p><strong>Rank</strong> {lookupResult.rank}</p>
              <p><strong>User</strong> {lookupResult.username ?? `User ${lookupResult.user_id}`}</p>
              <p><strong>Total score</strong> {Number(lookupResult.total_score).toLocaleString()}</p>
            </div>
          )}
        </section>
      </main>

      <footer className="app-footer">
        <p>API: {API_BASE_URL}</p>
      </footer>
    </div>
  );
}

export default App;

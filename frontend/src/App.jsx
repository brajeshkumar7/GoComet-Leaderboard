import { useState, useEffect } from 'react';
import './App.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

function App() {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [gameMode, setGameMode] = useState('');
  const [submitForm, setSubmitForm] = useState({
    userId: '',
    username: '',
    score: '',
    gameMode: 'default'
  });

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async (mode = '') => {
    setLoading(true);
    setError(null);
    try {
      const url = mode 
        ? `${API_BASE_URL}/api/leaderboard/${mode}?limit=100`
        : `${API_BASE_URL}/api/leaderboard?limit=100`;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch leaderboard');
      }
      const data = await response.json();
      setLeaderboard(data.data || []);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching leaderboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitScore = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/scores`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: parseInt(submitForm.userId),
          username: submitForm.username,
          score: parseInt(submitForm.score),
          gameMode: submitForm.gameMode,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit score');
      }

      const data = await response.json();
      alert(`Score submitted successfully! Rank: ${data.data.rank}`);
      
      // Reset form
      setSubmitForm({
        userId: '',
        username: '',
        score: '',
        gameMode: 'default'
      });

      // Refresh leaderboard
      fetchLeaderboard(submitForm.gameMode);
    } catch (err) {
      setError(err.message);
      console.error('Error submitting score:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    const mode = e.target.value;
    setGameMode(mode);
    fetchLeaderboard(mode);
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>🏆 Gaming Leaderboard</h1>
        <p>Real-time leaderboard system</p>
      </header>

      <main className="app-main">
        <section className="submit-section">
          <h2>Submit Score</h2>
          <form onSubmit={handleSubmitScore} className="score-form">
            <div className="form-group">
              <label htmlFor="userId">User ID:</label>
              <input
                type="number"
                id="userId"
                value={submitForm.userId}
                onChange={(e) => setSubmitForm({ ...submitForm, userId: e.target.value })}
                required
                min="1"
              />
            </div>
            <div className="form-group">
              <label htmlFor="username">Username:</label>
              <input
                type="text"
                id="username"
                value={submitForm.username}
                onChange={(e) => setSubmitForm({ ...submitForm, username: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="score">Score:</label>
              <input
                type="number"
                id="score"
                value={submitForm.score}
                onChange={(e) => setSubmitForm({ ...submitForm, score: e.target.value })}
                required
                min="0"
              />
            </div>
            <div className="form-group">
              <label htmlFor="gameMode">Game Mode:</label>
              <input
                type="text"
                id="gameMode"
                value={submitForm.gameMode}
                onChange={(e) => setSubmitForm({ ...submitForm, gameMode: e.target.value })}
                placeholder="default"
              />
            </div>
            <button type="submit" disabled={loading}>
              {loading ? 'Submitting...' : 'Submit Score'}
            </button>
          </form>
        </section>

        <section className="leaderboard-section">
          <div className="leaderboard-header">
            <h2>Leaderboard</h2>
            <div className="filter-group">
              <label htmlFor="gameModeFilter">Filter by Game Mode:</label>
              <input
                type="text"
                id="gameModeFilter"
                value={gameMode}
                onChange={handleFilterChange}
                placeholder="Enter game mode or leave empty for all"
              />
              <button onClick={() => {
                setGameMode('');
                fetchLeaderboard();
              }}>
                Clear Filter
              </button>
            </div>
          </div>

          {error && (
            <div className="error-message">
              Error: {error}
            </div>
          )}

          {loading ? (
            <div className="loading">Loading leaderboard...</div>
          ) : leaderboard.length === 0 ? (
            <div className="empty-state">No scores yet. Be the first to submit!</div>
          ) : (
            <div className="leaderboard-table">
              <table>
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Username</th>
                    <th>Score</th>
                    <th>Game Mode</th>
                    <th>Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((entry, index) => (
                    <tr key={`${entry.userId}-${entry.gameMode}-${index}`}>
                      <td className="rank">{entry.rank || index + 1}</td>
                      <td className="username">{entry.username}</td>
                      <td className="score">{entry.score.toLocaleString()}</td>
                      <td className="game-mode">{entry.gameMode || 'default'}</td>
                      <td className="updated">
                        {new Date(entry.updatedAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      <footer className="app-footer">
        <p>Gaming Leaderboard System - Built with React + Vite</p>
      </footer>
    </div>
  );
}

export default App;

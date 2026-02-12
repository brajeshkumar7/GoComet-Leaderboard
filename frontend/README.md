# Frontend – Gaming Leaderboard UI

React 18 + Vite SPA for the gaming leaderboard: submit scores, view top 10, and look up a user’s rank. Uses the backend REST API only; no extra UI frameworks.

---

## Features

- **Submit Score** – Form (User ID, Score) → `POST /api/leaderboard/submit`. Success message and optional refresh of top 10.
- **Top 10 Leaderboard** – Table (Rank, User, Score). Data from `GET /api/leaderboard/top`, refreshed on load and every 5 seconds.
- **Rank Lookup** – Input User ID → `GET /api/leaderboard/rank/:user_id`. Shows rank, username, total score or error.
- **Loading & errors** – Loading states and error messages for submit, top 10, and rank lookup.
- **Configurable API** – Backend base URL via `VITE_API_BASE_URL`.

---

## Setup

1. **Install:** `npm install`
2. **Optional:** Copy `.env.example` to `.env` and set `VITE_API_BASE_URL` if the backend is not at `http://localhost:3000`.
3. **Run:** `npm run dev`

App is served at **http://localhost:5173** (Vite default). Ensure the backend is running so API calls succeed.

---

## API Flow (from UI)

- **On load / every 5s:** `GET /api/leaderboard/top` → render table or error.
- **On “Submit Score”:** `POST /api/leaderboard/submit` with `{ user_id, score }` → show success or error; on success, trigger a refresh of top 10.
- **On “Look up” (Rank Lookup):** `GET /api/leaderboard/rank/:user_id` → show rank block or “not found” / error.

All requests use `fetch`; base URL is `import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'`.

---

## Build & Preview

```bash
npm run build    # Output in dist/
npm run preview  # Serve dist/ locally
```

For production, serve the `dist/` folder from a static host or reverse proxy and set `VITE_API_BASE_URL` to the public backend URL at build time.

---

## Environment

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_BASE_URL` | Backend API base URL (no trailing slash) | `http://localhost:3000` |

---

## Structure

- **src/App.jsx** – Main UI: submit form, top 10 table, rank lookup form, state and API calls.
- **src/App.css** – Component styles.
- **src/main.jsx** – Entry; mounts `App` into `#root`.
- **src/index.css** – Global/reset styles.
- **index.html** – HTML shell; script points to `src/main.jsx`.

No UI library; layout and styling are plain React and CSS.

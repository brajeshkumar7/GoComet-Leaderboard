# Frontend - Gaming Leaderboard

React + Vite frontend for the Gaming Leaderboard backend.

## Features

- **Top 10 Leaderboard** – Renders the top 10 users (rank, user, total score).
- **Auto-refresh** – Polls `GET /api/leaderboard/top` every 5 seconds.
- **Rank Lookup** – Look up a user’s rank by `user_id` via `GET /api/leaderboard/rank/:user_id`.
- **Loading & errors** – Loading states and error messages for both leaderboard and lookup.
- **Configurable API** – Backend base URL set via `VITE_API_BASE_URL`.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. (Optional) Set backend URL. Create `.env` in the frontend directory:
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and set:
   ```
   VITE_API_BASE_URL=http://localhost:3000
   ```
   If unset, the app uses `http://localhost:3000`.

3. Start the dev server:
   ```bash
   npm run dev
   ```
   App runs at `http://localhost:5173` (Vite default).

## Build

```bash
npm run build
```

Output is in `dist/`.

## Preview production build

```bash
npm run preview
```

## Environment

| Variable              | Description                          | Default              |
|-----------------------|--------------------------------------|----------------------|
| `VITE_API_BASE_URL`   | Backend API base URL (no trailing `/`) | `http://localhost:3000` |

## API usage

The UI uses:

- `GET {VITE_API_BASE_URL}/api/leaderboard/top` – Top 10 (polled every 5s).
- `GET {VITE_API_BASE_URL}/api/leaderboard/rank/:user_id` – Rank lookup (on demand).

No UI frameworks; plain React, CSS, and `fetch`.

# Gaming Leaderboard System

A full-stack **Gaming Leaderboard** system: submit scores, view top 10, and look up player rank. Built for the GoComet take-home assignment with performance optimizations, monitoring, and clear documentation.

## Tech Stack

- **Backend:** Node.js 18+, Express.js
- **Database:** MySQL 8+ (InnoDB)
- **Cache:** Redis (e.g. Upstash; URL in env)
- **Frontend:** React + Vite
- **Monitoring:** New Relic APM (optional, env-driven)
- **Package manager:** npm

## Assignment APIs (Exact Paths)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/leaderboard/submit` | Submit score. Body: `{ "user_id": number, "score": number }` |
| GET | `/api/leaderboard/top` | Top 10 players by `total_score` |
| GET | `/api/leaderboard/rank/:user_id` | Current rank for a player |

## Project Structure

```
gocomet-leaderboard/
├── backend/           # Express API, MySQL, Redis, New Relic
├── frontend/          # React + Vite UI
├── docs/              # HLD.md, LLD.md
├── ASSIGNMENT_CHECKLIST.md   # Requirement vs implementation mapping
├── PERFORMANCE_REPORT.md     # How to capture New Relic screenshots
└── README.md          # This file
```

## Quick Start

### Backend

```bash
cd backend
npm install
cp .env.example .env
# Edit .env: DB_*, REDIS_URL, optionally NEW_RELIC_LICENSE_KEY
npm start
```

- Default port: **3000**. Create DB: `CREATE DATABASE leaderboard_db;` (or use `backend/CREATE_DATABASE.sql`).

### Frontend

```bash
cd frontend
npm install
npm run dev
```

- Opens at **http://localhost:5173**. Set `VITE_API_BASE_URL` in `.env` if backend is not on port 3000.

### Load simulation (assignment script)

```bash
# Backend must be running. Uses port 3000 by default.
python backend/scripts/load_test.py

# Assignment used port 8000; to match:
# Windows: set API_BASE_URL=http://localhost:8000/api/leaderboard && python backend/scripts/load_test.py
# Linux/Mac: API_BASE_URL=http://localhost:8000/api/leaderboard python backend/scripts/load_test.py
```

## Tests

```bash
cd backend
npm test
```

## Final Deliverables (Assignment)

| Deliverable | Location |
|-------------|----------|
| Backend code | `backend/` |
| Frontend code | `frontend/` |
| Performance report (New Relic) | See **PERFORMANCE_REPORT.md** for what to capture and how to take screenshots |
| Documentation | **README.md** (this), **backend/README.md**, **frontend/README.md**, **docs/HLD.md**, **docs/LLD.md**, **ASSIGNMENT_CHECKLIST.md** |

## Documentation

- **ASSIGNMENT_CHECKLIST.md** – Maps every assignment requirement to the codebase.
- **docs/HLD.md** – High-level design (context, APIs, data flow, deployment).
- **docs/LLD.md** – Low-level design (structure, schema, services, cache, errors).
- **PERFORMANCE_REPORT.md** – How to enable New Relic, run load, and take screenshots for the performance report.

## Features Implemented

- All three assignment APIs at the required paths
- Database: users, game_sessions, leaderboard (MySQL schema with indexes)
- Submit updates `game_sessions` and leaderboard in a transaction
- Redis cache for `/api/leaderboard/top` with invalidation on submit
- New Relic integration (optional)
- Frontend: Submit Score, Top 10 (live polling), Rank Lookup
- Unit tests for leaderboard controller
- Graceful behavior when Redis or DB is unavailable

# Gaming Leaderboard System

A full-stack **gaming leaderboard** application: players submit scores, view the top 10, and check their rank. Built with performance, consistency, and observability in mind.

---

## Tech Stack

| Layer      | Technology |
|-----------|------------|
| Backend   | Node.js 18+, Express.js |
| Database  | MySQL 8+ (InnoDB) |
| Cache     | Redis (e.g. Upstash; URL in env) |
| Frontend  | React 18, Vite |
| Monitoring| New Relic APM (optional) |
| Package   | npm |

---

## Project Structure

```
gocomet-leaderboard/
├── backend/                 # Express API, MySQL, Redis, New Relic
│   ├── src/                 # app, server, routes, controllers, services, db, cache
│   ├── scripts/             # load_test.py, populate_database.sql
│   ├── newrelic.js
│   └── README.md            # Backend documentation
├── frontend/                # React + Vite UI
│   ├── src/
│   └── README.md            # Frontend documentation
├── docs/
│   ├── HLD.md               # High-level design
│   └── LLD.md               # Low-level design
├── ASSIGNMENT_CHECKLIST.md  # Requirement → implementation mapping
├── PERFORMANCE_REPORT.md    # New Relic screenshots guide
└── README.md                # This file
```

---

## APIs (Assignment Contract)

| Method | Path | Description |
|--------|------|-------------|
| **POST** | `/api/leaderboard/submit` | Submit score. Body: `{ "user_id": number, "score": number }`. Updates `game_sessions` and leaderboard. |
| **GET**  | `/api/leaderboard/top`    | Top 10 players by `total_score` (desc). |
| **GET**  | `/api/leaderboard/rank/:user_id` | Current rank for a player. |

All responses: `{ "success": true, "data": ... }` or `{ "success": false, "error": "..." }`.

---

## Quick Start

### Prerequisites

- Node.js 18+
- MySQL 8+
- Redis (or Upstash URL)
- Python 3 (for load script)

### Backend

```bash
cd backend
npm install
cp .env.example .env
# Edit .env: DB_*, REDIS_URL; optionally NEW_RELIC_LICENSE_KEY
```

Create database: `CREATE DATABASE leaderboard_db;` (or run `backend/CREATE_DATABASE.sql`).

```bash
npm start
```

Runs on **http://localhost:3000** by default.

### Frontend

```bash
cd frontend
npm install
cp .env.example .env   # optional; set VITE_API_BASE_URL if backend ≠ localhost:3000
npm run dev
```

Opens at **http://localhost:5173**.

### Load simulation

```bash
# From repo root; backend must be running
python backend/scripts/load_test.py
# Or: python .\backend\scripts\load_test.py  (PowerShell from root)
```

---

## Design Summary

- **API flow:** Request → validation → service (DB/cache) → response. See [backend/README.md](backend/README.md#api-flow) and [docs/LLD.md](docs/LLD.md).
- **Database indexing:** Indexes on `total_score DESC`, `user_id`, `game_mode`, `timestamp`; rationale in [backend/README.md](backend/README.md#database-indexing-rationale).
- **Caching:** Redis caches `GET /api/leaderboard/top` (key `leaderboard:top10`, TTL 10s); invalidated on every submit. [backend/README.md](backend/README.md#caching-strategy).
- **Concurrency:** Single write path (submit) inside a DB transaction; connection pool; InnoDB row locking. [backend/README.md](backend/README.md#concurrency-handling).
- **Atomicity & consistency:** Submit is one transaction (user upsert, game_sessions insert, leaderboard update, rank recalc); cache cleared after commit. [backend/README.md](backend/README.md#atomicity--consistency-guarantees).
- **New Relic:** Optional; enable via `NEW_RELIC_LICENSE_KEY` in `.env`. [backend/README.md](backend/README.md#new-relic-monitoring).
- **What was skipped and why:** [backend/README.md](backend/README.md#what-was-skipped-and-why).
- **Scaling:** [backend/README.md](backend/README.md#how-to-scale-further).

---

## Tests

```bash
cd backend
npm test
```

---

## Documentation Index

| Document | Purpose |
|----------|---------|
| **README.md** (this) | Overview, quick start, design summary. |
| **backend/README.md** | Setup, APIs, DB, indexing, caching, concurrency, atomicity, New Relic, skipped, scaling. |
| **frontend/README.md** | Setup, features, env, build. |
| **docs/HLD.md** | High-level design: context, data flow, deployment, scope. |
| **docs/LLD.md** | Low-level design: structure, schema, service logic, cache, config. |
| **ASSIGNMENT_CHECKLIST.md** | Maps each assignment requirement to the codebase. |
| **PERFORMANCE_REPORT.md** | How to capture New Relic screenshots for the performance report. |

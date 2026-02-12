# Backend – Gaming Leaderboard API

Express.js API for the gaming leaderboard: submit scores, get top 10, get player rank. Uses MySQL, Redis cache, and optional New Relic APM.

---

## Setup

1. **Install:** `npm install`
2. **Config:** `cp .env.example .env` and set:
   - **DB_*** – MySQL host, port, user, password, database name
   - **REDIS_URL** – Redis connection URL (e.g. Upstash)
   - **NEW_RELIC_LICENSE_KEY** (optional) – for APM
3. **Database:** Create DB: `CREATE DATABASE leaderboard_db;` (or use `CREATE_DATABASE.sql`). Tables are created on first run.
4. **Run:** `npm start` (dev: `npm run dev`)

Default port: **3000**.

---

## API Endpoints

### Assignment APIs

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/leaderboard/submit` | Submit score. Body: `{ "user_id": number, "score": number }`. |
| GET | `/api/leaderboard/top` | Top 10 players by `total_score` descending. |
| GET | `/api/leaderboard/rank/:user_id` | Current rank for `user_id`. |

### Other

- **GET /health** – Health check (status, uptime).

---

## API Flow Explanations

### POST /api/leaderboard/submit

1. **Controller** – Reads `user_id` and `score` from body; validates (required, positive integer / non‑negative integer); parses and passes to service.
2. **Service** – Runs inside a single **MySQL transaction**:
   - Upsert user (insert or no-op if exists).
   - Insert one row into **game_sessions** (user_id, score, game_mode `'default'`).
   - Upsert **leaderboard**: insert or add `score` to `total_score` for that user.
   - Recompute **rank** for all rows (window function `ROW_NUMBER() OVER (ORDER BY total_score DESC, user_id)`).
   - Read back current user’s row (total_score, rank).
3. **After commit** – Invalidate Redis key `leaderboard:top10`.
4. **Response** – 201 with `{ success, data: { user_id, score, total_score, rank } }`. On validation error: 400. On server/DB error: 500 (or 503 if DB unavailable).

### GET /api/leaderboard/top

1. **Controller** – No query params; calls service.
2. **Service** – Check Redis for key `leaderboard:top10`. If hit, return cached list.
3. **On cache miss** – Query MySQL: join leaderboard + users, `ORDER BY total_score DESC, user_id ASC`, `LIMIT 10`. Store result in Redis with TTL 10s. Return list.
4. **Response** – 200 with `{ success, data: [ { user_id, username, total_score, rank }, ... ] }`.

### GET /api/leaderboard/rank/:user_id

1. **Controller** – Reads `user_id` from path; validates (positive integer); calls service.
2. **Service** – Select user’s row from leaderboard (join users for username). If not found, return null. Otherwise compute rank via `COUNT(*) + 1` over rows with higher total_score or same score and lower user_id (index‑friendly).
3. **Response** – 200 with `{ success, data: { user_id, username, total_score, rank } }`, or 404 if user not in leaderboard. 400 for invalid user_id.

---

## Database Schema

- **users** – `id` (PK, AUTO_INCREMENT), `username` (UNIQUE), `join_date`.
- **game_sessions** – `id` (PK), `user_id` (FK → users, CASCADE), `score`, `game_mode`, `timestamp`.
- **leaderboard** – `user_id` (PK, FK → users, CASCADE), `total_score` (BIGINT), `rank` (INT; column name escaped as `` `rank` `` in MySQL).

Full DDL: `src/db/schema.sql`. Schema is created automatically in `src/db/mysql.js` on startup.

---

## Database Indexing Rationale

| Table | Index | Rationale |
|-------|--------|-----------|
| **users** | PRIMARY (id) | PK lookups and FK joins. |
| **users** | UNIQUE (username) | Enforce uniqueness and lookups by username. |
| **game_sessions** | (user_id) | Joins and “all sessions for user”; used when aggregating. |
| **game_sessions** | (game_mode) | Filter by mode if needed. |
| **game_sessions** | (timestamp DESC) | Chronological queries (e.g. recent sessions). |
| **leaderboard** | PRIMARY (user_id) | Single-user lookups and FK. |
| **leaderboard** | (total_score DESC) | **Critical:** `ORDER BY total_score DESC LIMIT 10` for /top; avoids full table scan. |
| **leaderboard** | (rank) | Rank-based queries if needed. |

**BIGINT for total_score** – Allows very large cumulative scores without overflow.

---

## Caching Strategy

- **What is cached:** Only the result of **GET /api/leaderboard/top**.
- **Key:** `leaderboard:top10`
- **TTL:** 10 seconds.
- **Read path:** Service checks Redis first; on miss, queries MySQL, stores in Redis, returns.
- **Invalidation:** On every successful **POST /api/leaderboard/submit**, the key is deleted so the next /top request gets fresh data.
- **Graceful fallback:** If Redis is unavailable, all cache ops no-op; every /top hits MySQL. No client error.

**Why only /top:** It’s the hottest read and benefits most from cache. Submit and rank lookup are write or single-row read; caching them adds complexity and invalidation rules for limited gain.

---

## Concurrency Handling

- **Single write path:** Only submit modifies leaderboard; all changes happen inside one transaction.
- **Connection pool:** mysql2 pool (default 10 connections) so multiple requests can run without blocking each other.
- **InnoDB:** Row-level locking during updates; transaction isolation prevents dirty reads.
- **Atomic leaderboard update:** `INSERT ... ON DUPLICATE KEY UPDATE total_score = total_score + VALUES(total_score)` so concurrent submits for the same user don’t lose increments.
- **Rank recalc:** Done inside the same transaction after the increment, so rank is consistent with total_score for that request.

---

## Atomicity & Consistency Guarantees

- **Atomicity:** Each submit is one transaction. Either all of (user upsert, game_sessions insert, leaderboard update, rank recalc) commit, or none do. No partial state.
- **Consistency:** Ranks are recomputed in the same transaction as the score update. After commit, cache is invalidated, so the next /top reflects the new state.
- **No stale rank in response:** Submit returns the rank read from DB after commit. Top 10 is either from cache (at most 10s stale) or from DB after a cache miss/invalidation.

---

## New Relic Monitoring Usage

- **Enable:** Set `NEW_RELIC_LICENSE_KEY` (and optionally `NEW_RELIC_APP_NAME`, `NEW_RELIC_ENABLED=true`) in `.env`. Restart the server. Log should show “New Relic monitoring enabled.”
- **Disable:** Omit license key or set `NEW_RELIC_ENABLED=false`. App runs normally without sending data.
- **What is tracked:** Request latency and throughput, MySQL queries (and slow query detection), errors, transaction breakdowns. Express and mysql2 are auto-instrumented.
- **Config:** `newrelic.js` in backend root; e.g. slow query threshold, log level, SQL obfuscation.
- **Screenshots/report:** See repo root **PERFORMANCE_REPORT.md** for what to capture (APM overview, transaction breakdown, DB tab, alerts).

---

## What Was Skipped and Why

| Item | Reason |
|------|--------|
| **Auth / login** | Out of scope for assignment; APIs are open. Can add JWT or API keys later. |
| **Rate limiting** | Not required for assignment; can add middleware or gateway limits when needed. |
| **Caching /top by game_mode** | Assignment APIs use a single global top 10; game_mode exists in DB for future use only. |
| **Caching rank lookup** | Single-row read with index is fast; cache would need per-user keys and invalidation on any score change. |
| **PostgreSQL** | Assignment gave PostgreSQL DDL; implementation uses MySQL for consistency with existing stack. Logic (indexes, transactions) is equivalent. |
| **Full DB population (1M users, 5M sessions)** | Scripts provided (e.g. `scripts/populate_database.sql`) but large runs are slow; reduced sizes recommended for local testing. |
| **Integration/e2e tests** | Unit tests cover controller validation and service wiring with mocks; full e2e not in scope. |

---

## How to Scale Further

- **Horizontal scaling:** Backend is stateless. Run multiple Node processes behind a load balancer; share MySQL and Redis.
- **Database:** Add read replicas; direct read-only queries (e.g. /top, /rank) to replicas; keep writes (submit) on primary. Connection pool can be configured per role.
- **Cache:** Increase TTL for /top if slightly more staleness is acceptable; or cache per game_mode if APIs are extended. Consider Redis Cluster for very high throughput.
- **Queue for submit:** For very high write volume, accept submit, enqueue job, respond “accepted”; worker applies DB transaction and cache invalidation asynchronously. Adds eventual consistency; document in API contract.
- **DB sharding:** If leaderboard table grows extremely large, shard by user_id or rank range; top 10 becomes a merge of shard tops or a dedicated “top 10” store updated by workers.
- **New Relic:** Use alerts on latency and errors; use transaction traces and DB tab to find slow queries and add indexes or optimize queries.

---

## Environment Variables

See `.env.example`. Main ones:

- **PORT** – Server port (default 3000).
- **DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME** – MySQL.
- **REDIS_URL** – Redis connection URL.
- **NEW_RELIC_LICENSE_KEY, NEW_RELIC_APP_NAME, NEW_RELIC_ENABLED** – Optional APM.

---

## Tests

```bash
npm test
```

Runs Jest tests in `__tests__/` (e.g. leaderboard controller validation and response shape).

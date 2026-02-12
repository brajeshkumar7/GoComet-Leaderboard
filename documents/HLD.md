# High-Level Design (HLD) – Gaming Leaderboard System

## 1. Overview

The Gaming Leaderboard System is a full-stack application that lets players submit scores, view the top 10 leaderboard, and check their rank. It is built for high read traffic and consistent rankings under concurrent writes.

## 2. System Context

```
                    +------------------+
                    |   Web Browser    |
                    |  (React + Vite) |
                    +--------+--------+
                             | HTTP (REST)
                             v
                    +------------------+
                    |  Express Backend |
                    |  (Node.js 18+)   |
                    +--------+--------+
                             |
         +-------------------+-------------------+
         |                   |                   |
         v                   v                   v
  +-------------+    +-------------+    +-------------+
  |   MySQL 8   |    |    Redis    |    |  New Relic  |
  |  (InnoDB)   |    |   (Cache)   |    |   (APM)     |
  +-------------+    +-------------+    +-------------+
```

- **Client:** React SPA; polls top 10 every 5s; submit score and rank lookup on demand.
- **Backend:** Single Node.js process (Express); stateless; can be scaled horizontally behind a load balancer.
- **MySQL:** Source of truth for users, game_sessions, and leaderboard; transactions for writes.
- **Redis:** Cache for GET /api/leaderboard/top (key `leaderboard:top10`, TTL 10s); invalidated on submit.
- **New Relic:** Optional APM for latency, errors, and DB query analysis.

## 3. Core APIs (Assignment Contract)

| Method | Path | Purpose |
|--------|------|---------|
| POST | /api/leaderboard/submit | Submit score (body: `user_id`, `score`); updates game_sessions and leaderboard. |
| GET | /api/leaderboard/top | Top 10 players by total_score. |
| GET | /api/leaderboard/rank/:user_id | Current rank for a user. |

All return JSON with `success` and `data` or `error`.

## 4. Data Flow

### Submit Score
1. Client sends `POST /api/leaderboard/submit` with `{ user_id, score }`.
2. Backend validates input; starts DB transaction.
3. Upsert user; insert row into game_sessions; update leaderboard (total_score increment, rank recalc in same transaction).
4. Invalidate Redis key `leaderboard:top10`.
5. Commit; return new rank and total_score.

### Get Top 10
1. Client or load script calls `GET /api/leaderboard/top`.
2. Backend checks Redis for `leaderboard:top10`; on hit return cached list.
3. On miss: query MySQL (indexed by total_score DESC), limit 10; store in Redis with TTL 10s; return.

### Get Player Rank
1. Client sends `GET /api/leaderboard/rank/:user_id`.
2. Backend fetches user row from leaderboard (by user_id); if missing return 404.
3. Rank is either read from stored `rank` or computed via COUNT using total_score index; return.

## 5. Key Design Decisions

- **MySQL (not PostgreSQL):** Same concepts (indexes, transactions, FKs); assignment schema adapted (AUTO_INCREMENT, backtick `rank`).
- **Redis for /top only:** Top 10 is hot; rank lookup and submit are not cached to keep semantics simple and consistent.
- **Transactions on submit:** Ensures game_sessions insert, leaderboard update, and rank recalc are atomic and avoid race conditions.
- **Cache invalidation on write:** Any submit clears `leaderboard:top10` so next /top is fresh.
- **New Relic optional:** App runs without it; enabled via env for production monitoring.

## 6. Deployment View

- **Backend:** Node process; reads PORT, DB_*, REDIS_URL, NEW_RELIC_* from environment.
- **Frontend:** Static build (e.g. `npm run build`); served by any static host or same server; configurable API base URL (e.g. VITE_API_BASE_URL).
- **Database:** MySQL 8+; create DB and run app once to apply schema (or run schema script).
- **Redis:** Required for caching; optional for correctness (graceful fallback if down).

## 7. What Was Skipped and Why

| Item | Reason |
|------|--------|
| Auth / login | Out of scope; APIs are open. Add JWT or API keys if required. |
| Rate limiting | Not in assignment scope; add at gateway or middleware when needed. |
| Caching by game_mode | Assignment uses single global top 10; game_mode in DB for future use. |
| Caching rank lookup | Indexed single-row read is fast; cache adds per-user keys and invalidation complexity. |
| PostgreSQL | Assignment DDL was PostgreSQL; MySQL used for existing stack; semantics match. |
| Full 1M/5M dataset run | Population scripts provided; large runs slow; use smaller sets for local testing. |
| E2E tests | Unit tests cover controllers; full e2e not in scope. |

## 8. How to Scale Further

- **Horizontal scaling:** Run multiple Node instances behind a load balancer; shared MySQL and Redis; no session state.
- **Database:** Add read replicas; route GET /top and GET /rank to replicas; keep POST /submit on primary.
- **Cache:** Increase TTL for /top or cache per game_mode if APIs are extended; Redis Cluster for very high throughput.
- **Write queue:** For very high submit volume, accept request, enqueue job, return “accepted”; worker does transaction and cache invalidation (eventual consistency).
- **Sharding:** If leaderboard table grows very large, shard by user_id or rank band; top 10 can be a small materialized store or merge of shard tops.
- **Monitoring:** Use New Relic alerts and transaction traces to find bottlenecks and add indexes or optimize queries.

## 9. Out of Scope (Current Version)

- Auth/login.
- Multiple game modes in API contract (DB has game_mode; core APIs use single global leaderboard).
- Rate limiting (can be added at gateway or Express middleware).

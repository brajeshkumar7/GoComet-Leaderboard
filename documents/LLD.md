# Low-Level Design (LLD) – Gaming Leaderboard System

## 1. Backend Structure

```
backend/
├── src/
│   ├── app.js              # Express app, middleware, route mounting
│   ├── server.js            # Bootstrap: dotenv, New Relic, DB, Redis, listen
│   ├── routes/
│   │   ├── leaderboard.routes.js   # POST /submit, GET /top, GET /rank/:user_id
│   │   └── score.routes.js        # Legacy /api/scores (optional)
│   ├── controllers/
│   │   ├── leaderboard.controller.js  # Validation, call service, set status/json
│   │   └── score.controller.js
│   ├── services/
│   │   ├── leaderboard.service.js  # submitScore, getTopUsers, getUserRank + cache
│   │   └── score.service.js
│   ├── db/
│   │   ├── mysql.js         # Pool, initDatabase, createSchema, transaction, getPool
│   │   └── schema.sql       # Reference DDL
│   └── cache/
│       └── redis.js         # initCache, getCache, setCache, deleteCache, isAvailable
├── newrelic.js              # New Relic config (env-driven)
├── package.json
└── .env.example
```

## 2. Database Schema (MySQL)

- **users:** `id` (PK, AUTO_INCREMENT), `username` (UNIQUE), `join_date`. Index on `username`.
- **game_sessions:** `id` (PK), `user_id` (FK → users), `score`, `game_mode`, `timestamp`. Indexes: `user_id`, `game_mode`, `timestamp DESC`.
- **leaderboard:** `user_id` (PK, FK → users), `total_score` (BIGINT), `rank` (INT, reserved word → `\`rank\``). Indexes: `total_score DESC`, `user_id`, `rank`.

All FKs: ON DELETE CASCADE. InnoDB, utf8mb4.

## 3. API Request/Response Shapes

### POST /api/leaderboard/submit
- Request: `{ "user_id": number, "score": number }`
- Success (201): `{ "success": true, "data": { "user_id", "score", "total_score", "rank" } }`
- Error (400/500): `{ "success": false, "error": "message" }`

### GET /api/leaderboard/top
- Success (200): `{ "success": true, "data": [ { "user_id", "username", "total_score", "rank" }, ... ] }`

### GET /api/leaderboard/rank/:user_id
- Success (200): `{ "success": true, "data": { "user_id", "username", "total_score", "rank" } }`
- Not found (404): `{ "success": false, "error": "User not found in leaderboard" }`

## 4. Service Layer Logic

### submitScore(userId, score)
1. `transaction(async connection => { ... })`
2. Insert/ignore user: `INSERT INTO users (id, username) VALUES (?, ?) ON DUPLICATE KEY UPDATE id = id`
3. Insert game_sessions row: `INSERT INTO game_sessions (user_id, score, game_mode) VALUES (?, ?, 'default')`
4. Upsert leaderboard: `INSERT INTO leaderboard (user_id, total_score, \`rank\`) VALUES (?, ?, 0) ON DUPLICATE KEY UPDATE total_score = total_score + VALUES(total_score)`
5. Recompute all ranks: `UPDATE leaderboard l JOIN (SELECT user_id, ROW_NUMBER() OVER (ORDER BY total_score DESC, user_id ASC) AS new_rank FROM leaderboard) ranked ON l.user_id = ranked.user_id SET l.\`rank\` = ranked.new_rank`
6. Select current user row from leaderboard; then `deleteCache('leaderboard:top10')`; return payload.

### getTopUsers()
1. `cached = getCache('leaderboard:top10')`; if cached return it.
2. Query: `SELECT l.user_id, u.username, l.total_score, l.\`rank\` FROM leaderboard l INNER JOIN users u ON l.user_id = u.id ORDER BY l.total_score DESC, l.user_id ASC LIMIT 10`
3. `setCache('leaderboard:top10', result, 10)`; return result.

### getUserRank(userId)
1. Select user from leaderboard join users; if no row return null.
2. Rank: `SELECT COUNT(*) + 1 AS calculated_rank FROM leaderboard WHERE total_score > ? OR (total_score = ? AND user_id < ?)` (uses index).
3. Return { user_id, username, total_score, rank: calculated_rank }.

## 5. Concurrency and Atomicity

- **Single write path:** Only submit modifies leaderboard; all changes run in one MySQL transaction.
- **Connection pool:** mysql2 pool (e.g. 10 connections) for concurrent requests.
- **InnoDB:** Row-level locking; transaction isolation avoids dirty reads.
- **Atomic increment:** `ON DUPLICATE KEY UPDATE total_score = total_score + VALUES(total_score)` so concurrent submits for the same user do not lose updates.
- **Rank recalc:** Done in the same transaction after the increment; response returns consistent rank. Cache for /top is invalidated after commit.

## 6. Caching (Redis)

- Key: `leaderboard:top10`
- TTL: 10 seconds
- Write: After successful submit, `deleteCache('leaderboard:top10')`
- Read: getTopUsers() checks cache first; on miss queries MySQL and setCache.
- If Redis is down: isAvailable() is false; getCache returns null, setCache/deleteCache no-op; all reads hit DB.

## 7. Error Handling

- Controllers: validate input; on failure respond 400 with message; on service throw call next(err).
- Global handler: if error.message includes "Database not initialized" → 503; else status from err or 500; body `{ error: message }`; in development optionally include stack.

## 8. Frontend (React + Vite)

- **Submit Score:** Form with user_id and score; POST /api/leaderboard/submit; on success show message and refresh top 10.
- **Top 10:** Table; fetch GET /api/leaderboard/top on mount and every 5s (setInterval).
- **Rank Lookup:** Input user_id; GET /api/leaderboard/rank/:user_id; display result or error.
- API base URL: `import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'`.

## 9. Configuration (Env)

- Backend: PORT, NODE_ENV, DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME, REDIS_URL, NEW_RELIC_LICENSE_KEY, NEW_RELIC_APP_NAME, NEW_RELIC_ENABLED.
- Frontend: VITE_API_BASE_URL.

# Backend API - Gaming Leaderboard System

Express.js backend API for the Gaming Leaderboard System.

## Features

- RESTful API endpoints for leaderboard and score management
- MySQL database with InnoDB engine
- Redis caching for improved performance
- Health check endpoint
- Error handling and validation
- Transaction support for data consistency

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure environment variables:
   ```bash
   cp .env.example .env
   ```

3. Update `.env` with your configuration:
   - MySQL database credentials
   - Redis URL (Upstash format: `redis://default:password@host:port`)

4. Ensure MySQL is running and create the database:
   ```sql
   CREATE DATABASE leaderboard_db;
   ```

5. Start the server:
   ```bash
   npm start
   ```

   For development with auto-reload:
   ```bash
   npm run dev
   ```

## API Endpoints

### Health Check
- `GET /health` - Server health status

### Leaderboard
- `GET /api/leaderboard` - Get leaderboard
  - Query params: `limit` (default: 100), `offset` (default: 0), `gameMode` (optional)
- `GET /api/leaderboard/:gameMode` - Get leaderboard by game mode
  - Query params: `limit` (default: 100), `offset` (default: 0)

### Scores
- `POST /api/scores` - Submit a new score
  - Body: `{ userId, username, score, gameMode?, metadata? }`
- `GET /api/scores/:userId` - Get user's score
  - Query params: `gameMode` (optional)

## Database Schema

The application automatically creates the following tables:

- **users**: User account information
  - `id` (INT, PK, AUTO_INCREMENT)
  - `username` (VARCHAR(100), UNIQUE)
  - `join_date` (TIMESTAMP)

- **game_sessions**: Individual game session scores
  - `id` (INT, PK, AUTO_INCREMENT)
  - `user_id` (INT, FK -> users.id, CASCADE DELETE)
  - `score` (INT)
  - `game_mode` (VARCHAR(50))
  - `timestamp` (TIMESTAMP)

- **leaderboard**: Aggregated leaderboard data with rankings
  - `user_id` (INT, PK, FK -> users.id, CASCADE DELETE)
  - `total_score` (BIGINT)
  - `rank` (INT)

### Indexing Strategy

The database schema is optimized for high-scale leaderboard operations with strategic indexing:

#### Users Table
- **idx_username**: Enables fast username lookups and uniqueness checks
- **Primary key (id)**: Automatic index for foreign key relationships

#### Game Sessions Table
- **idx_user_id**: Critical for JOIN operations and retrieving all scores for a user
  - Used when aggregating user scores for leaderboard updates
  - Enables efficient filtering by user_id
- **idx_game_mode**: Supports filtering game sessions by game mode
- **idx_timestamp DESC**: Optimizes chronological queries (recent games first)
  - DESC order matches common query patterns for "latest games"

#### Leaderboard Table
- **idx_total_score DESC**: **Most critical index** for leaderboard queries
  - DESC order optimizes `ORDER BY total_score DESC` queries
  - Enables efficient top-N leaderboard retrieval without full table scans
  - Essential for pagination with LIMIT/OFFSET
- **idx_user_id**: Supports fast lookups of individual user rankings
  - Used when checking a specific user's position
- **idx_rank**: Enables rank-based queries and efficient rank updates
  - Useful for "users ranked between X and Y" queries

#### Foreign Key Constraints
- All foreign keys use `ON DELETE CASCADE` to maintain referential integrity
- When a user is deleted, all related game_sessions and leaderboard entries are automatically removed

#### Performance Considerations
- **BIGINT for total_score**: Supports very large aggregated scores (up to 9,223,372,036,854,775,807)
- **Connection pooling**: Uses mysql2 connection pool (10 connections) for concurrent request handling
- **InnoDB engine**: Provides ACID compliance and row-level locking for concurrent updates

See `src/db/schema.sql` for the complete SQL schema with detailed comments.

## Caching Strategy

The backend uses Redis for caching leaderboard data to improve performance and reduce database load.

### Cache Implementation

- **Cache Key**: `leaderboard:top10`
- **TTL**: 10 seconds
- **Cached Endpoint**: `GET /api/leaderboard/top`
- **Cache Invalidation**: Automatically invalidated on `POST /api/leaderboard/submit`

### Graceful Fallback

The caching layer is designed with **graceful degradation**:

- If Redis is unavailable, the application continues to function normally
- Cache operations (get/set/delete) fail silently and log warnings
- All endpoints fall back to direct database queries when cache is unavailable
- No errors are thrown to the client if Redis is down

### Caching Trade-offs

#### Benefits
- **Reduced Database Load**: Top 10 leaderboard queries are served from cache
- **Improved Response Times**: Cache responses are typically < 1ms vs 10-50ms for database queries
- **Better Scalability**: Can handle more concurrent requests with cached data
- **Cost Efficiency**: Reduces database query costs at scale

#### Trade-offs
- **Staleness**: Top 10 leaderboard may be up to 10 seconds stale
- **Memory Usage**: Redis requires additional infrastructure
- **Complexity**: Additional system component to monitor and maintain
- **Cache Invalidation**: Must ensure cache is invalidated on score submissions

#### Design Decisions

1. **10-second TTL**: Balances freshness with cache hit rate
   - Leaderboard updates are frequent but not instant
   - 10 seconds provides good cache hit rates while maintaining reasonable freshness
   - Can be adjusted based on application requirements

2. **Cache Invalidation on Submit**: Ensures consistency
   - When a score is submitted, the top 10 cache is immediately invalidated
   - Next request will fetch fresh data from database
   - Prevents serving stale leaderboard data after score submissions

3. **Graceful Fallback**: Ensures reliability
   - Application remains functional if Redis fails
   - No single point of failure
   - Allows for Redis maintenance without downtime

4. **Single Cache Key**: Simple and effective
   - Only caching the most frequently accessed endpoint (top 10)
   - Other endpoints (rank lookup) are fast enough without caching
   - Keeps cache strategy simple and maintainable

### Monitoring Recommendations

- Monitor Redis connection status and availability
- Track cache hit/miss rates
- Monitor cache memory usage
- Alert on Redis connection failures (though application continues to work)

## Environment Variables

See `.env.example` for all available configuration options.

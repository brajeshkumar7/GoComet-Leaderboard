# Backend API - Gaming Leaderboard System

Express.js backend API for the Gaming Leaderboard System.

## Features

- RESTful API endpoints for leaderboard and score management
- MySQL database with InnoDB engine
- Redis caching for improved performance
- New Relic APM monitoring (optional)
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
   - New Relic license key (optional, for monitoring)

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

## New Relic Monitoring

The backend includes optional New Relic APM (Application Performance Monitoring) integration for production monitoring and observability.

### Setup

1. **Get a New Relic License Key**:
   - Sign up for a New Relic account at https://newrelic.com
   - Navigate to Account Settings → API Keys
   - Copy your license key

2. **Enable Monitoring**:
   Add the following to your `.env` file:
   ```bash
   NEW_RELIC_ENABLED=true
   NEW_RELIC_LICENSE_KEY=your_license_key_here
   NEW_RELIC_APP_NAME=gocomet-leaderboard-backend
   ```

3. **Install Dependencies**:
   ```bash
   npm install
   ```
   The `newrelic` package is already included in `package.json`.

4. **Restart the Server**:
   ```bash
   npm start
   ```
   You should see: `✓ New Relic monitoring enabled`

### Disabling Monitoring

The application works perfectly fine without New Relic. To disable monitoring:

**Option 1**: Don't set `NEW_RELIC_LICENSE_KEY` (recommended for local development)
```bash
# Simply omit NEW_RELIC_LICENSE_KEY from .env
```

**Option 2**: Explicitly disable it
```bash
NEW_RELIC_ENABLED=false
```

When disabled, you'll see: `ℹ New Relic monitoring disabled`

### What Gets Tracked

New Relic automatically instruments Express.js and tracks the following metrics:

#### 1. **Request Metrics**
- **Response Time**: Latency for each API endpoint
- **Throughput**: Requests per minute/second
- **Error Rate**: Percentage of failed requests
- **Apdex Score**: User satisfaction score based on response times

#### 2. **Database Performance**
- **Query Time**: Execution time for each MySQL query
- **Slow Queries**: Queries exceeding 500ms threshold (configurable)
- **Query Count**: Number of database queries per transaction
- **Query Details**: SQL statements (obfuscated by default for security)

#### 3. **Transaction Tracing**
- **Transaction Breakdown**: Time spent in each part of request handling
  - Middleware execution time
  - Route handler time
  - Database query time
  - External service calls
- **Transaction Traces**: Detailed traces for slow transactions (> 500ms)

#### 4. **Error Tracking**
- **Error Collection**: Automatic capture of exceptions and errors
- **Error Details**: Stack traces, request context, and error frequency
- **Error Trends**: Error rate over time

#### 5. **Application Metrics**
- **CPU Usage**: Server CPU utilization
- **Memory Usage**: Heap and non-heap memory consumption
- **Garbage Collection**: GC frequency and duration

#### 6. **Custom Attributes**
- Request metadata (method, path, status code)
- Environment information (NODE_ENV, app version)
- Custom business metrics (can be added via New Relic API)

### Automatic Instrumentation

The New Relic agent automatically instruments:

- ✅ **Express.js**: All routes, middleware, and request/response cycles
- ✅ **MySQL (mysql2)**: All database queries and transactions
- ✅ **Redis**: Cache operations (if using New Relic Redis instrumentation)
- ✅ **HTTP Clients**: Outbound HTTP requests
- ✅ **Error Handling**: Uncaught exceptions and promise rejections

### Configuration

The New Relic configuration is in `newrelic.js` at the project root. Key settings:

- **App Name**: `NEW_RELIC_APP_NAME` (defaults to package name)
- **Log Level**: `NEW_RELIC_LOG_LEVEL` (default: 'info')
- **SQL Recording**: Set to 'obfuscated' for security (hides sensitive data)
- **Slow Query Threshold**: 500ms (queries slower than this are explained)
- **Error Collection**: Enabled by default

### Viewing Metrics

Once enabled, metrics appear in your New Relic dashboard:

1. **APM Dashboard**: Overview of application performance
2. **Transaction Traces**: Detailed breakdown of slow requests
3. **Database**: MySQL query performance and slow queries
4. **Errors**: Error tracking and analysis
5. **Alerts**: Set up alerts for performance degradation

### Local Development

For local development, monitoring is **disabled by default**:

- If `NEW_RELIC_LICENSE_KEY` is not set, monitoring is automatically disabled
- Application runs normally without any New Relic overhead
- No errors or warnings if New Relic is unavailable
- Perfect for development without affecting production monitoring

### Production Best Practices

1. **Always Enable in Production**: Set `NEW_RELIC_ENABLED=true` and provide license key
2. **Use Obfuscated SQL**: Prevents sensitive data from appearing in traces
3. **Set Appropriate App Names**: Use `NEW_RELIC_APP_NAME` to distinguish environments
4. **Monitor Key Metrics**: Set up alerts for:
   - High error rates (> 1%)
   - Slow response times (> 1 second)
   - High database query times
   - Memory leaks or high CPU usage

### Troubleshooting

**Issue**: New Relic not appearing in dashboard
- Verify `NEW_RELIC_LICENSE_KEY` is correct
- Check `NEW_RELIC_ENABLED` is not set to `false`
- Ensure `newrelic` package is installed: `npm install`
- Check server logs for New Relic initialization messages

**Issue**: Application won't start
- New Relic initialization failures are caught and logged
- Application continues to run even if New Relic fails
- Check `newrelic.js` configuration syntax

**Issue**: Too much data/noise
- Adjust `NEW_RELIC_LOG_LEVEL` to 'warn' or 'error'
- Increase slow query threshold in `newrelic.js`
- Use transaction sampling for high-traffic applications

## Environment Variables

See `.env.example` for all available configuration options.

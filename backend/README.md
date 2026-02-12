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

## Environment Variables

See `.env.example` for all available configuration options.

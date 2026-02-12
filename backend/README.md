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

- **users**: User information
- **scores**: Individual score entries
- **leaderboard**: Aggregated leaderboard data with ranks

## Environment Variables

See `.env.example` for all available configuration options.

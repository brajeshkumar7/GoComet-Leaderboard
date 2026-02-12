-- Gaming Leaderboard System Database Schema
-- MySQL 8+ with InnoDB engine
-- Designed for high-scale leaderboard operations

-- ============================================
-- USERS TABLE
-- ============================================
-- Stores user account information
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(100) NOT NULL UNIQUE,
  join_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- GAME_SESSIONS TABLE
-- ============================================
-- Stores individual game session scores
-- Foreign key cascades delete when user is removed
CREATE TABLE IF NOT EXISTS game_sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  score INT NOT NULL,
  game_mode VARCHAR(50) NOT NULL,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_game_mode (game_mode),
  INDEX idx_timestamp (timestamp DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- LEADERBOARD TABLE
-- ============================================
-- Aggregated leaderboard data with rankings
-- Uses BIGINT for total_score to support very large scores
-- Foreign key cascades delete when user is removed
-- Note: 'rank' is a reserved keyword in MySQL, so it must be escaped with backticks
CREATE TABLE IF NOT EXISTS leaderboard (
  user_id INT PRIMARY KEY,
  total_score BIGINT NOT NULL DEFAULT 0,
  `rank` INT NOT NULL DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_total_score (total_score DESC),
  INDEX idx_user_id (user_id),
  INDEX idx_rank (`rank`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- INDEXING STRATEGY EXPLANATION
-- ============================================
-- 
-- users.id: Primary key (automatic index)
-- users.username: UNIQUE constraint (automatic index) + explicit index for lookups
--
-- game_sessions.id: Primary key (automatic index)
-- game_sessions.user_id: Foreign key index for JOIN operations and user score queries
-- game_sessions.game_mode: Index for filtering by game mode
-- game_sessions.timestamp: DESC index for chronological queries
--
-- leaderboard.user_id: Primary key (automatic index) + explicit index for lookups
-- leaderboard.total_score DESC: Critical index for leaderboard ranking queries
--   - DESC order optimizes ORDER BY total_score DESC queries
--   - Enables efficient top-N leaderboard retrieval
-- leaderboard.rank: Index for rank-based queries and updates
--
-- All foreign keys have CASCADE DELETE to maintain referential integrity
-- when users are removed from the system.

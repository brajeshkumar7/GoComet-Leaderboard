-- Create database for Gaming Leaderboard System
-- Run this script in MySQL to create the database

-- Create the database with UTF8MB4 encoding (supports emojis and all Unicode characters)
CREATE DATABASE IF NOT EXISTS leaderboard_db 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

-- Verify the database was created
SHOW DATABASES LIKE 'leaderboard_db';

-- Use the database (optional - application will connect to it automatically)
USE leaderboard_db;

-- MySQL Database Population Script
-- Converts PostgreSQL syntax from assignment to MySQL syntax
-- WARNING: These queries will insert millions of records and may take a long time
-- Reduce the numbers if needed for testing (e.g., 1000 users instead of 1000000)

-- ============================================
-- Populate Users Table with 1 Million Records
-- ============================================
-- Note: MySQL doesn't have generate_series, so we use a stored procedure or loop
-- For faster execution, consider reducing to 10000 or 100000 users

-- Option 1: Using a stored procedure (recommended for large datasets)
DELIMITER $$

CREATE PROCEDURE IF NOT EXISTS populate_users(IN num_users INT)
BEGIN
    DECLARE i INT DEFAULT 1;
    WHILE i <= num_users DO
        INSERT INTO users (username) VALUES (CONCAT('user_', i));
        SET i = i + 1;
    END WHILE;
END$$

DELIMITER ;

-- Call with reduced number for testing (e.g., 10000 instead of 1000000)
-- CALL populate_users(10000);

-- Option 2: Simple INSERT for small datasets (use for testing)
-- INSERT INTO users (username) VALUES ('user_1'), ('user_2'), ('user_3');
-- ... (repeat as needed)

-- ============================================
-- Populate Game Sessions with Random Scores
-- ============================================
-- Note: MySQL doesn't have generate_series, so we use a loop
-- For 5 million records, this will take significant time

DELIMITER $$

CREATE PROCEDURE IF NOT EXISTS populate_game_sessions(IN num_sessions INT)
BEGIN
    DECLARE i INT DEFAULT 1;
    DECLARE random_user_id INT;
    DECLARE random_score INT;
    DECLARE random_game_mode VARCHAR(50);
    
    WHILE i <= num_sessions DO
        SET random_user_id = FLOOR(1 + RAND() * 1000000);
        SET random_score = FLOOR(1 + RAND() * 10000);
        SET random_game_mode = IF(RAND() > 0.5, 'solo', 'team');
        
        INSERT INTO game_sessions (user_id, score, game_mode, timestamp)
        VALUES (
            random_user_id,
            random_score,
            random_game_mode,
            DATE_SUB(NOW(), INTERVAL FLOOR(RAND() * 365) DAY)
        );
        
        SET i = i + 1;
        
        -- Commit every 1000 records for better performance
        IF i % 1000 = 0 THEN
            COMMIT;
        END IF;
    END WHILE;
END$$

DELIMITER ;

-- Call with reduced number for testing (e.g., 50000 instead of 5000000)
-- CALL populate_game_sessions(50000);

-- ============================================
-- Populate Leaderboard by Aggregating Scores
-- ============================================
-- This calculates total_score and rank for each user

INSERT INTO leaderboard (user_id, total_score, `rank`)
SELECT 
    user_id,
    SUM(score) as total_score,
    ROW_NUMBER() OVER (ORDER BY SUM(score) DESC) as `rank`
FROM game_sessions
GROUP BY user_id
ON DUPLICATE KEY UPDATE
    total_score = VALUES(total_score),
    `rank` = VALUES(`rank`);

-- ============================================
-- Cleanup Procedures (optional)
-- ============================================
-- DROP PROCEDURE IF EXISTS populate_users;
-- DROP PROCEDURE IF EXISTS populate_game_sessions;

-- ============================================
-- Quick Test Data (for development)
-- ============================================
-- Use this for quick testing instead of millions of records:

-- INSERT INTO users (username) VALUES
--     ('user_1'), ('user_2'), ('user_3'), ('user_4'), ('user_5');

-- INSERT INTO game_sessions (user_id, score, game_mode) VALUES
--     (1, 1000, 'solo'),
--     (1, 2000, 'solo'),
--     (2, 1500, 'team'),
--     (2, 2500, 'team'),
--     (3, 3000, 'solo'),
--     (4, 500, 'team'),
--     (5, 4000, 'solo');

-- INSERT INTO leaderboard (user_id, total_score, `rank`)
-- SELECT 
--     user_id,
--     SUM(score) as total_score,
--     ROW_NUMBER() OVER (ORDER BY SUM(score) DESC) as `rank`
-- FROM game_sessions
-- GROUP BY user_id;

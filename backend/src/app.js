const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const leaderboardRoutes = require('./routes/leaderboard.routes');
const scoreRoutes = require('./routes/score.routes');

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API Routes
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/scores', scoreRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  const isDbUnavailable = err.message && err.message.includes('Database not initialized');
  const status = isDbUnavailable ? 503 : (err.status || 500);
  const message = isDbUnavailable ? 'Database unavailable' : (err.message || 'Internal Server Error');
  res.status(status).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

module.exports = app;

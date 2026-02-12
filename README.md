# Gaming Leaderboard System

A production-ready monorepo for a Gaming Leaderboard System built with Node.js, Express, MySQL, Redis, and React.

## Project Structure

```
gocomet-leaderboard/
├── backend/          # Node.js + Express backend API
├── frontend/         # React + Vite frontend application
└── README.md         # This file
```

## Tech Stack

- **Backend**: Node.js 18+, Express.js
- **Database**: MySQL 8+ (InnoDB)
- **Cache**: Redis (Upstash Redis URL)
- **Frontend**: React + Vite
- **Package Manager**: npm

## Quick Start

### Prerequisites

- Node.js 18+ installed
- MySQL 8+ running
- Redis instance (Upstash or local)
- npm installed

### Backend Setup

1. Navigate to backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy `.env.example` to `.env` and configure:
   ```bash
   cp .env.example .env
   ```

4. Update `.env` with your database and Redis credentials

5. Start the backend server:
   ```bash
   npm start
   ```

The backend will run on `http://localhost:3000` (or PORT from .env)

### Frontend Setup

1. Navigate to frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

The frontend will run on `http://localhost:5173` (Vite default)

## API Endpoints

- `GET /health` - Health check endpoint
- `GET /api/leaderboard` - Get leaderboard
- `POST /api/scores` - Submit a new score
- `GET /api/scores/:userId` - Get user's score

## Development

Each directory contains its own `README.md` with specific setup instructions.

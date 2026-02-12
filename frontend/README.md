# Frontend - Gaming Leaderboard System

React + Vite frontend application for the Gaming Leaderboard System.

## Features

- Real-time leaderboard display
- Submit scores form
- Filter leaderboard by game mode
- Responsive design
- Modern UI with gradient styling

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure API URL (optional):
   Create a `.env` file in the frontend directory:
   ```
   VITE_API_BASE_URL=http://localhost:3000
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

The frontend will run on `http://localhost:5173` (Vite default port).

## Build for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

## Preview Production Build

```bash
npm run preview
```

## Environment Variables

- `VITE_API_BASE_URL` - Backend API base URL (default: `http://localhost:3000`)

## Features

- **Submit Scores**: Submit new scores with user ID, username, score, and game mode
- **View Leaderboard**: Display top scores with ranking
- **Filter by Game Mode**: Filter leaderboard entries by specific game modes
- **Real-time Updates**: Automatically refreshes after score submission

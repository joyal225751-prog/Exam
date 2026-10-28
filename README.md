# ReelList — Movie Watchlist Manager

A responsive MERN app for saving movies, tracking viewing progress, rating finished films, and choosing what to watch next. Movie data and yearly code sequences are stored in MongoDB Atlas.

## Requirements

- Node.js 18 or newer
- A MongoDB Atlas cluster and connection string

## Run locally

1. In `backend`, copy `.env.example` to `.env` and replace the `MONGODB_URI` placeholder with your Atlas connection string. Add your database name and URL encode special characters in credentials.
2. Install and start the API:

   ```sh
   cd backend
   npm install
   npm run dev
   ```

3. In a second terminal, start the frontend:

   ```sh
   cd frontend
   npm install
   npm run dev
   ```

4. Open the Vite URL (normally `http://localhost:5173`). The frontend proxies `/api` requests to port 5000.

The real Atlas credential file is intentionally not committed. Use the supplied `.env.example` to create `backend/.env`; never publish Atlas credentials in a public repository.

## API

All responses use `{ "success": boolean, "message": string, "data": any }`.

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/movies?page=1&status=To%20Watch&genre=Drama&search=matrix` | Filtered, title searched list (6 per page) |
| GET | `/api/movies/stats` | Status totals, watched hours, average rating, top watched genre |
| GET | `/api/movies/next` | Highest priority To Watch movie, then shortest runtime |
| POST | `/api/movies` | Add a movie; server assigns its code |
| PATCH | `/api/movies/:id` | Edit allowed fields, status, or Watched rating |
| DELETE | `/api/movies/:id` | Delete unless currently Watching |

Release year and runtime are validated on both client and server. Status transitions and rating rules are enforced by the API as well as the interface. MongoDB unique indexes protect movie code and case-insensitive title/year uniqueness. Stats refresh after every successful mutation.

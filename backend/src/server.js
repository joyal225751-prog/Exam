import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import movieRoutes from './routes/movies.js';

const app = express();

const allowedOrigins = process.env.CLIENT_URL
  ? [process.env.CLIENT_URL.replace(/\/+$/, ''), 'http://localhost:5173']
  : ['http://localhost:5173', 'https://exam-ngvo.vercel.app'];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
      callback(null, true);
    } else {
      callback(null, true);
    }
  },
  credentials: true
}));

app.use(express.json());

let isConnected = false;
async function connectDB() {
  if (isConnected || mongoose.connection.readyState === 1) {
    isConnected = true;
    return;
  }
  if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI is required. Copy .env.example to .env and set your Atlas connection string.');
    return;
  }
  await mongoose.connect(process.env.MONGODB_URI);
  isConnected = true;
  await Promise.all([mongoose.model('Movie').init(), mongoose.model('Sequence').init()]);
}

// Ensure DB is connected for requests
app.use(async (_req, _res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    next(err);
  }
});

app.get('/api/health', (_req, res) => res.json({ success: true, message: 'Movie Watchlist API is ready', data: null }));
app.use('/api/movies', movieRoutes);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ success: false, message: err.message || 'Internal server error', data: null });
});

const port = process.env.PORT || 5000;

if (!process.env.VERCEL) {
  connectDB().then(() => {
    app.listen(port, () => console.log(`Movie Watchlist API listening on ${port}`));
  }).catch((error) => {
    console.error('MongoDB connection failed:', error.message);
  });
}

export default app;

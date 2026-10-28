import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import movieRoutes from './routes/movies.js';
const app = express();
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }));
app.use(express.json());
app.get('/api/health', (_req, res) => res.json({ success: true, message: 'Movie Watchlist API is ready', data: null }));
app.use('/api/movies', movieRoutes);
app.use((err, _req, res, _next) => { console.error(err); res.status(err.status || 500).json({ success: false, message: err.message || 'Internal server error', data: null }); });
const port = process.env.PORT || 5000;
if (!process.env.MONGODB_URI) console.error('MONGODB_URI is required. Copy .env.example to .env and set your Atlas connection string.');
else mongoose.connect(process.env.MONGODB_URI).then(async () => {
  await Promise.all([mongoose.model('Movie').init(), mongoose.model('Sequence').init()]);
  app.listen(port, () => console.log(`Movie Watchlist API listening on ${port}`));
}).catch((error) => { console.error('MongoDB connection failed:', error.message); process.exit(1); });

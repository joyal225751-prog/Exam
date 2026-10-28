import { Router } from 'express';
import mongoose from 'mongoose';
import Movie, { GENRES, PLATFORMS, STATUSES } from '../models/Movie.js';
import Sequence from '../models/Sequence.js';
const router = Router(); const currentYear = new Date().getFullYear();
const fail = (status, message) => Object.assign(new Error(message), { status });
const send = (res, status, message, data) => res.status(status).json({ success: status < 400, message, data });
function validate(body) {
  if (typeof body.title !== 'string' || !body.title.trim() || body.title.trim().length > 160) throw fail(400, 'Title is required (maximum 160 characters).');
  if (!GENRES.includes(body.genre)) throw fail(400, 'Choose a valid genre.');
  if (!Number.isInteger(Number(body.releaseYear)) || Number(body.releaseYear) < 1950 || Number(body.releaseYear) > currentYear) throw fail(400, `Release year must be between 1950 and ${currentYear}.`);
  if (!Number.isInteger(Number(body.runtime)) || Number(body.runtime) < 30 || Number(body.runtime) > 300) throw fail(400, 'Runtime must be between 30 and 300 minutes.');
  if (!PLATFORMS.includes(body.platform)) throw fail(400, 'Choose a valid platform.');
  if (!Number.isInteger(Number(body.priority)) || Number(body.priority) < 1 || Number(body.priority) > 5) throw fail(400, 'Priority must be between 1 and 5.');
}
router.get('/', async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1), limit = 6, filter = {};
    if (req.query.status) { if (!STATUSES.includes(req.query.status)) throw fail(400, 'Invalid status filter.'); filter.status = req.query.status; }
    if (req.query.genre) { if (!GENRES.includes(req.query.genre)) throw fail(400, 'Invalid genre filter.'); filter.genre = req.query.genre; }
    if (req.query.search) filter.title = { $regex: String(req.query.search).slice(0, 100).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
    const total = await Movie.countDocuments(filter);
    const movies = await Movie.find(filter).sort({ status: 1, priority: -1, runtime: 1, createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean();
    send(res, 200, 'Movies loaded.', { movies, page, limit, total, totalPages: Math.ceil(total / limit) });
  } catch (error) { next(error); }
});
router.get('/stats', async (_req, res, next) => {
  try {
    const [byStatus, watched, genres] = await Promise.all([
      Movie.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Movie.aggregate([{ $match: { status: 'Watched' } }, { $group: { _id: null, minutes: { $sum: '$runtime' }, averageRating: { $avg: '$rating' } } }]),
      Movie.aggregate([{ $match: { status: 'Watched' } }, { $group: { _id: '$genre', count: { $sum: 1 } } }, { $sort: { count: -1, _id: 1 } }, { $limit: 1 }])
    ]);
    const counts = Object.fromEntries(STATUSES.map((status) => [status, 0])); byStatus.forEach(({ _id, count }) => { counts[_id] = count; });
    send(res, 200, 'Statistics loaded.', { counts, totalHours: Math.round(((watched[0]?.minutes || 0) / 60) * 10) / 10, averageRating: Math.round((watched[0]?.averageRating || 0) * 10) / 10, topGenre: genres[0]?._id || null });
  } catch (error) { next(error); }
});
router.get('/next', async (_req, res, next) => { try { const movie = await Movie.findOne({ status: 'To Watch' }).sort({ priority: -1, runtime: 1, createdAt: 1 }); if (!movie) throw fail(404, 'No movies are waiting in your To Watch list.'); send(res, 200, 'Your next movie is ready.', movie); } catch (error) { next(error); } });
router.post('/', async (req, res, next) => {
  try {
    validate(req.body); const title = req.body.title.trim(), releaseYear = Number(req.body.releaseYear), titleKey = title.toLocaleLowerCase();
    if (await Movie.exists({ titleKey, releaseYear })) throw fail(409, 'A movie with this title and release year already exists.');
    const sequence = await Sequence.findOneAndUpdate({ _id: releaseYear }, { $inc: { value: 1 } }, { new: true, upsert: true, setDefaultsOnInsert: true });
    const movie = await Movie.create({ title, titleKey, genre: req.body.genre, releaseYear, runtime: Number(req.body.runtime), platform: req.body.platform, priority: Number(req.body.priority), code: `MV-${releaseYear}-${String(sequence.value).padStart(3, '0')}` });
    send(res, 201, 'Movie added to your watchlist.', movie);
  } catch (error) { if (error.code === 11000) return next(fail(409, 'A movie with this title and release year already exists.')); next(error); }
});
router.patch('/:id', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) throw fail(404, 'Movie not found.');
    const movie = await Movie.findById(req.params.id); if (!movie) throw fail(404, 'Movie not found.'); const body = req.body;
    if ('status' in body) {
      const allowed = movie.status === 'To Watch' ? ['Watching', 'Watched'] : movie.status === 'Watching' ? ['Watched', 'To Watch'] : [];
      if (!allowed.includes(body.status)) throw fail(400, movie.status === 'Watched' ? 'Watched movies are final and cannot change status.' : `Invalid status transition from ${movie.status} to ${body.status}.`);
      if (body.status === 'Watched') { const rating = Number(body.rating); if (!Number.isInteger(rating) || rating < 1 || rating > 10) throw fail(400, 'A rating from 1 to 10 is required when marking a movie Watched.'); movie.rating = rating; movie.watchedDate = new Date(); }
      else if ('rating' in body) throw fail(400, 'A rating can only be set for a Watched movie.');
      movie.status = body.status; if (body.status !== 'Watched') { movie.rating = null; movie.watchedDate = null; }
    } else if ('rating' in body) { const rating = Number(body.rating); if (movie.status !== 'Watched') throw fail(400, 'A rating can only be set for a Watched movie.'); if (!Number.isInteger(rating) || rating < 1 || rating > 10) throw fail(400, 'Rating must be a whole number from 1 to 10.'); movie.rating = rating; }
    for (const key of ['title', 'genre', 'runtime', 'platform', 'priority']) if (key in body) {
      if (key === 'title') { if (typeof body.title !== 'string' || !body.title.trim() || body.title.trim().length > 160) throw fail(400, 'Title is required (maximum 160 characters).'); movie.title = body.title.trim(); movie.titleKey = movie.title.toLocaleLowerCase(); }
      else if (key === 'genre') { if (!GENRES.includes(body.genre)) throw fail(400, 'Choose a valid genre.'); movie.genre = body.genre; }
      else if (key === 'platform') { if (!PLATFORMS.includes(body.platform)) throw fail(400, 'Choose a valid platform.'); movie.platform = body.platform; }
      else { const n = Number(body[key]), ok = key === 'runtime' ? Number.isInteger(n) && n >= 30 && n <= 300 : Number.isInteger(n) && n >= 1 && n <= 5; if (!ok) throw fail(400, key === 'runtime' ? 'Runtime must be between 30 and 300 minutes.' : 'Priority must be between 1 and 5.'); movie[key] = n; }
    }
    await movie.save(); send(res, 200, 'Movie updated.', movie);
  } catch (error) { if (error.code === 11000) return next(fail(409, 'A movie with this title and release year already exists.')); next(error); }
});
router.delete('/:id', async (req, res, next) => { try { if (!mongoose.isValidObjectId(req.params.id)) throw fail(404, 'Movie not found.'); const movie = await Movie.findById(req.params.id); if (!movie) throw fail(404, 'Movie not found.'); if (movie.status === 'Watching') throw fail(400, 'A movie currently being watched cannot be deleted.'); await movie.deleteOne(); send(res, 200, 'Movie deleted.', { id: movie.id }); } catch (error) { next(error); } });
export default router;

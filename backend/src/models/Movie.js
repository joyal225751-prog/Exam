import mongoose from 'mongoose';
export const GENRES = ['Action', 'Comedy', 'Drama', 'Horror', 'Sci-Fi', 'Romance', 'Thriller'];
export const PLATFORMS = ['Netflix', 'Prime Video', 'Hotstar', 'Theatre', 'Other'];
export const STATUSES = ['To Watch', 'Watching', 'Watched'];
const movieSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, immutable: true }, title: { type: String, required: true, trim: true }, titleKey: { type: String, required: true },
  genre: { type: String, enum: GENRES, required: true }, releaseYear: { type: Number, required: true, immutable: true }, runtime: { type: Number, required: true, min: 30, max: 300 },
  platform: { type: String, enum: PLATFORMS, required: true }, priority: { type: Number, required: true, min: 1, max: 5 }, status: { type: String, enum: STATUSES, default: 'To Watch', required: true },
  rating: { type: Number, min: 1, max: 10, default: null }, watchedDate: { type: Date, default: null }
}, { timestamps: true });
movieSchema.index({ titleKey: 1, releaseYear: 1 }, { unique: true });
movieSchema.index({ status: 1, priority: -1, runtime: 1 });
export default mongoose.model('Movie', movieSchema);

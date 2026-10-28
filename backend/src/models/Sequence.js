import mongoose from 'mongoose';
const sequenceSchema = new mongoose.Schema({ _id: Number, value: { type: Number, default: 0 } });
export default mongoose.model('Sequence', sequenceSchema);

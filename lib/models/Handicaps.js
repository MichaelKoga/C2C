import mongoose from "mongoose";

const HandicapSchema = new mongoose.Schema(
  {
    _id: Date,
    handicaps: Array
  },
  { strict: false }
);

export default mongoose.models.Handicap || 
  mongoose.model('Handicap', HandicapSchema, 'handicaps');

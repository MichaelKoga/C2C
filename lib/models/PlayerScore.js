import mongoose from "mongoose";

const playerScoreSchema = new mongoose.Schema(
  {
    name: { type: String, required: true},
    
    F9: { type: mongoose.Schema.Types.Mixed },
    B9: { type: mongoose.Schema.Types.Mixed },
    F18: { type: mongoose.Schema.Types.Mixed }
  },
  { _id: false}
);

export default playerScoreSchema;
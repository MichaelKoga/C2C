import mongoose from "mongoose";
import playerScoreSchema from "./PlayerScore.js";

const leaderboardSchema = new mongoose.Schema(
  {
    tourney_id: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    type: {
      type: String,
      enum: ["Tour", "Stonehenge"],
      required: true,
    },

    end_date: {
      type: String,
      required: true,
    },

    players: {
      type: [playerScoreSchema],
      default: [],
    },
  },
  { timestamps: true }
);

export default mongoose.models.Leaderboard || 
  mongoose.model("Leaderboard", leaderboardSchema, "leaderboards");
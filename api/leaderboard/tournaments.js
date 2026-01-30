import { connectDB } from "../../lib/db";
import Leaderboard from "../../lib/models/Leaderboard";

export default async function handler(req, res) {
  try {
    await connectDB();

    const tournaments = await Leaderboard.find(
      {},
      "_id tourney_id end_date type"
    ).sort({ end_date: -1 });

    res.status(200).json(tournaments);
  } catch (err) {
    console.error("Tournament list error:", err);
    res.status(500).json({ message: err.message });
  }
}
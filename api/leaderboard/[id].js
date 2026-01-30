import { connectDB } from "../../lib/db.js";
import Leaderboard from "../../lib/models/Leaderboard.js";

export default async function handler(req, res) {
  try {
    await connectDB();
    
    const tournament = await Leaderboard.findById(req.query.id);

    if (!tournament) {
      return res.status(404).json({ message: "Tournament not found" });
    }

    res.status(200).json(tournament);
  } catch (err) {
    console.error("Tournament fetch error:", err);
    res.status(500).json({ message: err.message });
  }
}
import { connectDB } from "../../lib/db";
import Leaderboard from "../../lib/models/Leaderboard";

export default async function handler(req, res) {
  await connectDB();

  if (req.method !== "GET") {
    return res.status(405).end();
  }

  try {
    const tournament = await Leaderboard.findById(req.query.id);

    if (!tournament) {
      return res.status(404).json({ message: "Tournament not found" });
    }

    res.json(tournament);
  } catch (err) {
    console.error("Tournament fetch error:", err);
    res.status(500).json({ message: err.message });
  }
}
import { connectDB } from "../../lib/db";
import Leaderboard from "../../lib/models/Leaderboard";

export default async function handler(req, res) {
  await connectDB();

  if (req.method !== "GET") {
    return res.status(405).end();
  }

  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const totalCount = await Leaderboard.countDocuments();
    const data = await Leaderboard.find()
      .skip(skip)
      .limit(limit)
      .sort({ end_date: -1 });

    res.json({
      totalCount,
      page,
      totalPages: Math.ceil(totalCount / limit),
      data
    });
  } catch (err) {
    console.error("Leaderboard fetch error:", err);
    res.status(500).json({ message: err.message });
  }
}
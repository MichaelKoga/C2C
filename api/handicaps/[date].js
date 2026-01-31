import { connectDB } from '../../lib/db.js';
import Handicap from '../../lib/models/Handicaps.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    await connectDB();

    const { date } = req.query;
    if (!date) {
      return res.status(400).json({ message: 'Missing date parameter' });
    }

    const targetDate = new Date(date);

    const doc = await Handicap.findOne({
      _id: { $lte: targetDate }
    })
      .sort({ _id: -1 })
      .lean();

    if (!doc) {
      return res
        .status(404)
        .json({ message: 'No handicap snapshot before given date.' });
    }

    res.status(200).json(doc);
  } catch (err) {
    console.error('Handicap API error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

// Define schema
const leaderboardSchema = new mongoose.Schema({}, { strict: false });
const Leaderboard = mongoose.model('Leaderboard', leaderboardSchema, 'leaderboards');

// GET /api/leaderboard
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const totalCount = await Leaderboard.countDocuments();
    const data = await Leaderboard.find().skip(skip).limit(limit);

    console.log('Leaderboard data fetched:', data);
    res.json({
      totalCount,
      page,
      totalPages: Math.ceil(totalCount / limit),
      data
    });
  } catch (err) {
    console.error('Error fetching leaderboard:', err);
    res.status(500).json({ message: err.message });
  }
});

// Return list of all tournaments (tourney_id, start_date, type)
router.get('/tournaments', async (req, res) => {
  try {
    const tournaments = await Leaderboard.find({}, '_id tourney_id end_date type');
    res.json(tournaments);
  } catch (err) {
    console.error("Error fetching tournaments:", err);
    res.status(500).json({ message: err.messsage });
  }
});

// Return the selected tournament data
router.get('/:id', async (req, res) => {
  try {
    const tournament = await Leaderboard.findById(req.params.id);
    if (!tournament) {
      return res.status(404).json({ message: 'Tournament not found' });
    }
    res.json(tournament);
  } catch (err) {
    console.error("Error fetching tournament by ID:", err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;

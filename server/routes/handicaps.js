const express = require('express');
const router = express.Router();
const mongoose = require('mongoose')

// Define schema
const handicapSchema = new mongoose.Schema({
  _id: Date,
  handicaps: Array
}, { strict: false });
const Handicap = mongoose.model('Handicaps', handicapSchema, 'handicaps'); // Adjust based on your schema

// GET /api/handicaps?date=2025-07-13
try {
  router.get('/:date', async (req, res) => {
    try {
      const dateStr = req.params.date;
      const date = new Date(dateStr);
      console.log(date);
      if (isNaN(date.getTime())) {
        return res.status(400).json({
          error: "Invalid date format. Use YYYY-MM-DD."
        });
      }

      const doc = await Handicap.findOne({_id: { $lte: date } })
        .sort({ _id: -1 }) // as the date
        .lean(); // return js objects instead of mongoose docs

      if (!doc) {
        res.status(404).json({ message: "No handicap snapshot before given date."});
      }

      res.json(doc);
    } 
    catch (err) {
      console.error('Error in /api/handicaps/:date:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
}
catch (error) {
  console.log('Error with route pattern:', '/:date');
  throw error;
}


module.exports = router;

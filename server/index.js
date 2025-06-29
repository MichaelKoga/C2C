const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('MongoDB connected'))
.catch(err => console.error('MongoDB connection error:', err));

const leaderboardRouter = require('./routes/leaderboard');
app.use('/api/leaderboard', leaderboardRouter);

const PORT = process.env.PORT || 5000
app.listen(PORT, () => {
	console.log(`Server running on port ${PORT}`);
});

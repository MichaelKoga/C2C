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

app.use((req, res, next) => {
  console.log(`Incoming ${req.method} request to: ${req.originalUrl}`);
  next();
});

const leaderboardRoutes = require('./routes/leaderboard');
try {
  app.use('/api/leaderboard', leaderboardRoutes);
}
catch (error) {
  console.log('Error with route pattern:', '/api/leaderboard');
  throw error;
}

const handicapRoutes = require('./routes/handicaps');
try {
  app.use('/api/handicaps', handicapRoutes);
}
catch (error) {
  console.log('Error with route pattern:', '/api/handicaps');
  throw error;
}

const path = require('path');
console.log("Registering static frontend route...");

app.use(express.static(path.join(__dirname, '../client/dist'), {
  fallthrough: true
}));

app.use((req, res) => {
  res.sendFile(path.join(__dirname, '../client/dist', 'index.html'));
});

const PORT = process.env.PORT || 5000
app.listen(PORT, () => {
	console.log(`Server running on port ${PORT}`);
});
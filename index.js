const express = require('express');
const mongoose = require('mongoose');

const app = express();
app.use(express.json());

const ReviewSchema = new mongoose.Schema({
  userId: String,
  contentId: String,
  username: String,
  review: String,
  spoilerContains: Boolean,
  mediaType: String,
}, { timestamps: true });

const Review = mongoose.model('Review', ReviewSchema);

app.get('/test', (req, res) => {
  res.send('Review service is running');
});

app.get('/:mediaType/:contentId', async (req, res) => {
  const { mediaType, contentId } = req.params;
  const reviews = await Review.find({ contentId, mediaType });
  res.json(reviews);
});

app.post('/add', async (req, res) => {
  const newReview = new Review({...req.body});
  await newReview.save();
  res.status(201).json({ message: 'Review added' });
});

app.post('/delete', async (req, res) => {
  const { contentId, userId } = req.body;
  await Review.findOneAndDelete({ contentId, userId });
  res.status(201).json({ message: 'Review deleted' });
});

async function connectToDatabase(uri) {
  await mongoose.connect(uri);
}

if (require.main === module) {
  const PORT = process.env.PORT || 3002;
  connectToDatabase(process.env.MONGO_URI || 'mongodb://localhost:27017/cineRate-review-db').then(() => {
    app.listen(PORT, () => {
      console.log(`Review service running on port ${PORT}`);
    });
  });
}

module.exports = { app, connectToDatabase };
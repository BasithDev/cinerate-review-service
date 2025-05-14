const mongoose = require('mongoose');

const ReviewSchema = new mongoose.Schema({
  userId: String,
  contentId: String,
  username: String,
  review: String,
  spoilerContains: Boolean,
  mediaType: String,
}, { timestamps: true });

const Review = mongoose.model('Review', ReviewSchema);

module.exports = Review;

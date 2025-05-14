const express = require('express');
const reviewController = require('../controllers/review.controller');

const router = express.Router();

// Get reviews for a specific content
router.get('/:mediaType/:contentId', reviewController.getContentReviews);

// Add a new review
router.post('/add', reviewController.addReview);

// Delete a review
router.post('/delete', reviewController.deleteReview);

module.exports = router;

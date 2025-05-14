const Review = require('../models/review.model');

class ReviewController {
  /**
   * Get reviews for a specific content
   */
  async getContentReviews(req, res) {
    try {
      const { mediaType, contentId } = req.params;
      const reviews = await Review.find({ contentId, mediaType });
      res.json(reviews);
    } catch (error) {
      console.error('Error fetching reviews:', error);
      res.status(500).json({ error: 'Failed to fetch reviews' });
    }
  }

  /**
   * Add a new review
   */
  async addReview(req, res) {
    try {
      const newReview = new Review({...req.body});
      await newReview.save();
      
      // Invalidate cache for this content
      if (req.redisCache && req.redisCache.connected) {
        try {
          await req.redisCache.invalidateMovieCache(req.body.contentId);
          if (req.body.userId) {
            await req.redisCache.invalidateUserReviewsCache(req.body.userId);
          }
        } catch (error) {
          console.error('Cache invalidation error:', error);
        }
      }
      
      res.status(201).json({ message: 'Review added' });
    } catch (error) {
      console.error('Error adding review:', error);
      res.status(500).json({ error: 'Failed to add review' });
    }
  }

  /**
   * Delete a review
   */
  async deleteReview(req, res) {
    try {
      const { contentId, userId } = req.body;
      await Review.findOneAndDelete({ contentId, userId });
      
      // Invalidate cache for this content and user
      if (req.redisCache && req.redisCache.connected) {
        try {
          await req.redisCache.invalidateMovieCache(contentId);
          if (userId) {
            await req.redisCache.invalidateUserReviewsCache(userId);
          }
        } catch (error) {
          console.error('Cache invalidation error:', error);
        }
      }
      
      res.status(200).json({ message: 'Review deleted' });
    } catch (error) {
      console.error('Error deleting review:', error);
      res.status(500).json({ error: 'Failed to delete review' });
    }
  }
}

module.exports = new ReviewController();

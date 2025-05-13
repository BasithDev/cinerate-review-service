const express = require('express');
const mongoose = require('mongoose');
const RedisCache = require('./redis-cache');

const app = express();
app.use(express.json());

// Initialize Redis cache
const redisCache = new RedisCache({
  prefix: 'review-service:',
  ttl: 900 // 15 minutes default TTL for reviews
});

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

// Add a comprehensive health check endpoint
app.get('/health', async (req, res) => {
  const healthcheck = {
    uptime: process.uptime(),
    message: 'OK',
    timestamp: Date.now(),
    mongoDbConnection: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    redisConnection: redisCache.connected ? 'connected' : 'disconnected'
  };

  try {
    // Perform a simple DB operation to verify connection is working
    await mongoose.connection.db.admin().ping();
    healthcheck.dbPing = 'successful';
    
    // Check Redis connection
    if (!redisCache.connected) {
      try {
        await redisCache.connect();
        healthcheck.redisPing = 'successful';
      } catch (redisError) {
        healthcheck.redisPing = 'failed';
        healthcheck.redisError = redisError.message;
      }
    } else {
      healthcheck.redisPing = 'successful';
    }
    
    res.status(200).json(healthcheck);
  } catch (error) {
    healthcheck.message = error.message;
    healthcheck.dbPing = 'failed';
    res.status(503).json(healthcheck);
  }
});

// Apply cache middleware to GET routes
app.get('/:mediaType/:contentId', redisCache.cacheMiddleware(900), async (req, res) => {
  const { mediaType, contentId } = req.params;
  const reviews = await Review.find({ contentId, mediaType });
  res.json(reviews);
});

app.post('/add', async (req, res) => {
  const newReview = new Review({...req.body});
  await newReview.save();
  
  // Invalidate cache for this content
  if (redisCache.connected) {
    try {
      await redisCache.invalidateMovieCache(req.body.contentId);
      if (req.body.userId) {
        await redisCache.invalidateUserReviewsCache(req.body.userId);
      }
    } catch (error) {
      console.error('Cache invalidation error:', error);
    }
  }
  
  res.status(201).json({ message: 'Review added' });
});

app.post('/delete', async (req, res) => {
  const { contentId, userId } = req.body;
  await Review.findOneAndDelete({ contentId, userId });
  
  // Invalidate cache for this content and user
  if (redisCache.connected) {
    try {
      await redisCache.invalidateMovieCache(contentId);
      if (userId) {
        await redisCache.invalidateUserReviewsCache(userId);
      }
    } catch (error) {
      console.error('Cache invalidation error:', error);
    }
  }
  
  res.status(201).json({ message: 'Review deleted' });
});

async function connectToDatabase(uri) {
  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      autoReconnect: true,
    });
    console.log('Connected to MongoDB');
  } catch (err) {
    console.error('Failed to connect to MongoDB', err);
    const retryDelayMs = 5000;
    console.log(`Retrying connection in ${retryDelayMs / 1000} seconds...`);
    setTimeout(() => connectToDatabase(uri), retryDelayMs);
  }
}

// Set up MongoDB connection event handlers
mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected, attempting to reconnect...');
});

mongoose.connection.on('reconnected', () => {
  console.log('MongoDB reconnected');
});

// Handle application termination
process.on('SIGINT', async () => {
  await mongoose.connection.close();
  console.log('MongoDB connection closed due to app termination');
  
  if (redisCache.connected) {
    await redisCache.close();
    console.log('Redis connection closed');
  }
  
  process.exit(0);
});

if (require.main === module) {
  const PORT = process.env.PORT || 3002;
  connectToDatabase(process.env.MONGO_URI || 'mongodb://localhost:27017/cineRate-review-db').then(async () => {
    // Connect to Redis
    try {
      await redisCache.connect();
      console.log('Connected to Redis');
    } catch (redisError) {
      console.warn('Warning: Could not connect to Redis:', redisError.message);
      console.warn('Review service will run without caching');
    }
    
    app.listen(PORT, () => {
      console.log(`Review service running on port ${PORT}`);
    });
  }).catch(err => {
    console.error('Failed to start service:', err);
  });
}

module.exports = { app, connectToDatabase };
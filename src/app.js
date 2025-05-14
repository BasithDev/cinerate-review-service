const express = require('express');
const createCacheMiddleware = require('./middleware/cache.middleware');
const reviewRoutes = require('./routes/review.routes');
const healthRoutes = require('./routes/health.routes');

/**
 * Create and configure Express application
 * @returns {object} Express app and resources
 */
function createApp() {
  const app = express();

  // Initialize Redis cache middleware
  const { redisCache, attachRedisCache, cacheRoute } = createCacheMiddleware();

  // Apply middlewares
  app.use(express.json());
  app.use(attachRedisCache);

  // Apply routes
  app.use('/', healthRoutes);
  
  // Apply review routes with cache middleware
  app.use('/', (req, res, next) => {
    // Apply cache middleware only to GET routes for content reviews
    if (req.method === 'GET' && req.path.match(/^\/[^\/]+\/[^\/]+$/)) {
      return cacheRoute(900)(req, res, next);
    }
    next();
  }, reviewRoutes);

  return { app, redisCache };
}

module.exports = createApp();

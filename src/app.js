const express = require('express');
const createCacheMiddleware = require('./middleware/cache.middleware');
const reviewRoutes = require('./routes/review.routes');
const healthRoutes = require('./routes/health.routes');
const { metricsMiddleware } = require('./middleware/metrics.middleware');

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
  app.use(metricsMiddleware);

  // Apply routes
  app.use('/', healthRoutes);
  
  // Apply review routes with cache middleware
  app.use('/', (req, res, next) => {
    // Apply cache middleware only to GET routes for content reviews
    // Exclude health endpoints from caching
    if (req.method === 'GET' && 
        req.path.match(/^\/[^/]+\/[^/]+$/) && 
        !req.path.startsWith('/health')) {
      return cacheRoute(900)(req, res, next);
    }
    next();
  }, reviewRoutes);

  return { app, redisCache };
}

module.exports = createApp();

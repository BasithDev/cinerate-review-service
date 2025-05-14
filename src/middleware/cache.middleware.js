const RedisCache = require('../utils/redis-cache');

/**
 * Create and initialize Redis cache middleware
 * @returns {object} Redis cache middleware
 */
function createCacheMiddleware() {
  const redisCache = new RedisCache({
    prefix: 'review-service:',
    ttl: 900 // 15 minutes default TTL for reviews
  });

  return {
    redisCache,
    
    // Attach Redis cache to request object
    attachRedisCache: (req, res, next) => {
      req.redisCache = redisCache;
      next();
    },
    
    // Cache middleware for routes
    cacheRoute: (ttl) => redisCache.cacheMiddleware(ttl)
  };
}

module.exports = createCacheMiddleware;

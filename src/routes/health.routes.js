const express = require('express');
const healthController = require('../controllers/health.controller');

const router = express.Router();

// Test endpoint
router.get('/test', healthController.testEndpoint);

// Health check endpoint
router.get('/health', healthController.checkHealth);

module.exports = router;

const express = require('express');
const {
  getTodayQueue,
  updateQueueStatus,
  addToQueue,
  getQueueStats,
  removeFromQueue
} = require('../controllers/queueController');

const { authenticateToken } = require('../middleware/auth');
const joiValidate = require('../middleware/joiValidate');
const { createQueueEntry, updateQueueEntry } = require('../validation/commonSchemas');

const router = express.Router();

// Create queue entry
router.post('/', joiValidate(createQueueEntry), addToQueue);

// Get today's queue
router.get('/today', getTodayQueue);

// Get queue statistics
router.get('/stats', getQueueStats);

// Update queue status
router.patch('/:id/status', joiValidate(updateQueueEntry), updateQueueStatus);

// Remove from queue
router.delete('/:id', removeFromQueue);

module.exports = router;

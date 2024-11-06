// routes/feedbackRoutes.js
const express = require('express');
const { storeFeedback, getFeedback } = require('../controllers/feedbackController');
const router = express.Router();

// Route to submit feedback
router.post('/feedback', storeFeedback);

// Route to get all feedback (optional, for admin or display purposes)
router.get('/feedback', getFeedback);

module.exports = router;

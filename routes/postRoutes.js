const express = require('express');
const router = express.Router();

const { getPostsPendingClientApproval, getFinalBroadcast, getPostApprovedByClient, getPostStats } = require('../controllers/postController');

// Define routes
router.get('/api/posts-pending-client-approval/:socialAccount', getPostsPendingClientApproval);
router.get('/api/final-broad-case/:socialAccount', getFinalBroadcast);
router.get('/api/post-approved-by-client/:socialAccount', getPostApprovedByClient);
router.get('/api/post-stats/:socialAccount', getPostStats);

module.exports = router
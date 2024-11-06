const express = require('express');
const router = express.Router();
const { getFestivalNotifications, getNextMonthFestivalsBasedOnSocialAccount, sendFeedbackNotifications, getFeedbackNotifications } = require('../controllers/getFestivalNotifications');

// Route to generate and store festival notifications
router.post('/festivals/notifications', getFestivalNotifications);

// Route to send feedback notifications
router.post('/feedback/notifications', sendFeedbackNotifications);

// Route to get feedback notifications for a specific social account
router.get('/notifications/feedback/:socialAccount', getFeedbackNotifications);

// Route to get next month's festivals for a specific social account
router.get('/festivals/notifications/:socialAccount', getNextMonthFestivalsBasedOnSocialAccount);

module.exports = router;

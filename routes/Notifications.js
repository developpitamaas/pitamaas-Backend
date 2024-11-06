const express = require('express');
const router = express.Router();
const { getFestivalNotifications, getNextMonthFestivalsBasedOnSocialAccount } = require('../controllers/getFestivalNotifications');

// Route to generate and store festival notifications
router.post('/festivals/notifications', getFestivalNotifications);

// Route to get next month's festivals for a specific social account
router.get('/festivals/notifications/:socialAccount', getNextMonthFestivalsBasedOnSocialAccount);

module.exports = router;

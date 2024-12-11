const express = require('express');
const router = express.Router();

const { getAds } = require('../controllers/AdsCenter');

// Route to fetch ads with socialAccount and filter as URL parameters
router.get('/ads/:socialAccount/:filter', getAds);

module.exports = router;

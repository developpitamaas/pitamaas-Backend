const express = require('express');
const router = express.Router();

const { getAds } = require('../controllers/AdsCenter');


// Route to fetch ads
router.get('/ads/:socialAccount', getAds);

module.exports = router;
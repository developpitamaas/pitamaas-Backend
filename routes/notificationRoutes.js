const express = require('express');
const {
  createFestivalNotifications,
  createNotificationsForOtherTypes,
  getNotificationsByType,
} = require('../controllers/notificationController');

const router = express.Router();

// Create notifications for festivals
router.post('/notifications/festival', async (req, res) => {
  try {
    await createFestivalNotifications();
    res.status(201).json({ message: 'Festival notifications created successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create notifications for other types
router.post('/notifications/others', async (req, res) => {
  try {
    await createNotificationsForOtherTypes();
    res.status(201).json({ message: 'Notifications for other types created successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Fetch notifications by type
router.get('/notifications/:type', getNotificationsByType);

module.exports = router;

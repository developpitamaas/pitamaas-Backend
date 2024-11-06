// routes/clientCredentialsRoutes.js

const express = require('express');
const router = express.Router();

const { getActiveClients, login, sendFeedbackNotifications } = require('../controllers/ClientCredentials');

// Route to fetch active clients
router.get('/clients/active', getActiveClients);

// Route for client login
router.post('/clients/login', login);

module.exports = router;

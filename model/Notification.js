// models/Notification.js
const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
    clientID: String,
    socialAccount: String,
    message: String,
    notificationType: String,
    festivals: [
        {
            festivalName: String,
            festivalDate: Date,
        },
    ],
    recommendations: [
        {
            festivalName: String,
            festivalDate: Date,
        },
    ],
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

module.exports = mongoose.model('Notification', NotificationSchema);

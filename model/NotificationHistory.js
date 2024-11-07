// models/NotificationHistory.js
const mongoose = require('mongoose');

const notificationHistorySchema = new mongoose.Schema({
    clientID: {
        type: Number,
        required: true,
    },
    socialAccount: {
        type: String,
        required: true,
    },
    message: {
        type: String,
        required: true,
    },
    notificationType: {
        type: String,
        required: true,
    },
    date: {
        type: Date,
        default: Date.now,
    },
    archivedAt: {
        type: Date,
        default: Date.now, // This will automatically record when the notification is archived
    },
});

module.exports = mongoose.model('NotificationHistory', notificationHistorySchema);

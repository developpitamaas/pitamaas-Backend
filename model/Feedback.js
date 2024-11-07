// models/Feedback.js
const mongoose = require('mongoose');

const FeedbackSchema = new mongoose.Schema({
    clientId: {
        type: String, // Change to String if `clientId` is not a reference
        required: true,
    },
    socialAccount: {
        type: String, // String to store socrolAccount details
        required: true,
    },
    ratings: {
        creativity: { type: Number, required: true },
        performance: { type: Number, required: true },
        communication: { type: Number, required: true },
    },
    message: {
        type: String,
        default: '',
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

module.exports = mongoose.model('Feedback', FeedbackSchema);

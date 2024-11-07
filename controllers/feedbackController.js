// controllers/feedbackController.js
const Feedback = require('../model/Feedback');
const Notification = require('../model/Notification');
const NotificationHistory = require('../model/NotificationHistory');

// Store Feedback API
exports.storeFeedback = async (req, res) => {
    try {
        const { clientId, socialAccount, ratings, message } = req.body;
console.log(clientId, socialAccount, ratings, message);
        // Step 1: Create and save the feedback in MongoDB
        const feedback = new Feedback({
            clientId,
            socialAccount,
            ratings,
            message,
        });

        await feedback.save();

        // Step 2: Find notifications for the specified user in Notification collection
        const notifications = await Notification.find({
            clientID: clientId,
            socialAccount,
            notificationType: 'Feedback',
        });

        if (notifications.length > 0) {
            // Step 3: Insert these notifications into NotificationHistory collection
            await NotificationHistory.insertMany(notifications);

            // Step 4: Delete the notifications from Notification collection
            await Notification.deleteMany({
                clientID: clientId,
                socialAccount,
                notificationType: 'Feedback',
            });
        }

        res.status(200).json({
            success: true,
            message: 'Feedback submitted successfully, and notifications moved to history',
            data: feedback,
        });
    } catch (error) {
        console.error('Error submitting feedback and moving notifications:', error);
        res.status(500).json({
            success: false,
            message: 'An error occurred while submitting feedback and updating notifications',
            error: error.message,
        });
    }
};
// Fetch Feedback (Optional API for retrieving feedback data)
exports.getFeedback = async (req, res) => {
    try {
        const feedback = await Feedback.find();
        res.status(200).json({
            success: true,
            data: feedback,
        });
    } catch (error) {
        console.error('Error retrieving feedback:', error);
        res.status(500).json({
            success: false,
            message: 'An error occurred while fetching feedback',
            error: error.message,
        });
    }
};

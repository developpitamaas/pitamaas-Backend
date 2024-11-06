// controllers/feedbackController.js
const Feedback = require('../model/Feedback');

// Store Feedback API
exports.storeFeedback = async (req, res) => {
    try {
        const { clientId, socrolAccount, ratings, message } = req.body;

        // Create and save the feedback in MongoDB
        const feedback = new Feedback({
            clientId,
            socrolAccount,
            ratings,
            message,
        });

        await feedback.save();

        res.status(200).json({
            success: true,
            message: 'Feedback submitted successfully',
            data: feedback,
        });
    } catch (error) {
        console.error('Error storing feedback:', error);
        res.status(500).json({
            success: false,
            message: 'An error occurred while submitting feedback',
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

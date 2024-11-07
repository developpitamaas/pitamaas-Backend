const sql = require('mssql');
const config = require('../config/dbConfig');
const Notification = require('../model/Notification');
const Feedback = require('../model/Feedback');

const getNextMonthName = () => {
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return monthNames[nextMonth.getMonth()];
};

const getFestivalNotifications = async (req, res) => {
    try {
        let pool = await sql.connect(config);

        // Set up the date range for the next month
        const nextMonthStart = new Date();
        nextMonthStart.setMonth(nextMonthStart.getMonth() + 1);
        nextMonthStart.setDate(1);

        const nextMonthEnd = new Date(nextMonthStart);
        nextMonthEnd.setMonth(nextMonthEnd.getMonth() + 1);
        nextMonthEnd.setDate(0);

        const nextMonthName = getNextMonthName();

        // Query active members from SQL Server
        let memberResult = await pool.request()
            .query(`SELECT ClientID, SocialAccount FROM clientenrollment WHERE Status = 'Active' ORDER BY SocialAccount ASC`);

        const clients = memberResult.recordset;

        // Query festivals in the specified date range
        let festivalResult = await pool.request()
            .input('startDate', sql.Date, nextMonthStart)
            .input('endDate', sql.Date, nextMonthEnd)
            .query(`SELECT FesName, FesDate FROM AddFestival WHERE FesDate >= @startDate AND FesDate <= @endDate`);

        const festivals = festivalResult.recordset;

        // Filter festivals based on custom criteria
        const recommendFestivals = (festivals) => {
            return festivals.filter(festival => {
                const festivalDate = new Date(festival.FesDate);
                return festivalDate.getDate() <= 15;
            });
        };

        const recommendedFestivals = recommendFestivals(festivals);

        // Prepare notifications for each client
        const notifications = clients.map(client => ({
            clientID: client.ClientID,
            socialAccount: client.SocialAccount,
            message: `Select your ${nextMonthName} festive creation!`,
            notificationType: 'Festival',
            festivals: festivals.map(festival => ({
                festivalName: festival.FesName,
                festivalDate: festival.FesDate,
            })),
            recommendations: recommendedFestivals.map(festival => ({
                festivalName: festival.FesName,
                festivalDate: festival.FesDate,
            })),
        }));

        // Save notifications to MongoDB
        await Notification.insertMany(notifications);

        res.json({
            message: 'Festival notifications generated and stored successfully',
            notifications,
            success: true,
            count: notifications.length,
        });

        await sql.close();
    } catch (error) {
        console.error('Error fetching festival notifications:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// send feedback notifications to clients based on social account when i call it
const sendFeedbackNotifications = async (req, res) => {
    try {
        // Connect to SQL Server
        let pool = await sql.connect(config);

        // Fetch active clients from the SQL database
        let memberResult = await pool.request()
            .query(`SELECT ClientID, SocialAccount FROM clientenrollment WHERE Status = 'Active' ORDER BY SocialAccount ASC`);
        
        const clients = memberResult.recordset;

        // Prepare feedback notifications for each client
        const feedbackNotifications = clients.map(client => ({
            clientID: client.ClientID,
            socialAccount: client.SocialAccount,
            message: `We value your feedback! Please share your thoughts on our services.`,
            notificationType: 'Feedback',
            date: new Date()
        }));

        // Save notifications to MongoDB
        await Notification.insertMany(feedbackNotifications);

        res.json({
            message: 'Feedback notifications sent successfully',
            feedbackNotifications,
            success: true,
            count: feedbackNotifications.length,
        });

        await sql.close();
    } catch (error) {
        console.error('Error sending feedback notifications:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// get feedback notifications based on social account
const getFeedbackNotifications = async (req, res) => {
    try {
        const feedbackNotifications = await Notification.find({
            socialAccount: req.params.socialAccount,
            notificationType: 'Feedback',
        });

        res.json({
            data: feedbackNotifications,
            count: feedbackNotifications.length,
            success: true,
            message: 'Data fetched successfully',
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: 'An error occurred while fetching the feedback notifications',
            error: err.message,
        });
    }
};


const getNextMonthFestivalsBasedOnSocialAccount = async (req, res) => {
    try {
        const nextMonthName = getNextMonthName();

        const nextMonthFestivals = await Notification.find({
            socialAccount: req.params.socialAccount,
            message: { $regex: nextMonthName, $options: 'i' },
        });

        res.json({
            data: nextMonthFestivals,
            count: nextMonthFestivals.length,
            success: true,
            message: 'Data fetched successfully',
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: 'An error occurred while fetching the festivals',
            error: err.message,
        });
    }
};

// Export both functions in a single module
module.exports = {
    getFestivalNotifications,
    sendFeedbackNotifications,
    getFeedbackNotifications,
    getNextMonthFestivalsBasedOnSocialAccount,
};

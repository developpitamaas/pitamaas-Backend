const Notification = require('../model/NotificationPitamaas');
const sql = require('mssql');
const config = require('../config/dbConfig');

const getNextMonthName = () => {
    const now = new Date();
    const nextMonth = new Date(now.setMonth(now.getMonth() + 1));
    return nextMonth.toLocaleString('default', { month: 'long' });
};

const createFestivalNotifications = async (req, res) => {
  try {
    let pool = await sql.connect(config);

    const nextMonthStart = new Date();
    nextMonthStart.setMonth(nextMonthStart.getMonth() + 1);
    nextMonthStart.setDate(1);

    const nextMonthEnd = new Date(nextMonthStart);
    nextMonthEnd.setMonth(nextMonthEnd.getMonth() + 1);
    nextMonthEnd.setDate(0);

    const nextMonthName = getNextMonthName();

    const memberResult = await pool.request().query(`
      SELECT ClientID, SocialAccount 
      FROM clientenrollment 
      WHERE Status = 'Active' 
      ORDER BY SocialAccount ASC
    `);

    if (!memberResult.recordset || memberResult.recordset.length === 0) {
      return res.status(404).json({ message: 'No active clients found' });
    }

    const clients = memberResult.recordset;

    const festivalResult = await pool.request()
      .input('startDate', sql.Date, nextMonthStart)
      .input('endDate', sql.Date, nextMonthEnd)
      .query(`
        SELECT FesName, FesDate 
        FROM AddFestival 
        WHERE FesDate >= @startDate AND FesDate <= @endDate
      `);

    const festivals = festivalResult.recordset;

    if (!festivals || festivals.length === 0) {
      return res.status(404).json({ message: 'No festivals found for the next month' });
    }

    const recommendFestivals = (festivals) => {
      return festivals.filter(festival => {
        const festivalDate = new Date(festival.FesDate);
        return festivalDate.getDate() <= 15;
      });
    };

    const recommendedFestivals = recommendFestivals(festivals);

    const notifications = clients.map(client => ({
      clientID: client.ClientID,
      socialAccount: client.SocialAccount,
      message: `Select your ${nextMonthName} festive creation!`,
      type: 'Festival',
      festivals: festivals.map(festival => ({
        festivalName: festival.FesName,
        festivalDate: festival.FesDate,
      })),
      recommendations: recommendedFestivals.map(festival => ({
        name: festival.FesName,
        date: festival.FesDate,
      })),
    }));

    console.log('Prepared Notifications:', notifications[0].festivals[0].FesName);

    await Notification.insertMany(notifications);

    res.status(201).json({ message: 'Festival notifications created successfully' });

  } catch (error) {
    console.error('Error creating festival notifications:', error);
    res.status(500).json({ 'error': error.message || 'Internal Server Error' });
  }
};
  
// Create notifications for other types
const createNotificationsForOtherTypes = async (req, res) => {
    try {
        let pool = await sql.connect(config);

        const memberResult = await pool.request().query(`
      SELECT ClientID, SocialAccount 
      FROM clientenrollment 
      WHERE Status = 'Active' 
      ORDER BY SocialAccount ASC
    `);
        const clients = memberResult.recordset;

        const staticMessages = {
            order: 'Your order has been shipped!',
            reminder: 'Don’t forget your meeting at 3 PM.',
            feedback: 'We value your feedback. Please share your thoughts!',
        };

        const notificationTypes = ['order', 'reminder', 'feedback'];
        const notifications = [];

        clients.forEach(client => {
            notificationTypes.forEach(type => {
                notifications.push({
                    clientID: client.ClientID,
                    socialAccount: client.SocialAccount,
                    message: staticMessages[type],
                    type: type.charAt(0).toUpperCase() + type.slice(1),
                });
            });
        });

        await Notification.save(notifications);

        res.status(201).json({ message: 'Notifications for other types created successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const getNotificationsByType = async (req, res) => {
    try {
        const { type } = req.params;
        const notifications = await Notification.find({ type });
        res.status(200).json(notifications);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
    createFestivalNotifications,
    createNotificationsForOtherTypes,
    getNotificationsByType,
};

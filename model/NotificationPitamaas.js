const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  clientID: { type: String, required: true },
  socialAccount: { type: String, required: true },
  message: { type: String, required: true },
  type: { type: String, required: true }, // e.g., 'Festival', 'Order', 'Reminder', 'Feedback'
  details: { type: Object, default: {} }, // For additional details per notification type
  festivals: [
    {
      festivalName: { type: String },
      festivalDate: { type: Date },
    },
  ],
  recommendations: [
    {
      festivalName: { type: String },
      festivalDate: { type: Date },
    },
  ],
}, { timestamps: true });

module.exports = mongoose.model('NotificationPitamaas', NotificationSchema);

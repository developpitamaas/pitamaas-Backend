const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const clientRoutes = require('./routes/clientRoutes');
const loginRoutes = require('./routes/loginRoutes');
const newClientRoutes = require('./routes/newClientRoutes');
const clientCredentialsRoutes = require('./routes/clientCredentialsRoutes');
const Notification = require('./routes/Notifications');
const Feedback = require('./routes/feedbackRoutes')
const notificationRoutes = require('./routes/notificationRoutes'); 
const GetAds = require('./routes/AdsCenterRoutes');
const PostRoute = require('./routes/postRoutes');

const app = express();

// Middleware to parse JSON
app.use(express.json());

// Middleware to enable CORS
app.use(cors());


// MongoDB connection
const mongoURI = 'mongodb+srv://sachinpitamaasweb:2U8iSnXE8YCrgo5p@cluster0.zj9x2jv.mongodb.net/Pitamaas' || 'mongodb://localhost:27017/Pitamaas';
mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Use the client routes
app.use('/api', clientRoutes);

// Use the login routes
app.use('/api', loginRoutes);

// Use the new client routes
app.use('/api', newClientRoutes);

// Use the new client credentials routes
app.use('/api', clientCredentialsRoutes);

// use the notification routes
app.use('/api', Notification);

// use the feedback 
app.use('/api', Feedback);

// use the notification routes
app.use('/api', notificationRoutes);

// use the ads routes
app.use('/api', GetAds);

// use the post routes
app.use('/post', PostRoute);

// get request
app.get('/', (req, res) => {
    res.send('Welcome to Pitamaas Backend');
})

// post request
app.post('/pitamaas', (req, res) => {
    console.log(req.body);
    res.send('Welcome to Pitamaas Backend');
})

// Define a port and start the server
const PORT = process.env.PORT || 3003;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

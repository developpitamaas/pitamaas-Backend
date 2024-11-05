const mongoose = require('mongoose');

// Define the ClientCredentials schema
const clientCredentialsSchema = new mongoose.Schema({
    clientId: Number,
    socialAccounts: [String],
    credentials: {
        username: String,
        password: String
    }
});

// Create the model
const ClientCredentials = mongoose.model('ClientCredentials', clientCredentialsSchema);

module.exports = ClientCredentials;

const sql = require('mssql');
const ClientCredentials = require('../model/ClientCredentials');
const config = require('../config/dbConfig');

// Helper function to generate a unique numeric password
const generateUniqueNumericPassword = (length) => {
    let password = '';
    for (let i = 0; i < length; i++) {
        password += Math.floor(Math.random() * 10); // Generates a random digit from 0-9
    }
    return password;
};

// Function to generate credentials based on clientId and socialAccount
const generateCredentials = (clientId, socialAccount) => {
    const sanitizedSocialAccount = socialAccount
        .replace(/\s+/g, '')
        .replace(/[^\w\s]/gi, '');

    const username = `${sanitizedSocialAccount}_${clientId}`;
    const password = generateUniqueNumericPassword(6);

    return {
        username,
        password
    };
};

const getActiveClients = async (req, res) => {
    try {
        let pool = await sql.connect(config);
        let result = await pool.request().query(`
            SELECT ClientID, SocialAccount 
            FROM clientenrollment 
            WHERE Status = 'Active' 
            ORDER BY SocialAccount ASC
        `);

        const clients = result.recordset;

        if (clients.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No active clients found'
            });
        }

        const credentialMap = new Map();

        clients.forEach(client => {
            const { ClientID, SocialAccount } = client;

            if (ClientID === 2705) {
                const credentials = generateCredentials(ClientID, SocialAccount);
                credentialMap.set(`${ClientID}_${SocialAccount}`, {
                    clientId: ClientID,
                    socialAccounts: [SocialAccount],
                    credentials
                });
                return;
            }

            if (credentialMap.has(ClientID)) {
                const existingData = credentialMap.get(ClientID);
                if (!existingData.socialAccounts.includes(SocialAccount)) {
                    existingData.socialAccounts.push(SocialAccount);
                }
            } else {
                const credentials = generateCredentials(ClientID, SocialAccount);
                credentialMap.set(ClientID, {
                    clientId: ClientID,
                    socialAccounts: [SocialAccount],
                    credentials
                });
            }
        });

        const clientCredentials = Array.from(credentialMap.values());

        await ClientCredentials.insertMany(clientCredentials);

        res.json({
            data: clientCredentials,
            count: clientCredentials.length,
            success: true,
            message: 'Data fetched and credentials stored successfully'
        });
    } catch (err) {
        console.error('Error:', err);
        res.status(500).send(err.message);
    }
};

const login = async (req, res) => {
    const { username, password } = req.body;

    try {
        const client = await ClientCredentials.findOne({
            'credentials.username': username,
            'credentials.password': password
        });

        if (!client) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        res.json({
            success: true,
            message: 'Login successful',
            clientId: client.clientId,
            socialAccount: client.socialAccounts
        });
    } catch (err) {
        console.error('Error during login:', err);
        res.status(500).send(err.message);
    }
};

module.exports = {
    getActiveClients,
    login
};

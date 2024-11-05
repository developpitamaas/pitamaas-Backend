const sql = require('mssql');
const express = require('express');
const fs = require('fs');
const path = require('path');
const http = require('http');
const socketIo = require('socket.io');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');
const config = require('../config/dbConfig');


const app = express();
app.use(express.json()); // For parsing application/json

const server = http.createServer(app);
const io = socketIo(server);


// Listen for incoming connections from clients
io.on('connection', (socket) => {
    console.log('A user connected');

    // Handle disconnection
    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
});

// Function to get all Clients
const getClients = async (req, res) => {
    try {
        let pool = await sql.connect(config);
        let result = await pool.request().query('SELECT * FROM  clientsRecord');
        res.json(result.recordset);
    } catch (err) {
        res.status(500).send(err.message);
    }
};
const getActiveClient = async (req, res) => {
    try {
        let pool = await sql.connect(config);
        let result = await pool.request().query(`
            SELECT * 
            FROM clientenrollment 
            WHERE Status = 'Active' 
            ORDER BY SocialAccount ASC
        `);
        res.json({
            data: result.recordset,
            count: result.recordset.length,
            success: true,
            message: 'Data fetched successfully'
        });
    } catch (err) {
        res.status(500).send(err.message);
    }
};

// Chat API to send a message based on sender and receiver
const sendMessage = async (req, res) => {
    try {
        let pool = await sql.connect(config);

        // Use sender and receiver from request body
        const { sender, receiver, message } = req.body;

        // Insert message into database
        let result = await pool.request()
            .input('sender', sql.VarChar, sender)
            .input('receiver', sql.VarChar, receiver)
            .input('message', sql.VarChar, message)
            .query('INSERT INTO ChatMessages (Sender, Receiver, Message) VALUES (@sender, @receiver, @message)');

        // Emit the new message to the appropriate receiver
        io.to(receiver).emit('newMessage', {
            sender: sender,
            receiver: receiver,
            message: message,
            timestamp: new Date()
        });

        res.json({
            success: true,
            message: 'Message sent successfully',
            timestamp: new Date(),
            count: result.rowsAffected[0] // Get the count of affected rows
        });
    } catch (err) {
        console.error(err);
        res.status(500).send(err.message);
    }
};

// Create table function
// const createChatMessagesTable = async (req, res) => {
//     try {
//         let pool = await sql.connect(config);

//         // Drop the table if it already exists
//         await pool.request().query(`
//             IF OBJECT_ID('ChatMessages', 'U') IS NOT NULL 
//                 DROP TABLE ChatMessages;
//         `);

//         // Create the new table with Sender and Receiver columns
//         await pool.request().query(`
//             CREATE TABLE ChatMessages (
//                 Id INT PRIMARY KEY IDENTITY(1,1),  -- Auto-incrementing ID for each message
//                 Sender NVARCHAR(100) NOT NULL,  -- Column to store the sender's social account name
//                 Receiver NVARCHAR(100) NOT NULL, -- Column to store the receiver's social account name
//                 Message NVARCHAR(MAX) NOT NULL,  -- Column to store the message text
//                 Timestamp DATETIME DEFAULT GETDATE()  -- Column to store the message timestamp, defaults to the current date/time
//             );
//         `);

//         res.json({
//             success: true,
//             message: 'Table created successfully'
//         });
//     } catch (err) {
//         console.error(err);
//         res.status(500).send(err.message);
//     }
// };



// Create the SelectedFestivals table
const createChatMessagesTable = async (req, res) => {
    try {
        let pool = await sql.connect(config);

        // Drop the table if it already exists
        await pool.request().query(`
        IF OBJECT_ID('ClientCredentials', 'U') IS NOT NULL 
            DROP TABLE ClientCredentials;
      `);

        // Create the new ClientCredentials table
        await pool.request().query(`
        CREATE TABLE ClientCredentials (
          id INT IDENTITY(1,1) PRIMARY KEY,
          clientID INT,
          socialAccount VARCHAR(255),
          username VARCHAR(255),
          password VARCHAR(255)
        );
      `);

        // Send response indicating success
        res.json({
            success: true,
            message: 'ClientCredentials table created successfully',
        });
    } catch (err) {
        console.error('Error creating ClientCredentials table:', err);
        res.status(500).send(err.message);
    } finally {
        // Close the SQL connection
        sql.close();
    }
};

// Get all chat messages data for a specific user
const getChatMessages = async (req, res) => {
    try {
        let pool = await sql.connect(config);
        const { userAccount } = req.query; // Get the user account from query parameters

        // Fetch messages where userAccount is either the sender or receiver
        let result = await pool.request()
            .input('userAccount', sql.VarChar, userAccount)
            .query(`
                SELECT * FROM ChatMessages
                WHERE Sender = @userAccount OR Receiver = @userAccount
                ORDER BY Timestamp ASC
            `);

        // Check if there are no messages
        if (result.recordset.length === 0) {
            // Return dummy data
            const dummyData = [
                {
                    Id: 1,
                    Sender: 'DummySender1',
                    Receiver: 'DummyReceiver1',
                    Message: 'This is a dummy message 1',
                    Timestamp: new Date()
                },
                {
                    Id: 2,
                    Sender: 'DummySender2',
                    Receiver: 'DummyReceiver2',
                    Message: 'This is a dummy message 2',
                    Timestamp: new Date()
                }
            ];

            return res.json({
                data: dummyData,
                count: dummyData.length,
                success: true,
                message: 'No chat messages found. Returned dummy data.'
            });
        }

        res.json({
            data: result.recordset,
            count: result.recordset.length,
            success: true,
            message: 'Data fetched successfully'
        });
    } catch (err) {
        res.status(500).send(err.message);
    }
};

// const getActiveClients = async (req, res) => {
//     try {
//         let pool = await sql.connect(config);
//         let result = await pool.request().query(`
//             SELECT ClientID, SocialAccount 
//             FROM clientenrollment 
//             WHERE Status = 'Active' 
//             ORDER BY SocialAccount ASC
//         `);

//         const clients = result.recordset;

//         if (clients.length === 0) {
//             return res.status(404).json({
//                 success: false,
//                 message: 'No active clients found'
//             });
//         }

//         const clientCredentials = clients.map(client => {
//             return {
//                 clientId: client.ClientID,
//                 socialAccount: client.SocialAccount,
//                 credentials: generateCredentials(client.ClientID, client.SocialAccount)
//             };
//         });

//         // Save to a JSON file
//         fs.writeFileSync('client_credentials.json', JSON.stringify(clientCredentials, null, 2));

//         res.json({
//             data: clientCredentials,
//             count: clientCredentials.length,
//             success: true,
//             message: 'Data fetched and credentials generated successfully'
//         });
//     } catch (err) {
//         res.status(500).send(err.message);
//     }
// };

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

            // Generate unique credentials if ClientID is 2705
            const credentials = generateCredentials(ClientID, SocialAccount);

            if (ClientID === 2705 || !credentialMap.has(ClientID)) {
                credentialMap.set(ClientID, {
                    clientId: ClientID,
                    socialAccounts: [SocialAccount],
                    credentials
                });
            } else {
                // Append social account if the client already exists in the map
                const existingData = credentialMap.get(ClientID);
                if (!existingData.socialAccounts.includes(SocialAccount)) {
                    existingData.socialAccounts.push(SocialAccount);
                }
            }
        });

        const clientCredentials = Array.from(credentialMap.values());

        // Store generated credentials in the ClientCredentials table
        for (const entry of clientCredentials) {
            for (const socialAccount of entry.socialAccounts) {
                await pool.request()
                    .input('clientId', sql.Int, entry.clientId)
                    .input('socialAccount', sql.VarChar(255), socialAccount)
                    .input('username', sql.VarChar(255), entry.credentials.username)
                    .input('password', sql.VarChar(255), entry.credentials.password)
                    .query(`
                        INSERT INTO ClientCredentials (clientID, socialAccount, username, password)
                        VALUES (@clientId, @socialAccount, @username, @password);
                    `);
            }
        }

        res.json({
            data: clientCredentials,
            count: clientCredentials.length,
            success: true,
            message: 'Data fetched and credentials generated successfully'
        });
    } catch (err) {
        res.status(500).send(err.message);
    }
}

const generateCredentials = (clientId, socialAccount) => {
    // Sanitize the socialAccount name (removing spaces and special characters)
    const sanitizedSocialAccount = socialAccount
        .replace(/\s+/g, '') // Replace spaces with no space
        .replace(/[^\w\s]/gi, ''); // Remove non-alphanumeric characters

    // Generate username based on socialAccount and clientId
    const username = `${sanitizedSocialAccount}_${clientId}`;

    // Generate a random numeric password of length 6
    const password = generateUniqueNumericPassword(6);

    return {
        username,
        password
    };
};


// const generateCredentials = (clientId, socialAccount) => {
//     // Replace spaces and special characters with underscores in the socialAccount for username
//     const sanitizedSocialAccount = socialAccount
//         .replace(/\s+/g, '')          // Replace spaces with underscores
//         .replace(/[^\w\s]/gi, '');     // Remove non-alphanumeric characters
//     const username = `${sanitizedSocialAccount}_${clientId}`;

//     // Generate a random numeric password of length 6
//     const password = generateUniqueNumericPassword(6);

//     return {
//         username,
//         password
//     };
// };

// Function to generate a unique numeric password
const generateUniqueNumericPassword = (length) => {
    // Using a set to avoid duplicate passwords
    const usedPasswords = new Set();
    let password;

    do {
        password = '';
        const characters = '0123456789';
        for (let i = 0; i < length; i++) {
            password += characters.charAt(Math.floor(Math.random() * characters.length));
        }
    } while (usedPasswords.has(password)); // Ensure the password is unique

    usedPasswords.add(password);
    return password;
};

// Read the client credentials file once at startup
let clientCredentials;
try {
    clientCredentials = JSON.parse(fs.readFileSync('client_credentials.json'));
} catch (err) {
    console.error('Error reading client credentials:', err.message);
}

const login = async (req, res) => {
    const { username, password } = req.body;

    try {
        let pool = await sql.connect(config);

        // Query the ClientCredentials table for matching credentials
        let result = await pool.request()
            .input('username', sql.VarChar(255), username)
            .input('password', sql.VarChar(255), password)
            .query(`
                SELECT clientID, socialAccount 
                FROM ClientCredentials 
                WHERE username = @username AND password = @password
            `);

        const client = result.recordset[0];

        if (!client) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Successful login response
        res.json({
            success: true,
            message: 'Login successful',
            clientId: client.clientID,
            socialAccount: client.socialAccount
        });
    } catch (err) {
        res.status(500).send(err.message);
    }
};


// function to find the Non-Repeated Clients

const getNonRepeatedClients = async (req, res) => {
    try {
        let pool = await sql.connect(config);

        // Query to find non-repeated clients based on clientId
        let result = await pool.request()
            .query(`
                SELECT clientId
                FROM clientsRecord
                GROUP BY clientId
                HAVING COUNT(*) = 1
            `);

        res.json({
            data: result.recordset,
            count: result.recordset.length,
            success: true,
            message: 'Data fetched successfully'
        });
    } catch (err) {
        res.status(500).send(err.message);
    }
};

// Function to get duplicate records
const getDuplicateRecords = async (req, res) => {
    try {
        let pool = await sql.connect(config);

        let result = await pool.request().query(`
            SELECT *
            FROM ClientsRecord
            WHERE ContactNumber IN (
                SELECT ContactNumber
                FROM ClientsRecord
                GROUP BY ContactNumber
                HAVING COUNT(*) > 1
            )
        `);

        res.json({
            data: result.recordset,
            count: result.recordset.length
        });
    } catch (err) {
        res.status(500).send(err.message);
    }
};

// Function to get unique records
const getUniqueRecords = async (req, res) => {
    try {
        let pool = await sql.connect(config);

        let result = await pool.request().query(`
            SELECT *
            FROM ClientsRecord
            WHERE ContactNumber IN (
                SELECT ContactNumber
                FROM ClientsRecord
                GROUP BY ContactNumber
                HAVING COUNT(*) = 1
            )
        `);

        res.json({
            data: result.recordset,
            count: result.recordset.length
        });
    } catch (err) {
        res.status(500).send(err.message);
    }
};

const getPostSchedular = async (req, res) => {
    try {
        let pool = await sql.connect(config);
        let result = await pool.request().query('SELECT * FROM  PostSchedular');
        res.json({
            data: result.recordset,
            count: result.recordset.length,
            success: true,
            message: 'Data fetched successfully'
        });
    } catch (err) {
        res.status(500).send(err.message);
    }
};

const getClientEnrollment = async (req, res) => {
    try {
        let pool = await sql.connect(config);
        let result = await pool.request().query('SELECT * FROM  ClientEnrollment');
        res.json({
            data: result.recordset,
            count: result.recordset.length,
            success: true,
            message: 'Data fetched successfully'
        });
    } catch (err) {
        res.status(500).send(err.message);
    }
};

const getIdeaUploader = async (req, res) => {
    try {
        let pool = await sql.connect(config);
        let result = await pool.request().query('SELECT * FROM  IdeaUploader');
        res.json({
            data: result.recordset,
            count: result.recordset.length,
            success: true,
            message: 'Data fetched successfully'
        });
    } catch (err) {
        res.status(500).send(err.message);
    }
};


// find the idea uploader by client id
const getIdeaUploaderByClientId = async (req, res) => {
    try {
        let pool = await sql.connect(config);
        let result = await pool.request()
            .input('clientId', sql.Int, req.params.clientId)
            .query('SELECT * FROM IdeaUploader WHERE ClientId = @clientId');
        res.json({
            data: result.recordset,
            count: result.recordset.length,
            success: true,
            message: 'Data fetched successfully'
        });
    } catch (err) {
        res.status(500).send(err.message);
    }
};



// find the Plans
const getPlans = async (req, res) => {
    try {
        let pool = await sql.connect(config);
        let result = await pool.request().query('SELECT * FROM  Plans');
        res.json({
            data: result.recordset,
            count: result.recordset.length,
            success: true,
            message: 'Data fetched successfully'
        });
    } catch (err) {
        res.status(500).send(err.message);
    }
};

// get Panns by PlanId
const getPannsByPlanId = async (req, res) => {
    console.log(req.params.planId);
    try {
        let pool = await sql.connect(config);
        let result = await pool.request()
            .input('planId', sql.Int, req.params.planId)
            .query('SELECT * FROM Plans WHERE PlanId = @planId');
        res.json({
            data: result.recordset,
            count: result.recordset.length,
            success: true,
            message: 'Data fetched successfully'
        });
    } catch (err) {
        res.status(500).send(err.message);
    }
};

// get the client Enrollment by client id 
const getClientEnrollmentByClientId = async (req, res) => {
    try {
        let pool = await sql.connect(config);
        let result = await pool.request()
            .input('clientId', sql.Int, req.params.clientId)
            .query(`
                SELECT * 
                FROM ClientEnrollment 
                WHERE ClientId = @clientId AND status = 'active'
            `);
        res.json({
            data: result.recordset,
            count: result.recordset.length,
            success: true,
            message: 'Data fetched successfully'
        });
    } catch (err) {
        res.status(500).send(err.message);
    }
};

//  get the client Enrollment by SocialAccount
const getClientEnrollmentBySocialAccount = async (req, res) => {
    try {
        let pool = await sql.connect(config);
        let result = await pool.request()
            .input('socialAccount', sql.VarChar, req.params.socialAccount)
            .query(`
                SELECT * 
                FROM ClientEnrollment 
                WHERE SocialAccount = @socialAccount AND status = 'active'
            `);
        res.json({
            data: result.recordset,
            count: result.recordset.length,
            success: true,
            message: 'Data fetched successfully'
        });
    } catch (err) {
        res.status(500).send(err.message);
    }
}

// get idea uploader data by client id and SocialAccount
const getIdeaUploaderByClientIdAndSocialAccount = async (req, res) => {
    try {
        const { clientId, socialAccount, } = req.body; // Extract clientId and socialAccount from request body

        if (!socialAccount) {
            return res.status(400).json({
                success: false,
                message: 'clientId and socialAccount are required'
            });
        }

        let pool = await sql.connect(config);
        let result = await pool.request()
            .input('socialAccount', sql.VarChar, socialAccount)
            .query(`
                SELECT * 
                FROM IdeaUploader 
                WHERE SocialAccount = @socialAccount 
                AND (UploadedFileStatus = 'Pending' OR UploadedFileStatus IS NULL)
                AND CreativeStatus = 'Done'
              `);

        if (result.recordset.length > 0) {
            res.json({
                data: result.recordset,
                count: result.recordset.length,
                success: true,
                message: 'Data fetched successfully'
            });
        } else {
            res.status(404).json({
                success: false,
                message: 'No data found'
            })
        }
    } catch (err) {
        res.status(500).send(err.message);
    }
};

// get the idea uploader data by client id and SocialAccount and post id
const getIdeaUploaderByClientIdAndSocialAccountAndPostId = async (req, res) => {
    try {
        const { clientId, socialAccount, postId } = req.body; // Extract clientId, socialAccount, and postId from request body

        if (!clientId || !socialAccount || !postId) {
            return res.status(400).json({
                success: false,
                message: 'clientId, socialAccount, and postId are required'
            });
        }

        let pool = await sql.connect(config);
        let result = await pool.request()
            .input('clientId', sql.Int, clientId)
            .input('socialAccount', sql.VarChar, socialAccount)
            .input('postId', sql.Int, postId)
            .query('SELECT * FROM IdeaUploader WHERE ClientId = @clientId AND SocialAccount = @socialAccount AND Id = @postId');

        res.json({
            data: result.recordset,
            count: result.recordset.length,
            success: true,
            message: 'Data fetched successfully'
        });
    } catch (err) {
        res.status(500).send(err.message);
    }
};

// get the AddMonthlyAmount order by id desc 
const getAddMonthlyAmount = async (req, res) => {
    try {
        let pool = await sql.connect(config);
        let result = await pool.request()
            .input('orderId', sql.Int, req.params.orderId)
            .query('SELECT * FROM AddMonthlyAmount ORDER BY id DESC');
        res.json({
            data: result.recordset,
            count: result.recordset.length,
            success: true,
            message: 'Data fetched successfully'
        });
    } catch (err) {
        res.status(500).send(err.message);
    }
};


// get the add-vouchar order by id desc 
const getAddVouchar = async (req, res) => {
    try {
        let pool = await sql.connect(config);
        let result = await pool.request()
            .input('orderId', sql.Int, req.params.orderId)
            .query('SELECT * FROM AddVouchar ORDER BY id DESC');
        res.json({
            data: result.recordset,
            count: result.recordset.length,
            success: true,
            message: 'Data fetched successfully'
        });
    } catch (err) {
        res.status(500).send(err.message);
    }
};

const getClientEnrollmentByClientIdAndSocialAccount = async (req, res) => {
    try {
        const { clientId, socialAccount } = req.body; // Extract clientId and socialAccount from request body

        if (!clientId || !socialAccount) {
            return res.status(400).json({
                success: false,
                message: 'clientId and socialAccount are required'
            });
        }

        let pool = await sql.connect(config);
        let result = await pool.request()
            .input('clientId', sql.Int, clientId)
            .input('socialAccount', sql.VarChar, socialAccount)
            .query('SELECT * FROM ClientEnrollment WHERE ClientId = @clientId AND SocialAccount = @socialAccount');
        res.json({
            data: result.recordset,
            count: result.recordset.length,
            success: true,
            message: 'Data fetched successfully'
        });
    } catch (err) {
        res.status(500).send(err.message);
    }
}

const getClientData = async (req, res) => {
    try {
        const { clientId, socialAccount } = req.body; // Extract clientId and socialAccount from request body

        if (!clientId || !socialAccount) {
            return res.status(400).json({
                success: false,
                message: 'clientId and socialAccount are required'
            });
        }

        let pool = await sql.connect(config);

        // Fetch data from ClientEnrollment
        let clientEnrollmentResult = await pool.request()
            .input('clientId', sql.Int, clientId)
            .input('socialAccount', sql.VarChar, socialAccount)
            .query('SELECT * FROM ClientEnrollment WHERE ClientId = @clientId AND SocialAccount = @socialAccount');

        // Fetch data from AddMonthlyAmount
        let addMonthlyAmountResult = await pool.request()
            .input('socialAccount', sql.VarChar, socialAccount)
            .query('SELECT * FROM AddMonthlyAmount WHERE SocialAccount = @socialAccount');

        // Fetch data from AddVouchar
        let addVoucharResult = await pool.request()
            .input('socialAccount', sql.VarChar, socialAccount)
            .query('SELECT * FROM AddVouchar WHERE SocialAccount = @socialAccount');

        // Combine data
        let combinedData = {
            clientEnrollment: clientEnrollmentResult.recordset,
            addMonthlyAmount: addMonthlyAmountResult.recordset,
            addVouchar: addVoucharResult.recordset
        };

        // Calculate total PaidAmount from clientEnrollment, Budget from addMonthlyAmount, and Amount from addVouchar
        let totalPaidAmount = clientEnrollmentResult.recordset.reduce((sum, record) => sum + (record.PaidAmount || 0), 0);
        let totalBudget = addMonthlyAmountResult.recordset.reduce((sum, record) => sum + (record.Budget || 0), 0);
        let totalVoucharAmount = addVoucharResult.recordset.reduce((sum, record) => sum + (record.Amount || 0), 0);

        res.json({
            data: combinedData,
            totals: {
                totalPaidAmount,
                totalBudget,
                totalVoucharAmount
            },
            success: true,
            message: 'Data fetched successfully'
        });
    } catch (err) {
        res.status(500).send(err.message);
    }
};

const staffDetials = async (req, res) => {
    try {
        let pool = await sql.connect(config);
        let result = await pool.request()
            .query('SELECT * FROM stafdetails');
        res.json({
            data: result.recordset,
            count: result.recordset.length,
            success: true,
            message: 'Data fetched successfully'
        });
    } catch (err) {
        res.status(500).send(err.message);
    }
}
// const staffDetials = async (req, res) => {
//     try {
//         let pool = await sql.connect(config);

//         // Query to get all staff details
//         let result = await pool.request().query('SELECT * FROM stafdetails');

//         // Query to find the maximum BasicSalary
//         let maxSalaryResult = await pool.request().query('SELECT MAX(BasicSalary) AS MaxBasicSalary FROM stafdetails');

//         // Extract the maximum BasicSalary
//         let maxBasicSalary = maxSalaryResult.recordset[0].MaxBasicSalary;

//         res.json({
//             data: result.recordset,
//             count: result.recordset.length,
//             maxBasicSalary: maxBasicSalary,
//             success: true,
//             message: 'Data fetched successfully'
//         });
//     } catch (err) {
//         res.status(500).send(err.message);
//     }
// };


// get the staff details by id
const getStaffDetailsById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({
                success: false,
                message: 'id is required'
            });
        }

        let pool = await sql.connect(config);
        let result = await pool.request()
            .input('id', sql.Int, id)
            .query('SELECT * FROM stafdetails WHERE StaffID = @id');
        res.json({
            data: result.recordset,
            count: result.recordset.length,
            success: true,
            message: 'Data fetched successfully'
        });
    } catch (err) {
        res.status(500).send(err.message);
    }
}

const domNotifications = async (req, res) => {
    try {
        let pool = await sql.connect(config);
        let result = await pool.request()
            .query('SELECT * FROM DOMNotification');
        res.json({
            data: result.recordset,
            count: result.recordset.length,
            success: true,
            message: 'Data fetched successfully'
        });
    } catch (err) {
        res.status(500).send(err.message);
    }
}

const notificationsFilePath = path.join(__dirname, 'notifications.json');

// Ensure notifications file exists and is an array
const initializeNotificationsFile = () => {
    if (!fs.existsSync(notificationsFilePath)) {
        fs.writeFileSync(notificationsFilePath, JSON.stringify([]));
    }
};

// Function to store notifications in JSON file
const sendNotifications = async (recipients, notification) => {
    initializeNotificationsFile();

    try {
        // Read the existing notifications
        let notifications = JSON.parse(fs.readFileSync(notificationsFilePath, 'utf8'));

        // Create a new notification entry
        const newNotifications = recipients.map(recipient => ({
            recipient,
            clientId: notification.clientId,
            designerId: notification.designerId,
            campaignId: notification.postId,
            campaignName: notification.campaignName,
            keyManagerId: notification.keyManagerId,
            subject: notification.subject,
            message: notification.message,
            timestamp: new Date().toISOString()
        }));

        // Append new notifications to the existing ones
        notifications = notifications.concat(newNotifications);

        // Write the updated notifications back to the file
        fs.writeFileSync(notificationsFilePath, JSON.stringify(notifications, null, 2));

        // Save notifications to the SQL table
        let pool = await sql.connect(config);
        for (const notification of newNotifications) {
            await pool.request()
                .input('recipient', sql.VarChar, notification.recipient)
                .input('clientId', sql.Int, notification.clientId)
                .input('designerId', sql.Int, notification.designerId)
                .input('campaignId', sql.Int, notification.campaignId)
                .input('campaignName', sql.VarChar, notification.campaignName)
                .input('keyManagerId', sql.Int, notification.keyManagerId)
                .input('subject', sql.VarChar, notification.subject)
                .input('message', sql.VarChar, notification.message)
                .input('timestamp', sql.DateTime, notification.timestamp)
                .query('INSERT INTO DOMNotification (recipient, clientId, designerId, campaignId, campaignName, keyManagerId, subject, message, timestamp) VALUES (@recipient, @clientId, @designerId, @campaignId, @campaignName, @keyManagerId, @subject, @message, @timestamp)');
        }

        console.log('Notifications saved successfully');
    } catch (error) {
        console.error('Error saving notifications:', error.message);
    }
};

// Example usage in the postApprovedByClient function
const postApprovedByClient = async (req, res) => {
    try {
        const { clientId, socialAccount, postId, campaignName } = req.body;

        // Check if all required fields are provided
        if (!clientId || !socialAccount || !postId || !campaignName) {
            return res.status(400).json({
                success: false,
                message: 'clientId, socialAccount, postId, and campaignName are required'
            });
        }

        // Establish SQL connection
        let pool = await sql.connect(config);

        // Get Key Manager and Designer IDs from ClientEnrollment
        let staffResult = await pool.request()
            .input('clientId', sql.Int, clientId)
            .input('socialAccount', sql.VarChar, socialAccount)
            .query('SELECT KeyManager, Designer FROM ClientEnrollment WHERE ClientId = @clientId AND SocialAccount = @socialAccount');

        if (staffResult.recordset.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Client enrollment not found for the given clientId and socialAccount'
            });
        }

        let { Designer, KeyManager } = staffResult.recordset[0];

        // Check the current status of the post
        let postResult = await pool.request()
            .input('clientId', sql.Int, clientId)
            .input('socialAccount', sql.VarChar, socialAccount)
            .input('postId', sql.Int, postId)
            .query('SELECT UploadedFileStatus FROM IdeaUploader WHERE ClientId = @clientId AND SocialAccount = @socialAccount AND Id = @postId');

        if (postResult.recordset.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Post not found'
            });
        }

        let currentStatus = postResult.recordset[0].UploadedFileStatus;

        // Check if the status is null or not 'Done'
        if (currentStatus === null || currentStatus === 'Pending') {
            // Update the status to 'Done'
            await pool.request()
                .input('clientId', sql.Int, clientId)
                .input('socialAccount', sql.VarChar, socialAccount)
                .input('postId', sql.Int, postId)
                .input('uploadedFileStatus', sql.VarChar, 'Done')
                .query('UPDATE IdeaUploader SET UploadedFileStatus = @uploadedFileStatus WHERE ClientId = @clientId AND SocialAccount = @socialAccount AND Id = @postId');

            // Send notifications to KeyManager and Designer
            const notificationRecipients = [KeyManager, Designer];
            await sendNotifications(notificationRecipients, {
                clientId: clientId,
                postId: postId,
                designerId: Designer,
                keyManagerId: KeyManager,
                subject: 'Post Approved',
                message: `Campaign '${campaignName}' with Social Account '${socialAccount}' has been approved and the status updated to 'Done'.`
            });

            return res.status(200).json({
                success: true,
                message: 'Post status updated to Done successfully and notifications sent'
            });
        } else {
            return res.status(400).json({
                success: false,
                message: 'Post is already updated or is not in a valid state for updating'
            });
        }

    } catch (err) {
        console.error('Error updating post:', err); // Log the error for debugging purposes
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
}
const postRejectedByClient = async (req, res) => {
    try {
        const { clientId, socialAccount, postId, campaignName, rejectReason } = req.body;
        console.log(clientId, socialAccount, postId, campaignName, rejectReason);

        if (!clientId || !socialAccount || !postId || !campaignName || !rejectReason) {
            return res.status(400).json({
                success: false,
                message: 'clientId, socialAccount, and postId are required'
            });
        }

        let pool = await sql.connect(config);

        // First, get Key Manager and Designer IDs
        let staffResult = await pool.request()
            .input('clientId', sql.Int, clientId)
            .input('socialAccount', sql.VarChar, socialAccount)
            .query('SELECT KeyManager, Designer FROM ClientEnrollment WHERE ClientId = @clientId AND SocialAccount = @socialAccount');

        if (staffResult.recordset.length > 0) {
            let { Designer, KeyManager } = staffResult.recordset[0];

            // First, check the current status of the post
            let postResult = await pool.request()
                .input('clientId', sql.Int, clientId)
                .input('socialAccount', sql.VarChar, socialAccount)
                .input('postId', sql.Int, postId)
                .query('SELECT UploadedFileStatus FROM IdeaUploader WHERE ClientId = @clientId AND SocialAccount = @socialAccount AND Id = @postId');

            if (postResult.recordset.length > 0) {
                let currentStatus = postResult.recordset[0].UploadedFileStatus;

                if (currentStatus === null) {
                    // Update the status to 'Done'
                    await pool.request()
                        .input('clientId', sql.Int, clientId)
                        .input('socialAccount', sql.VarChar, socialAccount)
                        .input('postId', sql.Int, postId)
                        .input('uploadedFileStatus', sql.VarChar, 'rejected')
                        .input('clientrejectionpost', sql.VarChar, rejectReason)
                        .query('UPDATE IdeaUploader SET UploadedFileStatus = @uploadedFileStatus, clientrejectionpost = @clientrejectionpost WHERE ClientId = @clientId AND SocialAccount = @socialAccount AND Id = @postId');

                    // Send notifications
                    const notificationRecipients = [KeyManager, Designer];
                    await sendNotifications(notificationRecipients, {
                        clientId: clientId,
                        postId: postId,
                        designerId: Designer,
                        keyManagerId: KeyManager,
                        subject: 'Post Approved',
                        message: `Campaign '${campaignName}' with Social Account '${socialAccount}' has been rejected and status updated to 'rejected'.`
                    });

                    return res.status(200).json({
                        success: true,
                        message: 'Post status updated to Done successfully and notifications saved'
                    });
                } else {
                    return res.status(400).json({
                        success: false,
                        message: 'Post has already been updated or is not in a valid state for updating'
                    });
                }
            } else {
                return res.status(400).json({
                    success: false,
                    message: 'Post not found'
                });
            }
        } else {
            return res.status(400).json({
                success: false,
                message: 'Client enrollment not found'
            });
        }

    } catch (err) {
        console.log(err);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};


const postCorrectedByClient = async (req, res) => {
    try {
        const { clientId, socialAccount, postId, campaignName, correctionReason } = req.body;
        console.log(clientId, socialAccount, postId, campaignName, correctionReason);

        if (!clientId || !socialAccount || !postId || !campaignName || !correctionReason) {
            return res.status(400).json({
                success: false,
                message: 'clientId, socialAccount, postId, campaignName, and correctionReason are required'
            });
        }

        let pool = await sql.connect(config);

        // First, get Key Manager and Designer IDs
        let staffResult = await pool.request()
            .input('clientId', sql.Int, clientId)
            .input('socialAccount', sql.VarChar, socialAccount)
            .query('SELECT KeyManager, Designer FROM ClientEnrollment WHERE ClientId = @clientId AND SocialAccount = @socialAccount');

        if (staffResult.recordset.length > 0) {
            let { Designer, KeyManager } = staffResult.recordset[0];

            // First, check the current status of the post
            let postResult = await pool.request()
                .input('clientId', sql.Int, clientId)
                .input('socialAccount', sql.VarChar, socialAccount)
                .input('postId', sql.Int, postId)
                .query('SELECT UploadedFileStatus FROM IdeaUploader WHERE ClientId = @clientId AND SocialAccount = @socialAccount AND Id = @postId');

            if (postResult.recordset.length > 0) {
                let currentStatus = postResult.recordset[0].UploadedFileStatus;

                if (currentStatus === 'Done' || currentStatus === 'Rejected') {
                    // Update the status to 'Corrected'
                    await pool.request()
                        .input('clientId', sql.Int, clientId)
                        .input('socialAccount', sql.VarChar, socialAccount)
                        .input('postId', sql.Int, postId)
                        .input('uploadedFileStatus', sql.VarChar, 'correction')
                        .input('correctionReason', sql.VarChar, correctionReason)
                        .query('UPDATE IdeaUploader SET UploadedFileStatus = @uploadedFileStatus, clientcorrectionpost = @correctionReason WHERE ClientId = @clientId AND SocialAccount = @socialAccount AND Id = @postId');

                    // Send notifications
                    const notificationRecipients = [KeyManager, Designer];
                    await sendNotifications(notificationRecipients, {
                        clientId: clientId,
                        postId: postId,
                        designerId: Designer,
                        keyManagerId: KeyManager,
                        campaignName: campaignName,
                        subject: 'Post Correction',
                        message: `Campaign '${campaignName}' with Social Account '${socialAccount}' has been corrected. Reason for correction: '${correctionReason}'.`
                    });

                    return res.status(200).json({
                        success: true,
                        message: 'Post status updated to Corrected successfully and notifications saved'
                    });
                } else {
                    return res.status(400).json({
                        success: false,
                        message: 'Post has not been completed or is not in a valid state for correction'
                    });
                }
            } else {
                return res.status(400).json({
                    success: false,
                    message: 'Post not found'
                });
            }
        } else {
            return res.status(400).json({
                success: false,
                message: 'Client enrollment not found'
            });
        }

    } catch (err) {
        console.log(err);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};


// Ensure notifications file exists on server start
// initializeNotificationsFile();

// async function listTables() {
//     try {
//         // Connect to the database
//         let pool = await sql.connect(config);

//         // Query to list all tables
//         let result = await pool.request().query(`
//             SELECT 
//                 TABLE_SCHEMA, 
//                 TABLE_NAME 
//             FROM 
//                 INFORMATION_SCHEMA.TABLES
//             WHERE 
//                 TABLE_TYPE = 'BASE TABLE'
//             ORDER BY 
//                 TABLE_SCHEMA, TABLE_NAME;
//         `);

//         // Output the results
//         console.log('Tables in the database:');
//         result.recordset.forEach(row => {
//             console.log(`${row.TABLE_SCHEMA}.${row.TABLE_NAME}`);
//         });

//         // Close the database connection
//         await pool.close();
//     } catch (err) {
//         console.error('SQL error', err);
//     }
// }

// // Call the function
// listTables();



// get new staff details
const newStaffDetials = async (req, res) => {
    try {
        let pool = await sql.connect(config);
        let result = await pool.request()
            .query('SELECT * FROM StafDetailsNew');
        res.json({
            data: result.recordset,
            count: result.recordset.length,
            success: true,
            message: 'Data fetched successfully'
        });
    } catch (err) {
        res.status(500).send(err.message);
    }
}

const getClientInfoByClientId = async (req, res) => {
    try {
        let pool = await sql.connect(config);
        let result = await pool.request()
            .input('ClientID', sql.Int, req.params.clientId)
            .query('SELECT * FROM clientsRecord WHERE ClientID = @ClientID');
        res.json({
            data: result.recordset,
            count: result.recordset.length,
            success: true,
            message: 'Data fetched successfully'
        });
    } catch (err) {
        res.status(500).send(err.message);
    }
}

const getUserLoginDetails = async (req, res) => {
    try {
        let pool = await sql.connect(config);
        let result = await pool.request()
            .query('SELECT * FROM StafDetails');
        res.json({
            data: result.recordset,
            count: result.recordset.length,
            success: true,
            message: 'Data fetched successfully'
        });
    }
    catch (err) {
        res.status(500).send(err.message);
    }
}

// Download staff login details as a JSON file
const downloadStaffLoginDetails = async (req, res) => {
    try {
        let pool = await sql.connect(config);
        let result = await pool.request()
            .query('SELECT * FROM LoginDetails');

        // Convert result to JSON
        const jsonData = JSON.stringify(result.recordset, null, 2); // Pretty print JSON

        // Define file path and name
        const filePath = path.join(__dirname, 'staffLoginDetails.json');

        // Write the JSON data to a file
        fs.writeFileSync(filePath, jsonData);

        // Set the content type and trigger download
        res.download(filePath, 'staffLoginDetails.json', (err) => {
            if (err) {
                console.error('Error downloading file:', err);
                res.status(500).send('Could not download the file');
            }

            // Optionally, you can delete the file after sending
            fs.unlinkSync(filePath); // Clean up the file
        });

    } catch (error) {
        console.error('Error fetching staff login details:', error);
        res.status(500).send('Internal Server Error');
    }
};

// get budget details with social account
const getBudgetDetails = async (req, res) => {
    try {
        let pool = await sql.connect(config);
        let result = await pool.request()
            .input('SocialAccount', sql.VarChar, req.params.socialAccount)
            .query(`
                SELECT * 
                FROM AddMonthlyAmount 
                WHERE SocialAccount = @SocialAccount 
            `);  // Replace 'SomeDateColumn' with the actual column that holds the date for each record
        res.json({
            data: result.recordset,
            count: result.recordset.length,
            success: true,
            message: 'Data fetched successfully'
        });
    } catch (err) {
        res.status(500).send(err.message);
    }
};


const writeNotificationsToFile = (notifications) => {
    const filePath = path.join(__dirname, '../notifications.json');
    fs.writeFileSync(filePath, JSON.stringify(notifications, null, 2), 'utf8');
};

// Helper function to read notifications from the JSON file
const readNotificationsFromFile = () => {
    if (fs.existsSync(filePath)) {
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
    return [];
};

// Helper function to get the next month's name
const getNextMonthName = () => {
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return monthNames[nextMonth.getMonth()];
};

// Function to get festival notifications and send them to all active members
const getFestivalNotifications = async (req, res) => {
    try {
        // Connect to SQL Server
        let pool = await sql.connect(config);

        // Get the first and last days of the next month
        const nextMonthStart = new Date();
        nextMonthStart.setMonth(nextMonthStart.getMonth() + 1);
        nextMonthStart.setDate(1);  // Set to the first day of the next month

        const nextMonthEnd = new Date(nextMonthStart);
        nextMonthEnd.setMonth(nextMonthEnd.getMonth() + 1);
        nextMonthEnd.setDate(0);  // Set to the last day of the next month

        // Get the next month name
        const nextMonthName = getNextMonthName();

        // Query to get active members
        let memberResult = await pool.request()
            .query(`
                SELECT ClientID, SocialAccount 
                FROM clientenrollment 
                WHERE Status = 'Active' 
                ORDER BY SocialAccount ASC
            `);

        const clients = memberResult.recordset;  // List of active members

        // Execute the SQL query to get festivals between the first and last day of the next month
        let festivalResult = await pool.request()
            .input('startDate', sql.Date, nextMonthStart)
            .input('endDate', sql.Date, nextMonthEnd)
            .query(`
                SELECT FesName, FesDate 
                FROM AddFestival 
                WHERE FesDate >= @startDate AND FesDate <= @endDate
            `);

        const festivals = festivalResult.recordset;  // List of upcoming festivals in the next month

        // Custom function to recommend festivals based on specific criteria (e.g., type, date proximity)
        const recommendFestivals = (festivals) => {
            return festivals.filter(festival => {
                // Example criteria: recommend festivals happening in the first half of the next month
                const festivalDate = new Date(festival.FesDate);
                return festivalDate.getDate() <= 15; // Example: Only recommend festivals within the first 15 days
            });
        };

        // Get recommended festivals using the custom function
        const recommendedFestivals = recommendFestivals(festivals);

        // Process the results into notifications for each active member
        const notifications = clients.map(client => ({
            clientID: client.ClientID,
            socialAccount: client.SocialAccount,
            message: `Select your ${nextMonthName} festive creation!`,
            festivalType: 'Festival',
            festivals: festivals.map(festival => ({
                festivalName: festival.FesName,
                festivalDate: festival.FesDate,
            })),
            recommendations: recommendedFestivals.map(festival => ({
                festivalName: festival.FesName,
                festivalDate: festival.FesDate,
            })),
        }));

        // Store the notifications in a JSON file
        writeNotificationsToFile(notifications);

        // Send the response
        res.json({
            message: 'Festival notifications generated and sent to active members successfully',
            notifications: notifications,

            success: true,
            count: notifications.length
        });

        // Close SQL Server connection
        await sql.close();
    } catch (error) {
        console.error('Error fetching festival notifications:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// get the next month's festivals list from notifications.json base on SocialAccount
// const getNextMonthFestivalsBasedOnSocialAccount = async (req, res) => {
//     try {
//         const filePath = path.join(__dirname, '../notifications.json');
//         const notifications = JSON.parse(fs.readFileSync(filePath, 'utf8'));
//         const nextMonthName = getNextMonthName();
//         const nextMonthFestivals = notifications.filter(notification => notification.socialAccount === req.params.socialAccount && notification.message.includes(nextMonthName));
//         res.json({ data: nextMonthFestivals || [], count: nextMonthFestivals.length, success: true, message: 'Data fetched successfully' });
//     } catch (err) {
//         res.status(500).send(err.message);
//     }
// }

const getNextMonthFestivalsBasedOnSocialAccount = async (req, res) => {
    try {
        const filePath = path.join(__dirname, '../notifications.json');

        // Check if file exists before reading
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ success: false, message: 'Notifications file not found' });
        }

        // Read and parse the JSON file
        const notificationsData = fs.readFileSync(filePath, 'utf8');

        // Check if notificationsData is not empty or null
        if (!notificationsData) {
            return res.status(500).json({ success: false, message: 'Failed to read notifications data' });
        }

        // Parse the notifications JSON
        let notifications;
        try {
            notifications = JSON.parse(notificationsData);
        } catch (parseError) {
            return res.status(500).json({ success: false, message: 'Failed to parse JSON data', error: parseError.message });
        }

        // Get the next month's name to filter notifications
        const nextMonthName = getNextMonthName();

        // Filter notifications based on the socialAccount and message containing the next month name
        const nextMonthFestivals = notifications.filter(
            (notification) => notification.socialAccount === req.params.socialAccount && notification.message.includes(nextMonthName)
        );

        // Send the filtered data in the response
        res.json({
            data: nextMonthFestivals,
            count: nextMonthFestivals.length,
            success: true,
            message: 'Data fetched successfully',
        });
    } catch (err) {
        // Send a detailed error response in JSON format
        res.status(500).json({ success: false, message: 'An error occurred while fetching the festivals', error: err.message });
    }
};

const selectedFestivalsFilePath = path.join(__dirname, 'selectedFestivals.json');

// Helper function to write data to a JSON file
const writeDataToFile = (filePath, data) => {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
};

// Helper function to read data from a JSON file and handle empty or invalid JSON
const readDataFromFile = (filePath) => {
    try {
        if (fs.existsSync(filePath)) {
            const fileContent = fs.readFileSync(filePath, 'utf8');
            // Return an empty array if file content is empty
            if (fileContent.trim() === '') {
                return [];
            }
            return JSON.parse(fileContent);
        }
        return [];
    } catch (error) {
        console.error(`Error reading file ${filePath}:`, error.message);
        return [];
    }
};

const storeSelectedFestivalAndRemoveFromNotifications = (req, res) => {
    try {
        const { clientID, socialAccount, message, festivalType, festivals, recommendations } = req.body;

        if (!socialAccount) {
            return res.status(400).json({ success: false, message: 'SocialAccount is required' });
        }

        // Read existing notifications and selected festivals from the files
        const notificationsFilePath = path.join(__dirname, '../notifications.json');
        const notifications = readDataFromFile(notificationsFilePath);
        const selectedFestivals = readDataFromFile(selectedFestivalsFilePath);

        // Create the new selected festival object
        const newSelectedFestival = {
            clientID,
            socialAccount,
            message,
            festivalType,
            festivals: festivals.map(festival => ({
                festivalName: festival.festivalName,
                festivalDate: festival.festivalDate,
                selected: festival.selected || false,
                options: festival.options || { post: false, reel: false, cover: false }
            })),
            recommendations: recommendations.map(recommendation => ({
                festivalName: recommendation.name,
                festivalDate: recommendation.date,
            }))
        };

        // Add the new selected festival to the array
        selectedFestivals.push(newSelectedFestival);

        // Write the updated selected festivals to the file
        writeDataToFile(selectedFestivalsFilePath, selectedFestivals);

        // Remove the corresponding notifications from notifications.json
        const updatedNotifications = notifications.filter(notification => notification.socialAccount !== socialAccount);

        // Write the updated notifications back to the file
        writeDataToFile(notificationsFilePath, updatedNotifications);

        res.json({
            success: true,
            message: 'Selected festival stored successfully and notifications removed',
            data: newSelectedFestival,
            remainingNotifications: updatedNotifications,
        });
    } catch (error) {
        console.error('Error storing selected festivals and removing from notifications:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};
// Function to get selected festivals based on SocialAccount and update SQL table
const getSelectedFestivalsBasedOnSocialAccount = async (req, res) => {
    try {
        // Define the file path for selectedFestivals.json
        const selectedFestivalsFilePath = path.join(__dirname, 'selectedFestivals.json');

        // Read the JSON file
        const rawData = fs.readFileSync(selectedFestivalsFilePath);
        const festivalsData = JSON.parse(rawData);

        // Extract data from the JSON based on SocialAccount
        const socialAccount = req.params.socialAccount;
        const filteredData = festivalsData.filter(item => item.socialAccount === socialAccount);

        if (filteredData.length === 0) {
            return res.status(404).send('No festivals found for the given SocialAccount.');
        }

        // Connect to SQL server
        const pool = await sql.connect(config);

        // Iterate through filtered data and update SQL table
        for (const item of filteredData) {
            for (const festival of item.festivals) {
                if (festival.selected) {
                    const clientID = item.clientID;
                    const message = item.message;
                    const festivalType = item.festivalType;
                    const selected = festival.selected ? 1 : 0;
                    const post = festival.options.post ? 1 : 0;
                    const reel = festival.options.reel ? 1 : 0;
                    const cover = festival.options.cover ? 1 : 0;

                    // Create a unique festivalName based on a timestamp as placeholder since the original JSON has no names
                    const festivalName = item.festivalName || new Date().toISOString();

                    // Prepare and execute the SQL query to insert data
                    let result = await pool.request()
                        .input('clientID', sql.Int, clientID)
                        .input('socialAccount', sql.VarChar, socialAccount)
                        .input('message', sql.VarChar, message)
                        .input('festivalType', sql.VarChar, festivalType)
                        .input('festivalName', sql.VarChar, festivalName)
                        .input('festivalDate', sql.Date, new Date()) // Placeholder for actual date if available
                        .input('selected', sql.Bit, selected)
                        .input('post', sql.Bit, post)
                        .input('reel', sql.Bit, reel)
                        .input('cover', sql.Bit, cover)
                        .query(`
                INSERT INTO SelectedFestivals (
                  clientID, socialAccount, message, festivalType, festivalName, festivalDate, selected, post, reel, cover
                ) VALUES (
                  @clientID, @socialAccount, @message, @festivalType, @festivalName, @festivalDate, @selected, @post, @reel, @cover
                )
              `);

                    console.log(`Festival ${festivalName} inserted successfully for social account ${socialAccount}`);
                }
            }
        }

        res.send({
            success: true,
            message: 'Selected festivals updated successfully',
            data: filteredData,
        });
    } catch (error) {
        console.error('Error while updating selected festivals:', error);
        res.status(500).send('Internal Server Error');
    } finally {
        // Close SQL connection
        sql.close();
    }
};

// get selected festivals based on SocialAccount from sql database
const getSelectedFestivals = async (req, res) => {
    try {
        // Connect to SQL server
        const pool = await sql.connect(config);

        // Get selected festivals based on SocialAccount
        const socialAccount = req.params.socialAccount;
        const result = await pool.request()
            .input('socialAccount', sql.VarChar, socialAccount)
            .query('SELECT * FROM SelectedFestivals WHERE socialAccount = @socialAccount');

        res.json(result.recordset);
    } catch (error) {
        console.error('Error while fetching selected festivals:', error);
        res.status(500).send('Internal Server Error');
    }
};

// 

//  const festivals = JSON.parse(fs.readFileSync('festivals.json', 'utf8'));

// const getCurrentMonthFestivals = async (req, res) => {
//     try {
//         let pool = await sql.connect(config);

//         // Get current date
//         const now = new Date();
//         const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
//         const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

//         // Format dates to SQL format (YYYY-MM-DD)
//         const startDate = startOfMonth.toISOString().split('T')[0];
//         const endDate = endOfMonth.toISOString().split('T')[0];

//         // SQL query to fetch data for the current month
//         let result = await pool.request()
//             .input('startDate', sql.Date, startDate)
//             .input('endDate', sql.Date, endDate)
//             .query('SELECT * FROM AddFestival WHERE FesDate >= @startDate AND FesDate <= @endDate');

//         res.json({
//             data: result.recordset,
//             count: result.recordset.length,
//             success: true,
//             message: 'Data fetched successfully'
//         });
//     } catch (err) {
//         res.status(500).send(err.message);
//     }
// };

const getCurrentMonthFestivals = async (req, res) => {
    try {
        let pool = await sql.connect(config);

        // Get current date
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        // Format dates to SQL format (YYYY-MM-DD)
        const formatDate = (date) => {
            const year = date.getFullYear();
            const month = (date.getMonth() + 1).toString().padStart(2, '0');
            const day = date.getDate().toString().padStart(2, '0');
            return `${year}-${month}-${day}`;
        };

        const startDate = formatDate(startOfMonth);
        const endDate = formatDate(endOfMonth);

        console.log('Start Date:', startDate);
        console.log('End Date:', endDate);

        // SQL query to fetch data for the current month
        let result = await pool.request()
            .input('startDate', sql.Date, startDate)
            .input('endDate', sql.Date, endDate)
            .query('SELECT * FROM AddFestival WHERE FesDate >= @startDate AND FesDate <= @endDate');

        res.json({
            data: result.recordset,
            count: result.recordset.length,
            success: true,
            message: 'Data fetched successfully'
        });
    } catch (err) {
        res.status(500).send(err.message);
    }
};


// Configure your email transporter
const transporter = nodemailer.createTransport({
    service: 'gmail', // Replace with your email service
    auth: {
        user: 'sachingautam6239@gmail.com', // Replace with your email
        pass: 'nxajuvwkblihqind' // Replace with your email password
    }
});

// Function to send email
const sendEmail = (recipient, subject, htmlContent) => {
    console.log('Sending email to:', recipient);
    const mailOptions = {
        from: 'sachingautam6239@gmail.com', // Replace with your email
        to: recipient,
        subject: subject,
        html: htmlContent
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.log('Error sending email:', error);
        } else {
            console.log('Email sent:', info.response);
        }
    });
};

// Function to handle updating festival data
const updateFestivalData = async (req, res) => {
    try {
        let pool = await sql.connect(config);

        const { festivals } = req.body; // Expect an array of festivals with updated data

        // Example SQL query to update the festival data
        for (const festival of festivals) {
            await pool.request()
                .input('id', sql.Int, festival.id)
                .input('post', sql.Bit, festival.post)
                .input('video', sql.Bit, festival.video)
                .input('cover', sql.Bit, festival.cover)
                .query('UPDATE AddFestival SET Post = @post, Video = @video, Cover = @cover WHERE Id = @id');
        }

        res.json({
            success: true,
            message: 'Festival data updated successfully'
        });
    } catch (err) {
        res.status(500).send(err.message);
    }
};

// Function to handle sending the festival data email
const sendFestivalEmail = async (req, res) => {
    try {
        let pool = await sql.connect(config);

        // Get current date
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        // Format dates to SQL format (YYYY-MM-DD)
        const formatDate = (date) => {
            const year = date.getFullYear();
            const month = (date.getMonth() + 1).toString().padStart(2, '0');
            const day = date.getDate().toString().padStart(2, '0');
            return `${year}-${month}-${day}`;
        };

        const startDate = formatDate(startOfMonth);
        const endDate = formatDate(endOfMonth);

        // SQL query to fetch data for the current month
        let result = await pool.request()
            .input('startDate', sql.Date, startDate)
            .input('endDate', sql.Date, endDate)
            .query('SELECT * FROM AddFestival WHERE FesDate >= @startDate AND FesDate <= @endDate');

        const festivals = result.recordset;
        console.log(festivals);
        // Generate email content
        const emailContent = `
            <h2>Select Festivals</h2>
            <p>${now.toLocaleString('default', { month: 'long' })} ${now.getFullYear()}</p>
            <table>
                <thead>
                    <tr>
                        <th>Festival</th>
                        <th>Post</th>
                        <th>Video</th>
                        <th>Cover</th>
                    </tr>
                </thead>
                <tbody>
                    ${festivals.map(festival => `
                        <tr>
                            <td>${festival.FesName}</td>
                            <td><input type="checkbox" ${festival.post ? 'checked' : ''}></td>
                            <td><input type="checkbox" ${festival.video ? 'checked' : ''}></td>
                            <td><input type="checkbox" ${festival.cover ? 'checked' : ''}></td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            <p>Are you sure you want to continue with your choices?</p>
            <button>UPDATE</button>
        `;

        // Send email
        const recipient = 'sachin.pitamaasweb@gmail.com'; // Replace with actual recipient email
        const subject = `Festivals for ${now.toLocaleString('default', { month: 'long' })} ${now.getFullYear()}`;
        sendEmail(recipient, subject, emailContent);

        res.json({
            success: true,
            message: 'Email sent successfully'
        });
    } catch (err) {
        res.status(500).send(err.message);
    }
};

// Helper function to get the name of the next month
// const getNextMonthName = () => {
//     const now = new Date();
//     const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1);
//     return nextMonth.toLocaleString('default', { month: 'long' });
// };

const getNextMonthFestivals = async (req, res) => {
    try {
        let pool = await sql.connect(config);

        // Get the first and last days of the next month
        const nextMonthStart = new Date();
        nextMonthStart.setMonth(nextMonthStart.getMonth() + 1);
        nextMonthStart.setDate(1);  // Set to first day of next month
        nextMonthStart.setHours(0, 0, 0, 0); // Set time to midnight

        const nextMonthEnd = new Date(nextMonthStart);
        nextMonthEnd.setMonth(nextMonthEnd.getMonth() + 1);
        nextMonthEnd.setDate(0);  // Set to last day of next month
        nextMonthEnd.setHours(23, 59, 59, 999); // Set time to end of the day

        // Get the next month name
        const nextMonthName = getNextMonthName();

        // SQL query to fetch next month's festivals
        const nextMonthFestivalsResult = await pool.request()
            .input('startDate', sql.DateTime, nextMonthStart)
            .input('endDate', sql.DateTime, nextMonthEnd)
            .query('SELECT * FROM AddFestival WHERE FesDate >= @startDate AND FesDate <= @endDate');

        const nextMonthFestivals = nextMonthFestivalsResult.recordset;

        // SQL query to fetch recommended festivals based on popularity
        const recommendedFestivalsResult = await pool.request()
            .query('SELECT TOP 5 * FROM AddFestival ORDER BY Popularity DESC'); // Assuming 'Popularity' is a column

        const recommendedFestivals = recommendedFestivalsResult.recordset;

        // SQL query to fetch all upcoming festivals after the next month
        const allUpcomingFestivalsResult = await pool.request()
            .input('nextMonthEnd', sql.DateTime, nextMonthEnd)
            .query('SELECT * FROM AddFestival WHERE FesDate > @nextMonthEnd');

        const allUpcomingFestivals = allUpcomingFestivalsResult.recordset;

        // Return the fetched festivals
        res.json({
            nextMonthFestivals: {
                data: nextMonthFestivals,
                count: nextMonthFestivals.length,
                message: `${nextMonthName} festivals fetched successfully`
            },
            recommendedFestivals: {
                data: recommendedFestivals,
                count: recommendedFestivals.length,
                message: 'Recommended festivals based on popularity fetched successfully'
            },
            allUpcomingFestivals: {
                data: allUpcomingFestivals,
                count: allUpcomingFestivals.length,
                message: 'All upcoming festivals fetched successfully'
            },
            success: true
        });

    } catch (err) {
        // Error handling
        res.status(500).json({
            success: false,
            message: 'Server error: ' + err.message
        });
    }
};

// const getPostApprovedByClient = async (req, res) => {
//     try {
//         let pool = await sql.connect(config);
//         let result = await pool.request()
//             .input('socialAccount', sql.VarChar(50), req.params.socialAccount)
//             .query(`
//                 SELECT * 
//                 FROM IdeaUploader 
//                 WHERE SocialAccount = @socialAccount
//                 AND UploadedFileStatus = 'Done'
//                 AND YEAR(UploadedDate) = YEAR(GETDATE()) -- This year
//                 AND MONTH(UploadedDate) = MONTH(GETDATE()) - 1 -- Previous month
//             `);

//         // If records are found, send them back with a success message
//         if (result.recordset.length > 0) {
//             res.json({
//                 data: result.recordset,
//                 count: result.recordset.length,
//                 success: true,
//                 message: "Data fetched successfully"
//             });
//         } else {
//             // If no records are found, return a message indicating that
//             res.json({
//                 data: [],
//                 count: 0,
//                 success: true,
//                 message: "No records found for the given social account and status"
//             });
//         }
//     } catch (err) {
//         // Handle any errors that may occur during the process
//         res.status(500).send({ message: err.message, success: false });
//     }
// };


const getPostApprovedByClient = async (req, res) => {
    try {
        let { socialAccount } = req.params;
        let { month } = req.query; // Accept month from query parameters
        let selectedYear, selectedMonth;

        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();

        // Check if the month is provided and valid, else default to the current month
        if (month && month >= 1 && month <= 12) {
            selectedMonth = month;
            selectedYear = currentYear;
        } else {
            selectedMonth = currentDate.getMonth() + 1; // JavaScript months are 0-indexed
            selectedYear = currentYear;
        }

        // Ensure that the month is always 2 digits (e.g., '05' for May)
        const formattedMonth = selectedMonth.toString().padStart(2, '0');

        // Formatted date for filtering (e.g., '2024-05')
        const formattedDate = `${selectedYear}-${formattedMonth}`;

        let pool = await sql.connect(config);
        let result = await pool.request()
            .input('socialAccount', sql.VarChar(50), socialAccount)
            .input('selectedYear', sql.Int, selectedYear)
            .input('formattedMonth', sql.Int, formattedMonth)
            .query(`
                SELECT * 
                FROM IdeaUploader 
                WHERE SocialAccount = @socialAccount
                AND UploadedFileStatus = 'Done'
                AND YEAR(finalBroadcast) = @selectedYear -- Filter by the selected year
                AND MONTH(finalBroadcast) = @formattedMonth -- Filter by the selected month
            `);

        console.log(result);

        // If records are found, send them back with a success message
        if (result.recordset.length > 0) {
            res.json({
                data: result.recordset,
                count: result.recordset.length,
                success: true,
                message: "Data fetched successfully"
            });
        } else {
            // If no records are found, return a message indicating that
            res.json({
                data: [],
                count: 0,
                success: true,
                message: "No records found for the given social account and status"
            });
        }
    } catch (err) {
        // Handle any errors that may occur during the process
        res.status(500).send({ message: err.message, success: false });
    }
};

// // Function to read, filter, and save the filtered JSON data
// function filterAndSaveJson(inputFile, outputFile) {
//   // Read the JSON file
//   fs.readFile(inputFile, 'utf8', (err, data) => {
//     if (err) {
//       console.error('Error reading file:', err);
//       return;
//     }

//     // Parse the JSON data
//     const jsonData = JSON.parse(data);

//     // Filter the data by unique date
//     const uniqueEvents = [];
//     const dates = new Set();

//     jsonData.forEach(event => {
//       // If the date is not in the set, add it and push the event to the uniqueEvents array
//       if (!dates.has(event.date)) {
//         dates.add(event.date);
//         uniqueEvents.push(event);
//       }
//     });

//     // Write the filtered data to a new JSON file
//     fs.writeFile(outputFile, JSON.stringify(uniqueEvents, null, 2), 'utf8', (err) => {
//       if (err) {
//         console.error('Error writing file:', err);
//       } else {
//         console.log(`Filtered data has been saved to ${outputFile}`);
//       }
//     });
//   });
// }

// // File paths (input and output)
// const inputFile = 'events.json'; // Path to your original data JSON file
// const outputFile = 'filtered_events.json'; // Path where the filtered data will be saved

// // Call the function
// filterAndSaveJson(inputFile, outputFile);



module.exports = {
    getClients,
    login,
    getNonRepeatedClients,
    getActiveClients,
    getDuplicateRecords,
    getUniqueRecords,
    getPostSchedular,
    getClientEnrollment,
    getIdeaUploader,
    getIdeaUploaderByClientId,
    getPlans,
    getPannsByPlanId,
    getClientEnrollmentByClientId,
    getIdeaUploaderByClientIdAndSocialAccount,
    getIdeaUploaderByClientIdAndSocialAccountAndPostId,
    getAddMonthlyAmount,
    getAddVouchar,
    getClientData,
    staffDetials,
    getStaffDetailsById,
    postApprovedByClient,
    domNotifications,
    postRejectedByClient,
    postCorrectedByClient,
    newStaffDetials,
    getClientInfoByClientId,
    getActiveClient,
    getCurrentMonthFestivals,
    sendFestivalEmail,
    updateFestivalData,
    getClientEnrollmentBySocialAccount,
    getPostApprovedByClient,
    getUserLoginDetails,
    getFestivalNotifications,
    getBudgetDetails,
    sendMessage,
    createChatMessagesTable,
    getChatMessages,
    getNextMonthFestivals,
    getNextMonthFestivalsBasedOnSocialAccount,
    storeSelectedFestivalAndRemoveFromNotifications,
    getSelectedFestivalsBasedOnSocialAccount,
    getSelectedFestivals,
    downloadStaffLoginDetails
};

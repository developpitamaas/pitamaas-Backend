// const sql = require('mssql');
// const config = require('../config/dbConfig');

// const getAds = async (req, res) => {
//     try {
//         const socialAccount = req.params.socialAccount;

//         // Validate socialAccount
//         if (!socialAccount) {
//             return res.status(400).json({
//                 success: false,
//                 message: 'SocialAccount is required in the URL parameters'
//             });
//         }

//         // Connect to the SQL database
//         const pool = await sql.connect(config);

//         // Fetch Addvouchar data
//         const addvoucharResult = await pool.request()
//             .input('socialAccount', sql.VarChar, socialAccount)
//             .query(`
//                 SELECT * 
//                 FROM Addvouchar 
//                 WHERE socialaccount = @socialAccount 
//                 ORDER BY id DESC
//             `);

//         let amount = addvoucharResult.recordset.length > 0 
//             ? addvoucharResult.recordset[0].Budget 
//             : null;

//         // If no budget found in Addvouchar, check AddMonthlyAmount
//         if (!amount || amount === '0') {
//             const currentMonth = new Date().getMonth() + 1;
//             const currentYear = new Date().getFullYear();

//             const addMonthlyAmountResult = await pool.request()
//                 .input('socialAccount', sql.VarChar, socialAccount)
//                 .input('currentMonth', sql.Int, currentMonth)
//                 .input('currentYear', sql.Int, currentYear)
//                 .query(`
//                     SELECT * 
//                     FROM AddMonthlyAmount 
//                     WHERE SocialAccount = @socialAccount 
//                     AND AmountMonth = @currentMonth 
//                     AND AmountYear = @currentYear
//                 `);

//             amount = addMonthlyAmountResult.recordset.length > 0 
//                 ? addMonthlyAmountResult.recordset[0].Budget 
//                 : '0';
//         }

//         // Fetch ClientEnrollment data
//         const clientEnrollmentResult = await pool.request()
//             .input('socialAccount', sql.VarChar, socialAccount)
//             .query(`
//                 SELECT * 
//                 FROM ClientEnrollment 
//                 WHERE socialaccount = @socialAccount
//             `);

//         // Send response
//         res.json({
//             success: true,
//             message: 'Data fetched successfully',
//             data: {
//                 socialAccount,
//                 addvoucharData: addvoucharResult.recordset,
//                 clientEnrollmentData: clientEnrollmentResult.recordset,
//                 currentMonthAmount: amount,
//             },
//             totalRecords: {
//                 addvoucharCount: addvoucharResult.recordset.length,
//                 clientEnrollmentCount: clientEnrollmentResult.recordset.length
//             }
//         });

//     } catch (error) {
//         console.error('Error querying database:', error);
//         res.status(500).json({
//             success: false,
//             message: 'An error occurred while fetching data',
//             error: error.message
//         });
//     }
// };

// module.exports = { getAds };


const sql = require('mssql');
const config = require('../config/dbConfig');

const getAds = async (req, res) => {
    try {
        const socialAccount = req.params.socialAccount; // Get socialAccount from URL params
        const filter = req.params.filter; // Get filter from URL params

        // Validate socialAccount
        if (!socialAccount) {
            return res.status(400).json({
                success: false,
                message: 'SocialAccount is required in the URL parameters'
            });
        }

        // Validate filter option
        const filterOptions = ['Current Month', 'Last 3 Months', 'Current Year', 'Last Year'];
        if (filter && !filterOptions.includes(filter)) {
            return res.status(400).json({
                success: false,
                message: `Invalid filter option. Allowed options are: ${filterOptions.join(', ')}`,
            });
        }

        // Date calculations for filtering
        const now = new Date();
        let startDate, endDate;

        if (filter === 'Current Month') {
            startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
            endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();
        } else if (filter === 'Last 3 Months') {
            const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1);
            startDate = threeMonthsAgo.toISOString();
            endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();
        } else if (filter === 'Current Year') {
            startDate = new Date(now.getFullYear(), 0, 1).toISOString();
            endDate = new Date(now.getFullYear(), 11, 31).toISOString();
        } else if (filter === 'Last Year') {
            startDate = new Date(now.getFullYear() - 1, 0, 1).toISOString();
            endDate = new Date(now.getFullYear() - 1, 11, 31).toISOString();
        }

        // Connect to the SQL database
        const pool = await sql.connect(config);

        // Fetch data from Addvouchar
        const addvoucharResult = await pool.request()
            .input('socialAccount', sql.VarChar, socialAccount)
            .input('startDate', sql.DateTime, startDate)
            .input('endDate', sql.DateTime, endDate)
            .query(`
                SELECT * 
                FROM Addvouchar 
                WHERE socialaccount = @socialAccount
                AND VoucharDate BETWEEN @startDate AND @endDate
            `);

        // Fetch data from AddMonthlyAmount
        const addMonthlyAmountResult = await pool.request()
            .input('socialAccount', sql.VarChar, socialAccount)
            .input('startDate', sql.DateTime, startDate)
            .input('endDate', sql.DateTime, endDate)
            .query(`
                SELECT * 
                FROM AddMonthlyAmount 
                WHERE SocialAccount = @socialAccount
                AND createdOn BETWEEN @startDate AND @endDate
            `);

        // Calculate totals for Amount and Budget
        const totalSpentAmount = addvoucharResult.recordset.reduce((sum, record) => sum + (record.Amount || 0), 0);
        const totalBudget = addMonthlyAmountResult.recordset.reduce((sum, record) => sum + parseFloat(record.Budget || 0), 0);

        // Send response
        res.json({
            success: true,
            message: 'Data fetched successfully',
            data: {
                socialAccount,
                filter,
                totalSpentAmount,
                totalBudget,
                addvoucharData: addvoucharResult.recordset,
                addMonthlyAmountData: addMonthlyAmountResult.recordset,
            },
        });
    } catch (error) {
        console.error('Error querying database:', error);
        res.status(500).json({
            success: false,
            message: 'An error occurred while fetching data',
            error: error.message,
        });
    }
};

module.exports = { getAds };

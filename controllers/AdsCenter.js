const sql = require('mssql');
const config = require('../config/dbConfig');

const getAds = async (req, res) => {
    try {
        const socialAccount = req.params.socialAccount;

        // Validate socialAccount
        if (!socialAccount) {
            return res.status(400).json({
                success: false,
                message: 'SocialAccount is required in the URL parameters'
            });
        }

        // Connect to the SQL database
        const pool = await sql.connect(config);

        // Fetch Addvouchar data
        const addvoucharResult = await pool.request()
            .input('socialAccount', sql.VarChar, socialAccount)
            .query(`
                SELECT * 
                FROM Addvouchar 
                WHERE socialaccount = @socialAccount 
                ORDER BY id DESC
            `);

        let amount = addvoucharResult.recordset.length > 0 
            ? addvoucharResult.recordset[0].Budget 
            : null;

        // If no budget found in Addvouchar, check AddMonthlyAmount
        if (!amount || amount === '0') {
            const currentMonth = new Date().getMonth() + 1;
            const currentYear = new Date().getFullYear();

            const addMonthlyAmountResult = await pool.request()
                .input('socialAccount', sql.VarChar, socialAccount)
                .input('currentMonth', sql.Int, currentMonth)
                .input('currentYear', sql.Int, currentYear)
                .query(`
                    SELECT * 
                    FROM AddMonthlyAmount 
                    WHERE SocialAccount = @socialAccount 
                    AND AmountMonth = @currentMonth 
                    AND AmountYear = @currentYear
                `);

            amount = addMonthlyAmountResult.recordset.length > 0 
                ? addMonthlyAmountResult.recordset[0].Budget 
                : '0';
        }

        // Fetch ClientEnrollment data
        const clientEnrollmentResult = await pool.request()
            .input('socialAccount', sql.VarChar, socialAccount)
            .query(`
                SELECT * 
                FROM ClientEnrollment 
                WHERE socialaccount = @socialAccount
            `);

        // Send response
        res.json({
            success: true,
            message: 'Data fetched successfully',
            data: {
                socialAccount,
                addvoucharData: addvoucharResult.recordset,
                clientEnrollmentData: clientEnrollmentResult.recordset,
                currentMonthAmount: amount,
            },
            totalRecords: {
                addvoucharCount: addvoucharResult.recordset.length,
                clientEnrollmentCount: clientEnrollmentResult.recordset.length
            }
        });

    } catch (error) {
        console.error('Error querying database:', error);
        res.status(500).json({
            success: false,
            message: 'An error occurred while fetching data',
            error: error.message
        });
    }
};

module.exports = { getAds };

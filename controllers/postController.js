const { sql, poolPromise } = require('../config/db');

const getPostsPendingClientApproval = async (req, res) => {
  try {
    const { socialAccount } = req.params;

    const pool = await poolPromise;

    console.time('SQL Query');
    const result = await pool.request()
      .input('socialAccount', sql.NVarChar(50), socialAccount)
      .query(`
        SELECT IU.*, VD.VideoUrl
        FROM IdeaUploader IU
        OUTER APPLY (
            SELECT TOP 1 VideoUrl
            FROM VideoDetails
            WHERE UploaderId = IU.Id
            ORDER BY CreatedDate DESC
        ) VD
        WHERE IU.SocialAccount = @socialAccount
          AND IU.CreativeStatus = 'Done'
          AND (
                IU.UploadedFileStatus = 'Pending'
             OR IU.UploadedFileStatus = 'Correction'
             OR IU.UploadedFileStatus IS NULL
          )
      `);
    console.timeEnd('SQL Query');

    const ideaUploaderData = result.recordset;

    // ✅ Count General Video, Festival Video, or reel
    const generalVideoCount = ideaUploaderData.filter(
      (entry) =>
        (['general video', 'festival video', 'reel'].includes(
          (entry.Type || '').toLowerCase()
        )) &&
        entry.DesignerStatus === 'Done'
    ).length;

    res.json({
      data: ideaUploaderData,
      generalVideoCount,
      count: ideaUploaderData.length,
      success: true,
      message:
        ideaUploaderData.length > 0
          ? 'Data fetched successfully'
          : 'No records found for the given social account and status',
    });

  } catch (err) {
    console.error('Error fetching data:', err.message);
    res.status(500).json({ message: err.message, success: false });
  }
};


const getPostApprovedByClient = async (req, res) => {
  try {
    const { socialAccount } = req.params;

    if (!socialAccount) {
      return res.status(400).json({
        success: false,
        message: "'socialAccount' parameter is required",
      });
    }

    const currentDate = new Date();
    const selectedYear = currentDate.getFullYear();

    const pool = await poolPromise;

    console.time('ApprovedByClient SQL');

    const result = await pool.request()
      .input('socialAccount', sql.VarChar(50), socialAccount)
      .input('selectedYear', sql.Int, selectedYear)
      .query(`
        SELECT
          IU.Id,
          IU.Type,
          IU.Content,
          IU.Product,
          IU.UploadFileUrl,
          IU.CreativeStatus,
          IU.DesignerStatus,
          IU.UploadedFileStatus,
          IU.finalBroadcast,
          IU.SocialAccount,
          VD.VideoUrl
        FROM IdeaUploader IU
        OUTER APPLY (
            SELECT TOP 1 VideoUrl
            FROM VideoDetails
            WHERE UploaderId = IU.Id
        ) VD
        WHERE IU.SocialAccount = @socialAccount
          AND IU.UploadedFileStatus = 'Done'
          AND YEAR(IU.finalBroadcast) = @selectedYear
          AND IU.Id NOT IN (
            SELECT UploaderId
            FROM Broadcastmanagement
          )
      `);

    console.timeEnd('ApprovedByClient SQL');

    const ideaUploaderData = result.recordset;

    const generalVideoCount = ideaUploaderData.filter(
      (entry) =>
        ['general video', 'festival video', 'reel'].includes(
          (entry.Type || '').toLowerCase()
        ) &&
        entry.DesignerStatus === 'Done'
    ).length;

    res.json({
      data: ideaUploaderData,
      generalVideoCount,
      count: ideaUploaderData.length,
      success: true,
      message: ideaUploaderData.length > 0
        ? "Data fetched successfully"
        : "No records found for the current year",
    });
  } catch (err) {
    console.error('Error fetching data:', err.message);
    res.status(500).json({
      success: false,
      message: "Server error. Please try again later.",
    });
  }
};


const getFinalBroadcast = async (req, res) => {
  try {
    const { socialAccount } = req.params;

    const currentDate = new Date();
    const selectedYear = currentDate.getFullYear();

    const pool = await poolPromise;

    console.time('FinalBroadcast SQL');
    const result = await pool.request()
      .input('socialAccount', sql.VarChar(50), socialAccount)
      .input('selectedYear', sql.Int, selectedYear)
      .query(`
        SELECT
          IU.Id,
          IU.Type,
          IU.Content,
          IU.Product,
          IU.UploadFileUrl,
          IU.CreativeStatus,
          IU.DesignerStatus,
          IU.UploadedFileStatus,
          IU.finalBroadcast,
          IU.SocialAccount,
          BM.BroadcastStatus,
          VD.VideoUrl
        FROM IdeaUploader IU
        LEFT JOIN Broadcastmanagement BM
          ON IU.Id = BM.UploaderId
        OUTER APPLY (
            SELECT TOP 1 VideoUrl
            FROM VideoDetails
            WHERE UploaderId = IU.Id
        ) VD
        WHERE IU.SocialAccount = @socialAccount
          AND IU.UploadedFileStatus = 'Done'
          AND BM.BroadcastStatus = 'Done'
          AND YEAR(IU.finalBroadcast) = @selectedYear
      `);
    console.timeEnd('FinalBroadcast SQL');

    const finalBroadcastData = result.recordset;

    res.json({
      data: finalBroadcastData,
      count: finalBroadcastData.length,
      success: true,
      message: finalBroadcastData.length > 0
        ? "Data fetched successfully"
        : "No records found for the given social account"
    });
  } catch (err) {
    console.error('Error fetching final broadcast posts:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

const getPostStats = async (req, res) => {
  try {
    const { socialAccount } = req.params;

    if (!socialAccount) {
      return res.status(400).json({
        success: false,
        message: "'socialAccount' parameter is required",
      });
    }

    const currentDate = new Date();
    const selectedYear = currentDate.getFullYear();

    const pool = await poolPromise;

    console.time('PostStats SQL');

  const result = await pool.request()
  .input('socialAccount', sql.VarChar(50), socialAccount)
  .input('selectedYear', sql.Int, selectedYear)
  .query(`
    SELECT
      (SELECT COUNT(*)
       FROM IdeaUploader IU
       WHERE IU.SocialAccount = @socialAccount
         AND IU.CreativeStatus = 'Done'
         AND YEAR(IU.finalBroadcast) = @selectedYear
         AND (
              IU.UploadedFileStatus = 'Pending'
           OR IU.UploadedFileStatus = 'Correction'
           OR IU.UploadedFileStatus IS NULL
         )
      ) AS PendingCount,

      (SELECT COUNT(*)
       FROM IdeaUploader IU
       WHERE IU.SocialAccount = @socialAccount
         AND IU.UploadedFileStatus = 'Done'
         AND YEAR(IU.finalBroadcast) = @selectedYear
         AND IU.Id NOT IN (
           SELECT UploaderId
           FROM Broadcastmanagement
         )
      ) AS ApprovedCount,

      (SELECT COUNT(*)
       FROM IdeaUploader IU
       LEFT JOIN Broadcastmanagement BM
         ON IU.Id = BM.UploaderId
       WHERE IU.SocialAccount = @socialAccount
         AND IU.UploadedFileStatus = 'Done'
         AND BM.BroadcastStatus = 'Done'
         AND YEAR(IU.finalBroadcast) = @selectedYear
      ) AS BroadcastCount
  `);
  
    console.timeEnd('PostStats SQL');

    const stats = result.recordset[0];

    res.json({
      pendingCount: stats.PendingCount,
      approvedCount: stats.ApprovedCount,
      broadcastCount: stats.BroadcastCount,
      success: true,
      message: "Post statistics fetched successfully"
    });
  } catch (err) {
    console.error('Error fetching stats:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};




module.exports = {
  getPostsPendingClientApproval,
  getPostApprovedByClient,
  getFinalBroadcast,
  getPostStats
};

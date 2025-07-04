// db.js
const sql = require('mssql');

const config = {
  user: 'pitamaas',
  password: 'Pitamaas@321',
  server: 'A2NWPLSK14SQL-v02.shr.prod.iad2.secureserver.net',
  database: 'pitamaas_New_DOM',
  options: {
    encrypt: true,
    trustServerCertificate: true,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

const poolPromise = new sql.ConnectionPool(config)
  .connect()
  .then(pool => {
    console.log('✅ SQL Server Connected');
    return pool;
  })
  .catch(err => {
    console.error('❌ SQL Connection Failed: ', err.message);
    process.exit(1);
  });

module.exports = {
  sql,
  poolPromise,
};

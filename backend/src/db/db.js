const mysql = require('mysql2/promise');

// Master pool — writes only
const masterPool = mysql.createPool({
  host: process.env.DB_HOST || 'db-master',
  user: process.env.DB_USER || 'voter',
  password: process.env.DB_PASS || 'voterpass',
  database: process.env.DB_NAME || 'votingdb',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Slave pools — reads only
const slavePools = [
  mysql.createPool({
    host: process.env.DB_SLAVE1_HOST || 'db-slave1',
    user: process.env.DB_USER || 'voter',
    password: process.env.DB_PASS || 'voterpass',
    database: process.env.DB_NAME || 'votingdb',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  }),
  mysql.createPool({
    host: process.env.DB_SLAVE2_HOST || 'db-slave2',
    user: process.env.DB_USER || 'voter',
    password: process.env.DB_PASS || 'voterpass',
    database: process.env.DB_NAME || 'votingdb',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  }),
];

// Round-robin counter for slave load balancing
let slaveIndex = 0;
function getSlavePool() {
  const pool = slavePools[slaveIndex % slavePools.length];
  slaveIndex++;
  return pool;
}

// Use this for all SELECT queries
const readPool = {
  query: (...args) => getSlavePool().query(...args),
};

// Use this for INSERT/UPDATE/DELETE
const writePool = masterPool;

// Backwards-compatible `pool` — points to master (safe default)
const pool = masterPool;

// Dedicated connection from MASTER for transactions
async function getConnection(retries = 10, delay = 3000) {
  for (let i = 1; i <= retries; i++) {
    try {
      const conn = await masterPool.getConnection();
      console.log(`Connected to master: db-master`);
      return conn;
    } catch (err) {
      console.warn(`DB connection attempt ${i}/${retries} failed: ${err.message}`);
      if (i === retries) throw err;
      await new Promise(res => setTimeout(res, delay));
    }
  }
}

module.exports = { pool, readPool, writePool, getConnection };
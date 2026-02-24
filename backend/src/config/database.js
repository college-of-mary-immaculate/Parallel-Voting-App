import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
 
dotenv.config();
 
// Database configuration for master connection (read/write)
const masterConfig = {
  host: process.env.MASTER_DB_HOST || 'localhost',
  user: process.env.MASTER_DB_USER || 'root',
  password: process.env.MASTER_DB_PASS || '',
  database: process.env.MASTER_DB_NAME || 'voting_app',
  port: process.env.MASTER_DB_PORT || 3306,
  acquireTimeout: 60000,
  timeout: 60000,
  reconnect: true,
  connectionLimit: 10,
  queueLimit: 0
};
 
// Database configuration for slave connection (read-only)
const slaveConfig = {
  host: process.env.SLAVE_DB_HOST || 'localhost',
  user: process.env.SLAVE_DB_USER || 'root',
  password: process.env.SLAVE_DB_PASS || '',
  database: process.env.SLAVE_DB_NAME || 'voting_app',
  port: process.env.SLAVE_DB_PORT || 3306,
  acquireTimeout: 60000,
  timeout: 60000,
  reconnect: true,
  connectionLimit: 10,
  queueLimit: 0
};
 
// Create connection pools
const masterPool = mysql.createPool(masterConfig);
const slavePool = mysql.createPool(slaveConfig);
 
// Test database connection
const testConnection = async (pool, type) => {
  try {
    const connection = await pool.getConnection();
    console.log(`✅ ${type} database connected successfully`);
    connection.release();
    return true;
  } catch (error) {
    console.error(`❌ ${type} database connection failed:`, error.message);
    return false;
  }
};
 
// Initialize database connections
const initializeDatabase = async () => {
  console.log('🔗 Initializing database connections...');
 
  const masterConnected = await testConnection(masterPool, 'Master');
  const slaveConnected = await testConnection(slavePool, 'Slave');
 
  if (!masterConnected) {
    console.error('❌ Master database connection is required');
    process.exit(1);
  }
 
  if (!slaveConnected) {
    console.warn('⚠️  Slave database connection failed, using master for read operations');
    return { master: masterPool, slave: masterPool };
  }
 
  console.log('✅ All database connections established');
  return { master: masterPool, slave: slavePool };
};
 
// Get connection for write operations
const getWriteConnection = () => masterPool;
 
// Get connection for read operations
const getReadConnection = () => {
  // If slave is not available, use master
  return slavePool || masterPool;
};
 
// Execute query with automatic connection selection
const query = async (sql, params = [], isWrite = false) => {
  try {
    const pool = isWrite ? getWriteConnection() : getReadConnection();
    const [rows] = await pool.execute(sql, params);
    return rows;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
};
 
// Execute transaction
const transaction = async (callback) => {
  const connection = await getWriteConnection().getConnection();
 
  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};
 
// Close all connections
const closeConnections = async () => {
  try {
    await masterPool.end();
    if (slavePool && slavePool !== masterPool) {
      await slavePool.end();
    }
    console.log('🔌 Database connections closed');
  } catch (error) {
    console.error('Error closing database connections:', error);
  }
};
 
// Handle process termination
process.on('SIGINT', closeConnections);
process.on('SIGTERM', closeConnections);
 
export {
  initializeDatabase,
  query,
  transaction,
  getWriteConnection,
  getReadConnection,
  masterPool,
  slavePool
};

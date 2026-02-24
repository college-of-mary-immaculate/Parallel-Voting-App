import { query, transaction } from '../config/database.js';
 
// Generic CRUD operations
export const DatabaseUtils = {
  // Find single record
  async findOne(table, conditions = {}, select = '*') {
    const whereClause = Object.keys(conditions).map(key => `${key} = ?`).join(' AND ');
    const values = Object.values(conditions);
    const sql = `SELECT ${select} FROM ${table} WHERE ${whereClause} LIMIT 1`;
 
    const results = await query(sql, values);
    return results.length > 0 ? results[0] : null;
  },
 
  // Find multiple records
  async findMany(table, conditions = {}, select = '*', orderBy = '', limit = '') {
    let sql = `SELECT ${select} FROM ${table}`;
    const values = [];
 
    if (Object.keys(conditions).length > 0) {
      const whereClause = Object.keys(conditions).map(key => `${key} = ?`).join(' AND ');
      sql += ` WHERE ${whereClause}`;
      values.push(...Object.values(conditions));
    }
 
    if (orderBy) {
      sql += ` ORDER BY ${orderBy}`;
    }
 
    if (limit) {
      sql += ` LIMIT ${limit}`;
    }
 
    return await query(sql, values);
  },
 
  // Create new record
  async create(table, data) {
    const fields = Object.keys(data).join(', ');
    const placeholders = Object.keys(data).map(() => '?').join(', ');
    const values = Object.values(data);
 
    const sql = `INSERT INTO ${table} (${fields}) VALUES (${placeholders})`;
    const result = await query(sql, values, true);
 
    return result.insertId || result;
  },
 
  // Update record
  async update(table, data, conditions) {
    const setClause = Object.keys(data).map(key => `${key} = ?`).join(', ');
    const whereClause = Object.keys(conditions).map(key => `${key} = ?`).join(' AND ');
    const values = [...Object.values(data), ...Object.values(conditions)];
 
    const sql = `UPDATE ${table} SET ${setClause} WHERE ${whereClause}`;
    const result = await query(sql, values, true);
 
    return result.affectedRows > 0;
  },
 
  // Delete record
  async delete(table, conditions) {
    const whereClause = Object.keys(conditions).map(key => `${key} = ?`).join(' AND ');
    const values = Object.values(conditions);
 
    const sql = `DELETE FROM ${table} WHERE ${whereClause}`;
    const result = await query(sql, values, true);
 
    return result.affectedRows > 0;
  },
 
  // Count records
  async count(table, conditions = {}) {
    let sql = `SELECT COUNT(*) as count FROM ${table}`;
    const values = [];
 
    if (Object.keys(conditions).length > 0) {
      const whereClause = Object.keys(conditions).map(key => `${key} = ?`).join(' AND ');
      sql += ` WHERE ${whereClause}`;
      values.push(...Object.values(conditions));
    }
 
    const result = await query(sql, values);
    return result[0].count;
  },
 
  // Execute raw query
  async executeQuery(sql, params = [], isWrite = false) {
    return await query(sql, params, isWrite);
  },
 
  // Execute transaction
  async executeTransaction(callback) {
    return await transaction(callback);
  }
};
 
// Database health check
export const checkDatabaseHealth = async () => {
  try {
    const result = await query('SELECT 1 as health_check');
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: result[0].health_check === 1 ? 'connected' : 'disconnected'
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    };
  }
};
 
// Get table statistics
export const getTableStats = async (tableName) => {
  try {
    const count = await DatabaseUtils.count(tableName);
    return {
      table: tableName,
      recordCount: count,
      lastChecked: new Date().toISOString()
    };
  } catch (error) {
    throw new Error(`Failed to get stats for table ${tableName}: ${error.message}`);
  }
};
 
// Validate database connection and required tables
export const validateDatabaseSetup = async () => {
  const requiredTables = ['User', 'Election', 'Candidate', 'Votes', 'Otp'];
  const results = {};
 
  for (const table of requiredTables) {
    try {
      await query(`SELECT 1 FROM ${table} LIMIT 1`);
      results[table] = 'exists';
    } catch (error) {
      results[table] = 'missing';
    }
  }
 
  const allTablesExist = Object.values(results).every(status => status === 'exists');
 
  return {
    allTablesExist,
    tables: results,
    checkedAt: new Date().toISOString()
  };
};
 
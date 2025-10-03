// lib/db.js
import { Pool } from 'pg';

let pool;

/**
 * Khởi tạo connection pool
 */
function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      // Hoặc sử dụng các biến riêng lẻ:
      // host: process.env.DB_HOST,
      // port: parseInt(process.env.DB_PORT || '5432'),
      // database: process.env.DB_NAME,
      // user: process.env.DB_USER,
      // password: process.env.DB_PASSWORD,
      
      // Connection pool settings
      min: parseInt(process.env.DB_POOL_MIN || '2'),
      max: parseInt(process.env.DB_POOL_MAX || '10'),
      
      // Timeout settings
      connectionTimeoutMillis: 5000,
      idleTimeoutMillis: 30000,
      
      // SSL settings (nếu DB yêu cầu)
      ssl: process.env.NODE_ENV === 'production' ? {
        rejectUnauthorized: false
      } : false
    });

    // Error handling
    pool.on('error', (err) => {
      console.error('Unexpected database error:', err);
      process.exit(-1);
    });

    // Log connection info (chỉ trong development)
    if (process.env.NODE_ENV === 'development') {
      pool.on('connect', () => {
        console.log('✅ Database connected successfully');
      });
    }
  }

  return pool;
}

/**
 * Thực thi query
 * @param {string} text - SQL query
 * @param {Array} params - Query parameters
 * @returns {Promise<Object>} Query result
 */
export async function query(text, params) {
  const start = Date.now();
  const client = getPool();
  
  try {
    const result = await client.query(text, params);
    const duration = Date.now() - start;
    
    // Log query trong development
    if (process.env.NODE_ENV === 'development') {
      console.log('Executed query', {
        text,
        duration: `${duration}ms`,
        rows: result.rowCount
      });
    }
    
    return result;
  } catch (error) {
    console.error('Database query error:', {
      text,
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
}

/**
 * Lấy một client từ pool (dùng cho transactions)
 */
export async function getClient() {
  const client = await getPool().connect();
  
  // Wrap release để log
  const release = client.release;
  const timeout = setTimeout(() => {
    console.error('A client has been checked out for more than 5 seconds!');
  }, 5000);
  
  client.release = () => {
    clearTimeout(timeout);
    return release.apply(client);
  };
  
  return client;
}

/**
 * Transaction helper
 * @param {Function} callback - Async function to execute in transaction
 */
export async function transaction(callback) {
  const client = await getClient();
  
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Đóng pool connection (dùng khi shutdown)
 */
export async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
    console.log('Database pool closed');
  }
}

/**
 * Kiểm tra kết nối database
 */
export async function testConnection() {
  try {
    const result = await query('SELECT NOW() as current_time, current_database() as db_name');
    console.log('✅ Database connection test successful:', result.rows[0]);
    return true;
  } catch (error) {
    console.error('❌ Database connection test failed:', error.message);
    return false;
  }
}

// ============================================
// HELPER FUNCTIONS - Các hàm trợ giúp
// ============================================

/**
 * Tìm kiếm văn bằng theo số hiệu
 */
export async function searchDiploma(diplomaNumber) {
  const result = await query(
    `SELECT 
      diploma_number,
      registry_number,
      issue_date,
      school_name,
      major,
      specialization,
      student_code,
      full_name,
      training_system,
      graduation_year,
      classification
    FROM diplomas
    WHERE diploma_number = $1
    AND is_active = TRUE
    LIMIT 1`,
    [diplomaNumber]
  );

  return result.rows[0] || null;
}

/**
 * Log tra cứu vào database
 */
export async function logSearch(diplomaNumber, ipAddress, userAgent, found, responseTimeMs) {
  if (process.env.ENABLE_SEARCH_LOGGING !== 'true') {
    return;
  }

  try {
    await query(
      `INSERT INTO search_logs 
        (diploma_number, ip_address, user_agent, found, response_time_ms)
      VALUES ($1, $2, $3, $4, $5)`,
      [diplomaNumber, ipAddress, userAgent, found, responseTimeMs]
    );
  } catch (error) {
    console.error('Failed to log search:', error);
    // Không throw error để không ảnh hưởng đến chức năng chính
  }
}

/**
 * Kiểm tra rate limit
 */
export async function checkRateLimit(ipAddress) {
  const windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '3600000');
  const maxRequests = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100');
  
  const windowStart = new Date(Date.now() - windowMs);
  
  const result = await query(
    `SELECT COUNT(*) as request_count
    FROM search_logs
    WHERE ip_address = $1
    AND search_time >= $2`,
    [ipAddress, windowStart]
  );

  const requestCount = parseInt(result.rows[0].request_count);
  return {
    allowed: requestCount < maxRequests,
    remaining: Math.max(0, maxRequests - requestCount),
    limit: maxRequests,
    resetAt: new Date(Date.now() + windowMs)
  };
}

/**
 * Lấy thống kê tra cứu
 */
export async function getSearchStats(days = 7) {
  const result = await query(
    `SELECT 
      DATE(search_time) as date,
      COUNT(*) as total_searches,
      COUNT(CASE WHEN found = TRUE THEN 1 END) as successful,
      COUNT(CASE WHEN found = FALSE THEN 1 END) as failed,
      COUNT(DISTINCT ip_address) as unique_visitors
    FROM search_logs
    WHERE search_time >= CURRENT_DATE - INTERVAL '1 day' * $1
    GROUP BY DATE(search_time)
    ORDER BY date DESC`,
    [days]
  );

  return result.rows;
}

/**
 * Log hành động admin
 */
export async function logAdminAction(adminId, action, tableName, recordId, oldData, newData, description, ipAddress) {
  if (process.env.ENABLE_ADMIN_LOGGING !== 'true') {
    return;
  }

  try {
    await query(
      `INSERT INTO admin_logs 
        (admin_id, action, table_name, record_id, old_data, new_data, description, ip_address)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        adminId,
        action,
        tableName,
        recordId,
        oldData ? JSON.stringify(oldData) : null,
        newData ? JSON.stringify(newData) : null,
        description,
        ipAddress
      ]
    );
  } catch (error) {
    console.error('Failed to log admin action:', error);
  }
}

// Export default
export default {
  query,
  getClient,
  transaction,
  closePool,
  testConnection,
  searchDiploma,
  logSearch,
  checkRateLimit,
  getSearchStats,
  logAdminAction
};
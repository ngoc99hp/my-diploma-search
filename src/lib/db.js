// lib/db.js
import { Pool } from 'pg';

let pool;

/**
 * Get SSL configuration based on database URL
 */
function getSSLConfig() {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    return false;
  }

  // Check if URL explicitly disables SSL
  if (databaseUrl.includes('sslmode=disable')) {
    return false;
  }

  // Check if URL explicitly requires SSL
  if (databaseUrl.includes('sslmode=require')) {
    return {
      rejectUnauthorized: false
    };
  }

  // Default: try SSL in production, but don't fail if not available
  if (process.env.NODE_ENV === 'production') {
    return {
      rejectUnauthorized: false,
      // Allow fallback to non-SSL if SSL fails
      checkServerIdentity: () => undefined
    };
  }

  // Development: no SSL
  return false;
}

/**
 * Khởi tạo connection pool
 */
function getPool() {
  if (!pool) {
    const sslConfig = getSSLConfig();
    
    console.log('🔌 Initializing database pool:', {
      env: process.env.NODE_ENV,
      ssl: sslConfig ? 'enabled' : 'disabled',
      hasUrl: !!process.env.DATABASE_URL
    });

    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      min: parseInt(process.env.DB_POOL_MIN || '2'),
      max: parseInt(process.env.DB_POOL_MAX || '10'),
      connectionTimeoutMillis: 5000,
      idleTimeoutMillis: 30000,
      ssl: sslConfig
    });

    // Error handling
    pool.on('error', (err) => {
      console.error('❌ Unexpected database error:', err);
      // Don't exit process, let app recover
    });

    // Log connection info
    pool.on('connect', () => {
      console.log('✅ Database connected successfully');
    });
  }

  return pool;
}

/**
 * Thực thi query với error handling tốt hơn
 */
export async function query(text, params) {
  const start = Date.now();
  const client = getPool();
  
  try {
    const result = await client.query(text, params);
    const duration = Date.now() - start;
    
    if (process.env.NODE_ENV === 'development') {
      console.log('Executed query', {
        text: text.substring(0, 100),
        duration: `${duration}ms`,
        rows: result.rowCount
      });
    }
    
    return result;
  } catch (error) {
    // Check if database is down
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      console.error('❌ Database connection failed:', error.message);
      const dbError = new Error('Không thể kết nối đến cơ sở dữ liệu. Vui lòng thử lại sau.');
      dbError.code = 'DB_CONNECTION_ERROR';
      throw dbError;
    }

    // SSL connection errors
    if (error.message?.includes('SSL') || error.message?.includes('ssl')) {
      console.error('❌ SSL connection error:', error.message);
      const sslError = new Error('Lỗi kết nối database (SSL). Vui lòng kiểm tra cấu hình.');
      sslError.code = 'DB_SSL_ERROR';
      throw sslError;
    }

    // Check for specific PostgreSQL errors
    if (error.code === '23505') { // Unique violation
      const duplicateError = new Error('Dữ liệu đã tồn tại trong hệ thống');
      duplicateError.code = 'DUPLICATE_ERROR';
      throw duplicateError;
    }

    if (error.code === '23503') { // Foreign key violation
      const fkError = new Error('Không thể thực hiện thao tác do ràng buộc dữ liệu');
      fkError.code = 'FK_VIOLATION';
      throw fkError;
    }

    console.error('Database query error:', {
      text,
      error: error.message,
      code: error.code,
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
 * Đóng pool connection
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
    const result = await query('SELECT NOW() as current_time, current_database() as db_name, version() as pg_version');
    console.log('✅ Database connection test successful:', {
      time: result.rows[0].current_time,
      database: result.rows[0].db_name,
      version: result.rows[0].pg_version.split(',')[0]
    });
    return true;
  } catch (error) {
    console.error('❌ Database connection test failed:', error.message);
    return false;
  }
}

/**
 * Tìm kiếm văn bằng theo số hiệu
 */
export async function searchDiploma(diplomaNumber) {
  try {
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
  } catch (error) {
    if (error.code === 'DB_CONNECTION_ERROR' || error.code === 'DB_SSL_ERROR') {
      throw error; // Re-throw để API handler xử lý
    }
    console.error('Search diploma error:', error);
    throw new Error('Lỗi khi tra cứu văn bằng');
  }
}

/**
 * Log tra cứu vào database
 */
export async function logSearch(diplomaNumber, ipAddress, userAgent, found, responseTimeMs, captchaScore = null, captchaStatus = null, errorMessage = null) {
  if (process.env.ENABLE_SEARCH_LOGGING !== 'true') {
    return;
  }

  try {
    await query(
      `INSERT INTO search_logs 
        (diploma_number, ip_address, user_agent, found, response_time_ms, captcha_score, captcha_status, error_message)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [diplomaNumber, ipAddress, userAgent, found, responseTimeMs, captchaScore, captchaStatus, errorMessage]
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
  try {
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
  } catch (error) {
    console.error('Rate limit check error:', error);
    // Fail-open: cho phép request nếu không check được
    return {
      allowed: true,
      remaining: 100,
      limit: 100,
      resetAt: new Date(Date.now() + 3600000)
    };
  }
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
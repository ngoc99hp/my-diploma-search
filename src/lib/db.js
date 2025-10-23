// lib/db.js - Updated for Schema v2.0
import { Pool } from 'pg';

let pool;

function getSSLConfig() {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    return false;
  }

  if (databaseUrl.includes('sslmode=disable')) {
    return false;
  }

  if (databaseUrl.includes('sslmode=require')) {
    return {
      rejectUnauthorized: false
    };
  }

  if (process.env.NODE_ENV === 'production') {
    return {
      rejectUnauthorized: false,
      checkServerIdentity: () => undefined
    };
  }

  return false;
}

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

    pool.on('error', (err) => {
      console.error('❌ Unexpected database error:', err);
    });

    pool.on('connect', () => {
      console.log('✅ Database connected successfully');
    });
  }

  return pool;
}

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
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      console.error('❌ Database connection failed:', error.message);
      const dbError = new Error('Không thể kết nối đến cơ sở dữ liệu. Vui lòng thử lại sau.');
      dbError.code = 'DB_CONNECTION_ERROR';
      throw dbError;
    }

    if (error.message?.includes('SSL') || error.message?.includes('ssl')) {
      console.error('❌ SSL connection error:', error.message);
      const sslError = new Error('Lỗi kết nối database (SSL). Vui lòng kiểm tra cấu hình.');
      sslError.code = 'DB_SSL_ERROR';
      throw sslError;
    }

    if (error.code === '23505') {
      const duplicateError = new Error('Dữ liệu đã tồn tại trong hệ thống');
      duplicateError.code = 'DUPLICATE_ERROR';
      throw duplicateError;
    }

    if (error.code === '23503') {
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

export async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
    console.log('Database pool closed');
  }
}

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
 * Tìm kiếm văn bằng theo số hiệu (Schema v2)
 */
export async function searchDiplomaByNumber(soHieuVBCC) {
  try {
    const result = await query(
      `SELECT 
        ma_dinh_danh_vbcc,
        so_hieu_vbcc,
        ho_va_ten,
        ngay_sinh,
        noi_sinh,
        gioi_tinh,
        ma_nguoi_hoc,
        nganh_dao_tao,
        chuyen_nganh_dao_tao,
        xep_loai,
        nam_tot_nghiep,
        hinh_thuc_dao_tao,
        thoi_gian_dao_tao,
        don_vi_cap_bang,
        ngay_cap_vbcc,
        dia_danh_cap_vbcc,
        trinh_do_theo_khung_quoc_gia,
        bac_trinh_do_theo_khung_quoc_gia
      FROM diplomas
      WHERE so_hieu_vbcc = $1
      AND is_active = TRUE
      LIMIT 1`,
      [soHieuVBCC]
    );

    return result.rows[0] || null;
  } catch (error) {
    if (error.code === 'DB_CONNECTION_ERROR' || error.code === 'DB_SSL_ERROR') {
      throw error;
    }
    console.error('Search diploma error:', error);
    throw new Error('Lỗi khi tra cứu văn bằng');
  }
}

/**
 * Tìm kiếm văn bằng theo Mã SV + Họ tên/Ngày sinh
 */
export async function searchDiplomaCombo(maNguoiHoc, hoVaTen = null, ngaySinh = null) {
  try {
    // Phải có ít nhất 1 trong 2: họ tên hoặc ngày sinh
    if (!hoVaTen && !ngaySinh) {
      throw new Error('Vui lòng nhập thêm Họ tên hoặc Ngày sinh');
    }

    let queryText = `
      SELECT 
        ma_dinh_danh_vbcc,
        so_hieu_vbcc,
        ho_va_ten,
        ngay_sinh,
        noi_sinh,
        gioi_tinh,
        ma_nguoi_hoc,
        nganh_dao_tao,
        chuyen_nganh_dao_tao,
        xep_loai,
        nam_tot_nghiep,
        hinh_thuc_dao_tao,
        thoi_gian_dao_tao,
        don_vi_cap_bang,
        ngay_cap_vbcc,
        dia_danh_cap_vbcc,
        trinh_do_theo_khung_quoc_gia,
        bac_trinh_do_theo_khung_quoc_gia
      FROM diplomas
      WHERE ma_nguoi_hoc = $1
      AND is_active = TRUE
    `;

    const params = [maNguoiHoc];
    let paramIndex = 2;

    if (hoVaTen) {
      queryText += ` AND UPPER(ho_va_ten) = UPPER($${paramIndex})`;
      params.push(hoVaTen);
      paramIndex++;
    }

    if (ngaySinh) {
      queryText += ` AND ngay_sinh = $${paramIndex}`;
      params.push(ngaySinh);
    }

    queryText += ' LIMIT 1';

    const result = await query(queryText, params);
    return result.rows[0] || null;
  } catch (error) {
    if (error.code === 'DB_CONNECTION_ERROR' || error.code === 'DB_SSL_ERROR') {
      throw error;
    }
    console.error('Search diploma combo error:', error);
    throw new Error('Lỗi khi tra cứu văn bằng');
  }
}

/**
 * Log tra cứu vào database
 * FIXED: Thêm diploma_number để hiển thị trong admin panel
 */
export async function logSearch(
  diplomaNumber,      // Số hiệu văn bằng (plaintext)
  ipAddress, 
  userAgent, 
  found, 
  responseTimeMs, 
  captchaScore = null, 
  captchaStatus = null, 
  errorMessage = null
) {
  if (process.env.ENABLE_SEARCH_LOGGING !== 'true') {
    return;
  }

  try {
    // Hash search value để bảo mật (vẫn giữ cho audit)
    const crypto = await import('crypto');
    const searchHash = crypto.createHash('sha256')
      .update(diplomaNumber || 'unknown')
      .digest('hex');

    // ✅ INSERT với CẢ diploma_number VÀ search_value_hash
    await query(
      `INSERT INTO search_logs 
        (ip_address, user_agent, search_type, diploma_number, search_value_hash, 
         found, response_time_ms, captcha_score, captcha_status, error_message)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        ipAddress, 
        userAgent, 
        'so_hieu',
        diplomaNumber,    // ✅ THÊM: Lưu plaintext để hiển thị
        searchHash,       // Hash để bảo mật
        found, 
        responseTimeMs, 
        captchaScore, 
        captchaStatus, 
        errorMessage
      ]
    );
  } catch (error) {
    console.error('Failed to log search:', error);
  }
}

/**
 * Kiểm tra rate limit
 */
export async function checkRateLimit(ipAddress) {
  try {
    const windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '3600000');
    const maxRequests = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '30');
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
    return {
      allowed: true,
      remaining: 100,
      limit: 100,
      resetAt: new Date(Date.now() + 3600000)
    };
  }
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
  searchDiplomaByNumber,
  searchDiplomaCombo,
  logSearch,
  checkRateLimit,
  logAdminAction
};


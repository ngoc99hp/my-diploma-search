// src/app/api/admin/logs/route.js
import { query } from '@/lib/db';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error('FATAL: JWT_SECRET not configured');
}

// Verify admin token
function verifyAdmin(request) {
  const token = request.cookies.get('admin_token')?.value;
  if (!token) {
    throw new Error('Unauthorized');
  }
  return jwt.verify(token, JWT_SECRET);
}

/**
 * GET /api/admin/logs - Lấy nhật ký tra cứu với pagination
 */
export async function GET(request) {
  try {
    const admin = verifyAdmin(request);
    
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const days = parseInt(searchParams.get('days') || '7');
    const offset = (page - 1) * limit;
    
    // Get total count for pagination
    const countResult = await query(
      `SELECT COUNT(*) as total
       FROM search_logs
       WHERE search_time >= NOW() - INTERVAL '1 day' * $1`,
      [days]
    );
    const total = parseInt(countResult.rows[0].total);
    
    // Get search logs with pagination
    const logsResult = await query(
      `SELECT id, diploma_number, ip_address, user_agent, found, 
              response_time_ms, captcha_score, captcha_status, search_time
       FROM search_logs
       WHERE search_time >= NOW() - INTERVAL '1 day' * $1
       ORDER BY search_time DESC
       LIMIT $2 OFFSET $3`,
      [days, limit, offset]
    );

    // Get statistics
    const statsResult = await query(
      `SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN found = TRUE THEN 1 END) as successful,
        COUNT(CASE WHEN found = FALSE THEN 1 END) as failed,
        COUNT(DISTINCT ip_address) as unique_visitors,
        AVG(response_time_ms) as avg_response_time,
        MAX(response_time_ms) as max_response_time,
        MIN(response_time_ms) as min_response_time
       FROM search_logs
       WHERE search_time >= NOW() - INTERVAL '1 day' * $1`,
      [days]
    );

    // Get top searched diploma numbers
    const topSearchedResult = await query(
      `SELECT diploma_number, COUNT(*) as search_count
       FROM search_logs
       WHERE search_time >= NOW() - INTERVAL '1 day' * $1
       GROUP BY diploma_number
       ORDER BY search_count DESC
       LIMIT 10`,
      [days]
    );

    // Get daily stats
    const dailyStatsResult = await query(
      `SELECT 
        DATE(search_time) as date,
        COUNT(*) as total_searches,
        COUNT(CASE WHEN found = TRUE THEN 1 END) as successful,
        COUNT(CASE WHEN found = FALSE THEN 1 END) as failed,
        COUNT(DISTINCT ip_address) as unique_visitors
       FROM search_logs
       WHERE search_time >= NOW() - INTERVAL '1 day' * $1
       GROUP BY DATE(search_time)
       ORDER BY date DESC`,
      [days]
    );

    return new Response(
      JSON.stringify({
        success: true,
        logs: logsResult.rows,
        stats: {
          ...statsResult.rows[0],
          avg_response_time: Math.round(parseFloat(statsResult.rows[0].avg_response_time || 0))
        },
        topSearched: topSearchedResult.rows,
        dailyStats: dailyStatsResult.rows,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Get logs error:', error);
    
    if (error.message === 'Unauthorized' || error.name === 'JsonWebTokenError') {
      return new Response(
        JSON.stringify({ success: false, message: 'Chưa đăng nhập' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, message: 'Lỗi server' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
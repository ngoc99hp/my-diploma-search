// src/app/api/admin/stats/route.js
// ✅ TẠO FILE MỚI NÀY

import { searchCache } from '@/lib/cache';
import { query } from '@/lib/db';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error('FATAL: JWT_SECRET not configured');
}

/**
 * GET /api/admin/stats
 * Monitoring endpoint - Hiển thị performance metrics
 */
export async function GET(request) {
  try {
    // ============================================
    // VERIFY ADMIN
    // ============================================
    const token = request.cookies.get('admin_token')?.value;
    
    if (!token) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Chưa đăng nhập' 
        }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    try {
      jwt.verify(token, JWT_SECRET);
    } catch (error) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Phiên đăng nhập đã hết hạn' 
        }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // ============================================
    // CACHE STATISTICS
    // ============================================
    const cacheStats = searchCache.getStats();

    // ============================================
    // DATABASE STATISTICS
    // ============================================
    const dbStatsQuery = `
      SELECT 
        -- Diplomas stats
        (SELECT COUNT(*) FROM diplomas WHERE is_active = TRUE) as total_diplomas,
        (SELECT COUNT(*) FROM diplomas WHERE is_active = TRUE AND nam_tot_nghiep = EXTRACT(YEAR FROM CURRENT_DATE)) as diplomas_this_year,
        
        -- Search logs stats (24 hours)
        (SELECT COUNT(*) FROM search_logs WHERE search_time >= NOW() - INTERVAL '24 hours') as searches_24h,
        (SELECT COUNT(*) FROM search_logs WHERE search_time >= NOW() - INTERVAL '24 hours' AND found = true) as successful_searches_24h,
        (SELECT COUNT(*) FROM search_logs WHERE search_time >= NOW() - INTERVAL '24 hours' AND found = false) as failed_searches_24h,
        
        -- Performance metrics (24 hours)
        (SELECT AVG(response_time_ms)::INTEGER FROM search_logs WHERE search_time >= NOW() - INTERVAL '24 hours') as avg_response_time_24h,
        (SELECT MAX(response_time_ms) FROM search_logs WHERE search_time >= NOW() - INTERVAL '24 hours') as max_response_time_24h,
        (SELECT MIN(response_time_ms) FROM search_logs WHERE search_time >= NOW() - INTERVAL '24 hours') as min_response_time_24h,
        
        -- Search logs stats (7 days)
        (SELECT COUNT(*) FROM search_logs WHERE search_time >= NOW() - INTERVAL '7 days') as searches_7d,
        (SELECT COUNT(DISTINCT ip_address) FROM search_logs WHERE search_time >= NOW() - INTERVAL '7 days') as unique_visitors_7d,
        
        -- Top searched diplomas (7 days)
        (SELECT json_agg(row_to_json(t)) FROM (
          SELECT diploma_number, COUNT(*) as search_count
          FROM search_logs
          WHERE search_time >= NOW() - INTERVAL '7 days'
            AND diploma_number IS NOT NULL
          GROUP BY diploma_number
          ORDER BY search_count DESC
          LIMIT 5
        ) t) as top_searched
    `;

    const dbStatsResult = await query(dbStatsQuery);
    const dbStats = dbStatsResult.rows[0];

    // ============================================
    // CONNECTION POOL STATISTICS
    // ============================================
    // Note: pool stats requires accessing the pool instance
    // We'll add this in db.js
    let poolStats = {
      total: 'N/A',
      idle: 'N/A',
      waiting: 'N/A'
    };

    try {
      // Try to get pool stats if available
      const { getPoolStats } = await import('@/lib/db');
      if (getPoolStats) {
        poolStats = getPoolStats();
      }
    } catch (error) {
      // Pool stats not available
    }

    // ============================================
    // PERFORMANCE SUMMARY
    // ============================================
    const successRate = dbStats.searches_24h > 0 
      ? ((dbStats.successful_searches_24h / dbStats.searches_24h) * 100).toFixed(2)
      : 0;

    const summary = {
      status: 'healthy',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      
      // Overall health
      health: {
        cache: cacheStats.hitRate,
        avgResponseTime: `${dbStats.avg_response_time_24h || 0}ms`,
        successRate: `${successRate}%`
      },

      // Quick stats
      quick: {
        totalDiplomas: dbStats.total_diplomas,
        searches24h: dbStats.searches_24h,
        successRate: `${successRate}%`,
        cacheHitRate: cacheStats.hitRate
      }
    };

    // ============================================
    // FULL RESPONSE
    // ============================================
    return new Response(JSON.stringify({
      success: true,
      summary,
      
      cache: {
        ...cacheStats,
        description: 'In-memory cache statistics'
      },
      
      database: {
        diplomas: {
          total: dbStats.total_diplomas,
          thisYear: dbStats.diplomas_this_year
        },
        searches: {
          last24h: {
            total: dbStats.searches_24h,
            successful: dbStats.successful_searches_24h,
            failed: dbStats.failed_searches_24h,
            successRate: `${successRate}%`
          },
          last7days: {
            total: dbStats.searches_7d,
            uniqueVisitors: dbStats.unique_visitors_7d
          }
        },
        performance: {
          last24h: {
            avg: `${dbStats.avg_response_time_24h || 0}ms`,
            max: `${dbStats.max_response_time_24h || 0}ms`,
            min: `${dbStats.min_response_time_24h || 0}ms`
          }
        },
        topSearched: dbStats.top_searched || []
      },
      
      pool: {
        ...poolStats,
        description: 'PostgreSQL connection pool'
      },

      system: {
        nodeVersion: process.version,
        platform: process.platform,
        memory: {
          used: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
          total: `${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)}MB`
        },
        uptime: `${Math.round(process.uptime())}s`
      }
    }), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });

  } catch (error) {
    console.error('Stats API error:', error);
    
    return new Response(JSON.stringify({ 
      success: false, 
      message: 'Lỗi khi lấy thống kê',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * POST /api/admin/stats
 * Clear cache hoặc reset statistics
 */
export async function POST(request) {
  try {
    // Verify admin
    const token = request.cookies.get('admin_token')?.value;
    if (!token) {
      return new Response(
        JSON.stringify({ success: false, message: 'Chưa đăng nhập' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    jwt.verify(token, JWT_SECRET);

    const body = await request.json();
    const { action } = body;

    if (action === 'clear_cache') {
      const oldStats = searchCache.getStats();
      searchCache.clear();
      
      return new Response(JSON.stringify({
        success: true,
        message: 'Cache đã được xóa',
        before: oldStats,
        after: searchCache.getStats()
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      success: false,
      message: 'Action không hợp lệ'
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Stats POST error:', error);
    
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return new Response(
        JSON.stringify({ success: false, message: 'Phiên đăng nhập đã hết hạn' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(JSON.stringify({
      success: false,
      message: 'Lỗi server'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
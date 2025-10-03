// src/app/api/search/route.js
import { searchDiploma, logSearch, checkRateLimit } from '@/lib/db';

/**
 * API tra cứu văn bằng
 * POST /api/search
 * Body: { diplomaNumber: string }
 */
export async function POST(request) {
  const startTime = Date.now();
  
  try {
    // Lấy thông tin request
    const { diplomaNumber } = await request.json();
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Validate input
    if (!diplomaNumber || !diplomaNumber.trim()) {
      return new Response(
        JSON.stringify({ 
          success: false,
          message: 'Vui lòng nhập số hiệu bằng tốt nghiệp' 
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Kiểm tra rate limit
    try {
      const rateLimitStatus = await checkRateLimit(ipAddress);
      
      if (!rateLimitStatus.allowed) {
        return new Response(
          JSON.stringify({ 
            success: false,
            message: 'Bạn đã vượt quá số lần tra cứu cho phép. Vui lòng thử lại sau.',
            rateLimitExceeded: true,
            retryAfter: rateLimitStatus.resetAt
          }),
          {
            status: 429,
            headers: { 
              'Content-Type': 'application/json',
              'X-RateLimit-Limit': rateLimitStatus.limit.toString(),
              'X-RateLimit-Remaining': rateLimitStatus.remaining.toString(),
              'X-RateLimit-Reset': rateLimitStatus.resetAt.toISOString()
            },
          }
        );
      }
    } catch (rateLimitError) {
      // Nếu rate limit check fail, vẫn cho phép request (fail-open)
      console.error('Rate limit check failed:', rateLimitError);
    }

    // Tìm kiếm trong database
    const trimmedDiplomaNumber = diplomaNumber.trim();
    const result = await searchDiploma(trimmedDiplomaNumber);
    
    // Tính thời gian response
    const responseTime = Date.now() - startTime;

    // Log tra cứu
    await logSearch(
      trimmedDiplomaNumber,
      ipAddress,
      userAgent,
      !!result,
      responseTime
    );

    // Nếu tìm thấy
    if (result) {
      // Format dữ liệu trả về
      const responseData = {
        success: true,
        data: {
          diploma_number: result.diploma_number,
          registry_number: result.registry_number,
          issue_date: result.issue_date,
          school_name: result.school_name,
          major: result.major,
          specialization: result.specialization,
          student_info: {
            student_code: result.student_code,
            full_name: result.full_name,
            major: result.major,
            training_system: result.training_system,
            graduation_year: result.graduation_year,
            classification: result.classification
          }
        }
      };

      return new Response(JSON.stringify(responseData), {
        status: 200,
        headers: { 
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=300' // Cache 5 phút
        },
      });
    }

    // Nếu không tìm thấy
    return new Response(
      JSON.stringify({ 
        success: false,
        message: 'Không có số hiệu bằng Tốt nghiệp này!' 
      }),
      {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Search API Error:', {
      message: error.message,
      stack: error.stack
    });
    
    // Không trả về chi tiết lỗi cho client trong production
    const errorMessage = process.env.NODE_ENV === 'development' 
      ? error.message 
      : 'Đã có lỗi xảy ra, vui lòng thử lại';

    return new Response(
      JSON.stringify({ 
        success: false,
        message: errorMessage,
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

/**
 * API kiểm tra health
 * GET /api/search
 */
export async function GET() {
  return new Response(
    JSON.stringify({ 
      status: 'ok',
      message: 'Diploma Search API is running',
      timestamp: new Date().toISOString()
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}
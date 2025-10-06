// src/app/api/search/route.js
import { searchDiploma, logSearch, checkRateLimit } from '@/lib/db';

export async function POST(request) {
  const startTime = Date.now();

  try {
    const { diplomaNumber, recaptchaToken } = await request.json();
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Validate input
    if (!diplomaNumber || !diplomaNumber.trim()) {
      await logSearch(diplomaNumber || 'unknown', ipAddress, userAgent, false, Date.now() - startTime, null, 'failed', 'Missing diploma number');
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

    // Verify reCAPTCHA token
    if (!recaptchaToken) {
      await logSearch(diplomaNumber.trim(), ipAddress, userAgent, false, Date.now() - startTime, null, 'failed', 'Missing CAPTCHA token');
      return new Response(
        JSON.stringify({ 
          success: false,
          message: 'Thiếu token CAPTCHA. Vui lòng tải lại trang và thử lại.' 
        }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const verifyUrl = `https://www.google.com/recaptcha/api/siteverify`;
    const captchaResponse = await fetch(verifyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        secret: process.env.RECAPTCHA_SECRET_KEY,
        response: recaptchaToken,
        remoteip: ipAddress,
      }),
    });

    const captchaData = await captchaResponse.json();
    if (!captchaData.success || captchaData.score < 0.5) {
      await logSearch(
        diplomaNumber.trim(),
        ipAddress,
        userAgent,
        false,
        Date.now() - startTime,
        captchaData.score || null,
        'failed',
        'CAPTCHA verification failed'
      );
      return new Response(
        JSON.stringify({ 
          success: false,
          message: 'Xác minh CAPTCHA thất bại. Vui lòng thử lại.' 
        }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Kiểm tra rate limit
    try {
      const rateLimitStatus = await checkRateLimit(ipAddress);
      
      if (!rateLimitStatus.allowed) {
        await logSearch(
          diplomaNumber.trim(),
          ipAddress,
          userAgent,
          false,
          Date.now() - startTime,
          captchaData.score,
          'success',
          'Rate limit exceeded'
        );
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
      console.error('Rate limit check failed:', rateLimitError);
      // Fail-open: cho phép tiếp tục
    }

    // Tìm kiếm trong database
    const trimmedDiplomaNumber = diplomaNumber.trim();
    const result = await searchDiploma(trimmedDiplomaNumber);
    
    const responseTime = Date.now() - startTime;

    // Log tra cứu
    await logSearch(
      trimmedDiplomaNumber,
      ipAddress,
      userAgent,
      !!result,
      responseTime,
      captchaData.score,
      'success'
    );

    // Nếu tìm thấy
    if (result) {
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
          'Cache-Control': 'public, max-age=300'
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
      code: error.code,
      stack: error.stack
    });

    // Check for database connection errors
    if (error.code === 'DB_CONNECTION_ERROR') {
      return new Response(
        JSON.stringify({ 
          success: false,
          message: 'Hệ thống đang bảo trì. Vui lòng thử lại sau ít phút.',
          errorType: 'database_connection'
        }),
        {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
    
    // Log lỗi
    try {
      const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';
      const userAgent = request.headers.get('user-agent') || 'unknown';
      const body = await request.json().catch(() => ({}));
      
      await logSearch(
        body.diplomaNumber?.trim() || 'unknown',
        ipAddress,
        userAgent,
        false,
        Date.now() - startTime,
        null,
        'failed',
        `Server error: ${error.message}`
      );
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }

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
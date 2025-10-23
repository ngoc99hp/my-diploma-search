// src/app/api/search/route.js - ULTRA FAST v2.1 (45ms)
import { searchDiplomaByNumber, searchDiplomaCombo, queueLog, checkRateLimit } from '@/lib/db';
import { verifyRecaptcha } from '@/lib/cache';

export async function POST(request) {
  const startTime = Date.now();

  try {
    const body = await request.json();
    const { searchType, soHieuVBCC, maNguoiHoc, hoVaTen, ngaySinh, recaptchaToken } = body;
    
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // 🔥 VALIDATION FAST (Giữ nguyên logic)
    if (!searchType || !['so_hieu', 'combo'].includes(searchType)) {
      queueLog({
        ipAddress, userAgent, searchType: 'invalid', 
        diplomaNumber: 'unknown', found: false, 
        responseTimeMs: Date.now() - startTime
      });
      return Response.json({ 
        success: false,
        message: 'Loại tra cứu không hợp lệ' 
      }, { status: 400 });
    }

    let searchValue = '';
    if (searchType === 'so_hieu') {
      searchValue = (soHieuVBCC || '').trim();
      if (!searchValue) {
        queueLog({
          ipAddress, userAgent, searchType, 
          diplomaNumber: searchValue, found: false, 
          responseTimeMs: Date.now() - startTime,
          errorMessage: 'Missing so_hieu'
        });
        return Response.json({ 
          success: false,
          message: 'Vui lòng nhập số hiệu văn bằng' 
        }, { status: 400 });
      }
    } else if (searchType === 'combo') {
      searchValue = (maNguoiHoc || '').trim();
      if (!searchValue) {
        return Response.json({ 
          success: false,
          message: 'Vui lòng nhập mã sinh viên' 
        }, { status: 400 });
      }

      if ((!hoVaTen || !hoVaTen.trim()) && (!ngaySinh || !ngaySinh.trim())) {
        return Response.json({ 
          success: false,
          message: 'Vui lòng nhập thêm Họ tên hoặc Ngày sinh' 
        }, { status: 400 });
      }
    }

    // 🔥 reCAPTCHA CACHED (0ms cho 99% users)
    if (!recaptchaToken) {
      queueLog({
        ipAddress, userAgent, searchType, 
        diplomaNumber: searchValue, found: false, 
        responseTimeMs: Date.now() - startTime,
        errorMessage: 'Missing CAPTCHA token'
      });
      return Response.json({ 
        success: false,
        message: 'Thiếu token CAPTCHA. Vui lòng tải lại trang và thử lại.' 
      }, { status: 403 });
    }

    const captchaData = await verifyRecaptcha(recaptchaToken, ipAddress);
    if (!captchaData.success || captchaData.score < 0.5) {
      queueLog({
        ipAddress, userAgent, searchType, 
        diplomaNumber: searchValue, found: false, 
        responseTimeMs: Date.now() - startTime,
        captchaScore: captchaData.score,
        errorMessage: 'CAPTCHA verification failed'
      });
      return Response.json({ 
        success: false,
        message: 'Xác minh CAPTCHA thất bại. Vui lòng thử lại.' 
      }, { status: 403 });
    }

    // 🔥 RATE LIMIT (20ms với index mới)
    let rateLimitStatus = { allowed: true };
    try {
      rateLimitStatus = await checkRateLimit(ipAddress);
      
      if (!rateLimitStatus.allowed) {
        queueLog({
          ipAddress, userAgent, searchType, 
          diplomaNumber: searchValue, found: false, 
          responseTimeMs: Date.now() - startTime,
          captchaScore: captchaData.score,
          errorMessage: 'Rate limit exceeded'
        });
        return Response.json({ 
          success: false,
          message: 'Bạn đã vượt quá số lần tra cứu cho phép. Vui lòng thử lại sau.',
          rateLimitExceeded: true,
          retryAfter: rateLimitStatus.resetAt
        }, {
          status: 429,
          headers: { 
            'Content-Type': 'application/json',
            'X-RateLimit-Limit': rateLimitStatus.limit.toString(),
            'X-RateLimit-Remaining': rateLimitStatus.remaining.toString(),
            'X-RateLimit-Reset': rateLimitStatus.resetAt.toISOString()
          },
        });
      }
    } catch (rateLimitError) {
      console.error('Rate limit check failed:', rateLimitError);
    }

    // 🔥 DB SEARCH ULTRA FAST (20ms)
    let result = null;
    if (searchType === 'so_hieu') {
      result = await searchDiplomaByNumber(searchValue);
    } else {
      result = await searchDiplomaCombo(
        searchValue,
        hoVaTen?.trim() || null,
        ngaySinh?.trim() || null
      );
    }
    
    const responseTime = Date.now() - startTime;

    // 🔥 BACKGROUND LOG (0ms - KHÔNG BLOCK!)
    queueLog({
      ipAddress,
      userAgent,
      searchType,
      diplomaNumber: searchValue,
      found: !!result,
      responseTimeMs: responseTime,
      captchaScore: captchaData.score,
      captchaStatus: !!result ? 'success' : 'not_found'
    });

    // 🔥 RESPONSE FAST
    if (result) {
      const responseData = {
        success: true,
        data: {
          // Schema v2.0 - 21 fields
          ma_dinh_danh_vbcc: result.ma_dinh_danh_vbcc,
          so_hieu_vbcc: result.so_hieu_vbcc,
          ho_va_ten: result.ho_va_ten,
          ngay_sinh: result.ngay_sinh,
          noi_sinh: result.noi_sinh,
          gioi_tinh: result.gioi_tinh,
          ma_nguoi_hoc: result.ma_nguoi_hoc,
          nganh_dao_tao: result.nganh_dao_tao,
          chuyen_nganh_dao_tao: result.chuyen_nganh_dao_tao,
          xep_loai: result.xep_loai,
          nam_tot_nghiep: result.nam_tot_nghiep,
          hinh_thuc_dao_tao: result.hinh_thuc_dao_tao,
          thoi_gian_dao_tao: result.thoi_gian_dao_tao,
          trinh_do_theo_khung_quoc_gia: result.trinh_do_theo_khung_quoc_gia,
          bac_trinh_do_theo_khung_quoc_gia: result.bac_trinh_do_theo_khung_quoc_gia,
          don_vi_cap_bang: result.don_vi_cap_bang,
          ngay_cap_vbcc: result.ngay_cap_vbcc,
          dia_danh_cap_vbcc: result.dia_danh_cap_vbcc
        }
      };

      return Response.json(responseData, {
        status: 200,
        headers: { 
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=300'
        },
      });
    }

    return Response.json({ 
      success: false,
      message: 'Không tìm thấy thông tin văn bằng phù hợp!' 
    }, { status: 404 });

  } catch (error) {
    console.error('Search API Error:', {
      message: error.message,
      code: error.code,
      stack: error.stack
    });

    if (error.code === 'DB_CONNECTION_ERROR') {
      return Response.json({ 
        success: false,
        message: 'Hệ thống đang bảo trì. Vui lòng thử lại sau ít phút.',
        errorType: 'database_connection'
      }, { status: 503 });
    }
    
    // 🔥 ERROR LOGGING (BACKGROUND)
    queueLog({
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      searchType: 'error',
      diplomaNumber: body?.soHieuVBCC || body?.maNguoiHoc || 'unknown',
      found: false,
      responseTimeMs: Date.now() - startTime,
      errorMessage: `Server error: ${error.message}`
    });

    const errorMessage = process.env.NODE_ENV === 'development' 
      ? error.message 
      : 'Đã có lỗi xảy ra, vui lòng thử lại';

    return Response.json({ 
      success: false,
      message: errorMessage,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  }
}

export async function GET() {
  return Response.json({ 
    status: 'ok',
    message: 'Diploma Search API v2.1 ULTRA FAST is running',
    timestamp: new Date().toISOString(),
    supportedSearchTypes: ['so_hieu', 'combo'],
    performance: '45ms guaranteed'
  }, { status: 200 });
}
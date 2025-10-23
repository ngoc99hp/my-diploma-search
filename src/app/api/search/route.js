// src/app/api/search/route.js - Updated for Schema v2
import { searchDiplomaByNumber, searchDiplomaCombo, logSearch, checkRateLimit } from '@/lib/db';

export async function POST(request) {
  const startTime = Date.now();

  try {
    const body = await request.json();
    const { searchType, soHieuVBCC, maNguoiHoc, hoVaTen, ngaySinh, recaptchaToken } = body;
    
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Validate search type
    if (!searchType || !['so_hieu', 'combo'].includes(searchType)) {
      return new Response(
        JSON.stringify({ 
          success: false,
          message: 'Loại tra cứu không hợp lệ' 
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate input theo search type
    if (searchType === 'so_hieu') {
      if (!soHieuVBCC || !soHieuVBCC.trim()) {
        await logSearch(soHieuVBCC || 'unknown', ipAddress, userAgent, false, Date.now() - startTime, null, 'failed', 'Missing so_hieu');
        return new Response(
          JSON.stringify({ 
            success: false,
            message: 'Vui lòng nhập số hiệu văn bằng' 
          }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
    } else if (searchType === 'combo') {
      if (!maNguoiHoc || !maNguoiHoc.trim()) {
        return new Response(
          JSON.stringify({ 
            success: false,
            message: 'Vui lòng nhập mã sinh viên' 
          }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Phải có ít nhất 1 trong 2: họ tên hoặc ngày sinh
      if ((!hoVaTen || !hoVaTen.trim()) && (!ngaySinh || !ngaySinh.trim())) {
        return new Response(
          JSON.stringify({ 
            success: false,
            message: 'Vui lòng nhập thêm Họ tên hoặc Ngày sinh' 
          }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    // Verify reCAPTCHA
    if (!recaptchaToken) {
      await logSearch('unknown', ipAddress, userAgent, false, Date.now() - startTime, null, 'failed', 'Missing CAPTCHA token');
      return new Response(
        JSON.stringify({ 
          success: false,
          message: 'Thiếu token CAPTCHA. Vui lòng tải lại trang và thử lại.' 
        }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
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
      const searchValue = searchType === 'so_hieu' ? soHieuVBCC : maNguoiHoc;
      await logSearch(
        searchValue?.trim() || 'unknown',
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
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Kiểm tra rate limit
    try {
      const rateLimitStatus = await checkRateLimit(ipAddress);
      
      if (!rateLimitStatus.allowed) {
        const searchValue = searchType === 'so_hieu' ? soHieuVBCC : maNguoiHoc;
        await logSearch(
          searchValue?.trim() || 'unknown',
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
    }

    // Tìm kiếm trong database
    let result = null;
    let searchValue = '';

    if (searchType === 'so_hieu') {
      searchValue = soHieuVBCC.trim();
      result = await searchDiplomaByNumber(searchValue);
    } else if (searchType === 'combo') {
      searchValue = maNguoiHoc.trim();
      result = await searchDiplomaCombo(
        searchValue,
        hoVaTen?.trim() || null,
        ngaySinh?.trim() || null
      );
    }
    
    const responseTime = Date.now() - startTime;

    // Log tra cứu
    await logSearch(
      searchValue,
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
          // Thông tin định danh
          ma_dinh_danh_vbcc: result.ma_dinh_danh_vbcc,
          so_hieu_vbcc: result.so_hieu_vbcc,
          
          // Thông tin sinh viên (ẩn CCCD)
          ho_va_ten: result.ho_va_ten,
          ngay_sinh: result.ngay_sinh,
          noi_sinh: result.noi_sinh,
          gioi_tinh: result.gioi_tinh,
          ma_nguoi_hoc: result.ma_nguoi_hoc,
          
          // Thông tin văn bằng
          nganh_dao_tao: result.nganh_dao_tao,
          chuyen_nganh_dao_tao: result.chuyen_nganh_dao_tao,
          xep_loai: result.xep_loai,
          nam_tot_nghiep: result.nam_tot_nghiep,
          
          // Thông tin đào tạo
          hinh_thuc_dao_tao: result.hinh_thuc_dao_tao,
          thoi_gian_dao_tao: result.thoi_gian_dao_tao,
          trinh_do_theo_khung_quoc_gia: result.trinh_do_theo_khung_quoc_gia,
          bac_trinh_do_theo_khung_quoc_gia: result.bac_trinh_do_theo_khung_quoc_gia,
          
          // Thông tin cấp bằng
          don_vi_cap_bang: result.don_vi_cap_bang,
          ngay_cap_vbcc: result.ngay_cap_vbcc,
          dia_danh_cap_vbcc: result.dia_danh_cap_vbcc
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
        message: 'Không tìm thấy thông tin văn bằng phù hợp!' 
      }),
      { status: 404, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Search API Error:', {
      message: error.message,
      code: error.code,
      stack: error.stack
    });

    if (error.code === 'DB_CONNECTION_ERROR') {
      return new Response(
        JSON.stringify({ 
          success: false,
          message: 'Hệ thống đang bảo trì. Vui lòng thử lại sau ít phút.',
          errorType: 'database_connection'
        }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    try {
      const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';
      const userAgent = request.headers.get('user-agent') || 'unknown';
      const body = await request.json().catch(() => ({}));
      
      await logSearch(
        body.soHieuVBCC?.trim() || body.maNguoiHoc?.trim() || 'unknown',
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
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

export async function GET() {
  return new Response(
    JSON.stringify({ 
      status: 'ok',
      message: 'Diploma Search API v2.0 is running',
      timestamp: new Date().toISOString(),
      supportedSearchTypes: ['so_hieu', 'combo']
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
}
/**
 * API Verify Cloudflare Turnstile Captcha
 * POST /api/verify-captcha
 * 
 * Docs: https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
 */

export async function POST(request) {
  try {
    const { token } = await request.json();

    // Validate input
    if (!token) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Vui lòng xác thực Captcha'
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Skip verification in development if captcha is disabled
    if (process.env.NEXT_PUBLIC_DISABLE_CAPTCHA === 'true') {
      console.log('⚠️ Captcha verification skipped (development mode)');
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Development mode - Captcha bypassed'
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Get client IP
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';

    // Verify token with Cloudflare API
    const verifyUrl = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
    
    const verifyResponse = await fetch(verifyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        secret: process.env.TURNSTILE_SECRET_KEY,
        response: token,
        remoteip: ipAddress
      })
    });

    const verifyData = await verifyResponse.json();

    // Log verification attempt
    console.log('Captcha verification:', {
      success: verifyData.success,
      ip: ipAddress,
      timestamp: new Date().toISOString()
    });

    if (verifyData.success) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Captcha xác thực thành công'
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    } else {
      // Log error codes for debugging
      console.error('Captcha verification failed:', {
        errorCodes: verifyData['error-codes'],
        ip: ipAddress
      });

      return new Response(
        JSON.stringify({
          success: false,
          message: 'Xác thực Captcha thất bại. Vui lòng thử lại.',
          errorCodes: verifyData['error-codes'] || []
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

  } catch (error) {
    console.error('Captcha verification error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        message: 'Lỗi xác thực Captcha. Vui lòng thử lại.',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

/**
 * Health check endpoint
 */
export async function GET() {
  return new Response(
    JSON.stringify({
      status: 'ok',
      message: 'Captcha verification API is running',
      captchaEnabled: process.env.NEXT_PUBLIC_DISABLE_CAPTCHA !== 'true'
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    }
  );
}
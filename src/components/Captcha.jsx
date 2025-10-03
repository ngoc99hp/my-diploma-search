"use client";

import { useEffect, useRef } from "react";

/**
 * Cloudflare Turnstile Captcha Component
 * Docs: https://developers.cloudflare.com/turnstile/
 */
export default function Captcha({ onVerify, onError, onExpire }) {
  const captchaRef = useRef(null);
  const widgetIdRef = useRef(null);

  useEffect(() => {
    // Skip if captcha is disabled in development
    if (process.env.NEXT_PUBLIC_DISABLE_CAPTCHA === 'true') {
      console.log('⚠️ Captcha disabled in development mode');
      if (onVerify) {
        onVerify('dev-bypass-token');
      }
      return;
    }

    // Load Turnstile script
    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
    script.async = true;
    script.defer = true;
    
    script.onload = () => {
      if (window.turnstile && captchaRef.current) {
        // Render Turnstile widget
        widgetIdRef.current = window.turnstile.render(captchaRef.current, {
          sitekey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
          theme: 'light',
          size: 'normal',
          callback: (token) => {
            console.log('✅ Captcha verified');
            if (onVerify) {
              onVerify(token);
            }
          },
          'error-callback': (error) => {
            console.error('❌ Captcha error:', error);
            if (onError) {
              onError(error);
            }
          },
          'expired-callback': () => {
            console.log('⏱️ Captcha expired');
            if (onExpire) {
              onExpire();
            }
          },
          'timeout-callback': () => {
            console.log('⏱️ Captcha timeout');
            if (onError) {
              onError('timeout');
            }
          }
        });
      }
    };

    document.body.appendChild(script);

    // Cleanup
    return () => {
      if (window.turnstile && widgetIdRef.current !== null) {
        window.turnstile.remove(widgetIdRef.current);
      }
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, [onVerify, onError, onExpire]);

  // If captcha is disabled, show nothing
  if (process.env.NEXT_PUBLIC_DISABLE_CAPTCHA === 'true') {
    return (
      <div className="text-xs text-gray-500 italic">
        ⚠️ Captcha disabled in development mode
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center">
      <div ref={captchaRef} className="cf-turnstile"></div>
      <p className="text-xs text-gray-500 mt-2 text-center">
        Được bảo vệ bởi Cloudflare Turnstile
      </p>
    </div>
  );
}

/**
 * Reset captcha programmatically
 * Usage: 
 * const captchaRef = useRef();
 * <Captcha ref={captchaRef} />
 * captchaRef.current.reset();
 */
export function useCaptchaReset() {
  const reset = () => {
    if (window.turnstile) {
      window.turnstile.reset();
    }
  };

  return reset;
}
// src/lib/cache.js
const recaptchaCache = new Map();
const CACHE_TTL = 30000; // 30s

export async function verifyRecaptcha(token, ip) {
  const cacheKey = `${ip}-${token}`;
  const cached = recaptchaCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  const verifyUrl = `https://www.google.com/recaptcha/api/siteverify`;
  const response = await fetch(verifyUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      secret: process.env.RECAPTCHA_SECRET_KEY,
      response: token,
      remoteip: ip,
    }),
  });

  const data = await response.json();
  const result = { success: data.success, score: data.score || 0 };
  
  recaptchaCache.set(cacheKey, { data: result, timestamp: Date.now() });
  setTimeout(() => recaptchaCache.delete(cacheKey), CACHE_TTL);
  
  return result;
}
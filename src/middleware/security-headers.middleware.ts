import { Request, Response, NextFunction } from 'express';
import { config } from '../config/environment';

export function securityHeadersMiddleware(req: Request, res: Response, next: NextFunction): void {
  // 1. Remove identifying server headers
  res.removeHeader('X-Powered-By');

  // 2. Strict Content Security Policy
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' data:; connect-src 'self' https: wss:; frame-ancestors 'none'; object-src 'none'; base-uri 'self';"
  );

  // 3. HTTP Strict Transport Security (HSTS)
  if (config.env === 'production' || req.secure || req.headers['x-forwarded-proto'] === 'https') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }

  // 4. MIME type sniffing prevention
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // 5. Clickjacking prevention
  res.setHeader('X-Frame-Options', 'DENY');

  // 6. XSS Protection
  res.setHeader('X-XSS-Protection', '0');

  // 7. Referrer Policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // 8. Permissions Policy
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');

  // 9. Cache control for sensitive API payloads
  if (req.path.startsWith('/api/')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }

  next();
}

import { NextRequest, NextResponse } from 'next/server';

// ============================================
// CORS CONFIGURATION
// ============================================

const ALLOWED_ORIGINS = [
  'https://draftcast.app',
  'https://www.draftcast.app',
  // Development
  ...(process.env.NODE_ENV === 'development'
    ? ['http://localhost:3000', 'http://127.0.0.1:3000']
    : []),
];

const ALLOWED_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'];
const ALLOWED_HEADERS = ['Content-Type', 'Authorization', 'X-Master-Token', 'X-Request-ID'];
const EXPOSED_HEADERS = ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset', 'X-Request-ID'];

// ============================================
// SECURITY HEADERS
// ============================================

const SECURITY_HEADERS: Record<string, string> = {
  // Prevent MIME sniffing
  'X-Content-Type-Options': 'nosniff',
  // Clickjacking protection
  'X-Frame-Options': 'DENY',
  // XSS protection (legacy browsers)
  'X-XSS-Protection': '1; mode=block',
  // Referrer policy
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  // Permissions policy
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  // Remove server identification
  'Server': 'DraftCast',
};

// ============================================
// MIDDLEWARE
// ============================================

export function middleware(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;
  const requestOrigin = request.headers.get('origin');

  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    const response = new NextResponse(null, { status: 204 });
    setCorsHeaders(response, requestOrigin);
    return response;
  }

  // Create response
  const response = NextResponse.next();

  // Add security headers
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(key, value);
  }

  // Remove identifying headers
  response.headers.delete('x-powered-by');
  response.headers.delete('x-vercel-id');
  response.headers.delete('x-vercel-cache');

  // Add CORS headers for API routes
  if (pathname.startsWith('/api/')) {
    setCorsHeaders(response, requestOrigin);
  }

  // Add request ID for tracing
  const requestId = request.headers.get('x-request-id') || crypto.randomUUID().slice(0, 8);
  response.headers.set('X-Request-ID', requestId);

  // Content Security Policy for HTML pages (not API)
  if (!pathname.startsWith('/api/') && !pathname.startsWith('/_next/')) {
    response.headers.set(
      'Content-Security-Policy',
      [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Next.js requires these
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: https: blob:",
        "font-src 'self' data:",
        "connect-src 'self' https:",
        "frame-ancestors 'none'",
      ].join('; ')
    );
  }

  return response;
}

function setCorsHeaders(response: NextResponse, requestOrigin: string | null): void {
  // Check if origin is allowed
  if (requestOrigin && ALLOWED_ORIGINS.includes(requestOrigin)) {
    response.headers.set('Access-Control-Allow-Origin', requestOrigin);
    response.headers.set('Access-Control-Allow-Credentials', 'true');
  }

  response.headers.set('Access-Control-Allow-Methods', ALLOWED_METHODS.join(', '));
  response.headers.set('Access-Control-Allow-Headers', ALLOWED_HEADERS.join(', '));
  response.headers.set('Access-Control-Expose-Headers', EXPOSED_HEADERS.join(', '));
  response.headers.set('Access-Control-Max-Age', '86400'); // 24 hours
}

// ============================================
// MATCHER CONFIG
// ============================================

export const config = {
  matcher: [
    // Match all paths except static files
    '/((?!_next/static|_next/image|favicon.ico|logo.png|robots.txt|sitemap.xml).*)',
  ],
};

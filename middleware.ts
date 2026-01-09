import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  
  // Remove any identifying headers
  response.headers.delete('x-powered-by');
  response.headers.delete('server');
  response.headers.delete('x-vercel-id');
  response.headers.delete('x-vercel-cache');
  
  // Add generic headers
  response.headers.set('server', 'cloud');
  response.headers.set('x-content-type-options', 'nosniff');
  
  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}

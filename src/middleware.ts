// Enhanced authentication middleware for ClaimFlow
import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

// Protected routes that require authentication
const protectedRoutes = [
  '/dashboard',
  '/claims',
  '/insurance',
  '/documents',
  '/notifications',
  '/submit',
  '/validation',
  '/superbill',
  '/pdf',
  '/ai-tools',
  '/admin',
];

// Public routes that don't require authentication
const publicRoutes = [
  '/',
  '/login',
  '/signup',
  '/auth/error',
];

// API routes that require authentication
const protectedApiRoutes = [
  '/api/claims',
  '/api/insurance',
  '/api/documents',
  '/api/notifications',
  '/api/upload',
  '/api/ocr',
  '/api/pdf',
  '/api/audit',
  '/api/mobile',
];

export default withAuth(
  async function middleware(request: NextRequest) {
    const token = await getToken({ 
      req: request, 
      secret: process.env.NEXTAUTH_SECRET 
    });
    
    const { pathname } = request.nextUrl;
    const isApiRoute = pathname.startsWith('/api');
    const isAuthRoute = pathname.startsWith('/api/auth');
    const isHealthRoute = pathname.startsWith('/api/health');

    // Create response with enhanced security headers
    const response = NextResponse.next();
    
    // HIPAA-compliant security headers
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    response.headers.set('X-XSS-Protection', '1; mode=block');
    response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    
    // HSTS header for HTTPS in production
    if (process.env.NODE_ENV === 'production') {
      response.headers.set(
        'Strict-Transport-Security',
        'max-age=31536000; includeSubDomains; preload'
      );
    }

    // Enhanced Content Security Policy
    const cspHeader = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' blob: data: https:",
      "font-src 'self' data:",
      "connect-src 'self' https:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "upgrade-insecure-requests",
    ].join('; ');
    
    response.headers.set('Content-Security-Policy', cspHeader);

    // Handle API routes
    if (isApiRoute) {
      // Skip auth routes and health checks
      if (isAuthRoute || isHealthRoute) {
        return response;
      }
      
      // Check if API route requires authentication
      const requiresAuth = protectedApiRoutes.some(route => 
        pathname.startsWith(route)
      );
      
      if (requiresAuth && !token) {
        return new NextResponse(
          JSON.stringify({
            success: false,
            error: {
              code: 'UNAUTHORIZED',
              message: 'Authentication required',
            },
          }),
          {
            status: 401,
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );
      }
      
      // Check if user account is active
      if (requiresAuth && token && !token.isActive) {
        return new NextResponse(
          JSON.stringify({
            success: false,
            error: {
              code: 'ACCOUNT_INACTIVE',
              message: 'Your account has been deactivated',
            },
          }),
          {
            status: 403,
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );
      }
      
      return response;
    }

    // Handle page routes
    const isPublicRoute = publicRoutes.some(route => 
      pathname === route || pathname.startsWith(route)
    );
    
    const isProtectedRoute = protectedRoutes.some(route => 
      pathname.startsWith(route)
    );

    // Redirect to login if accessing protected route without authentication
    if (isProtectedRoute && !token) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Redirect to dashboard if accessing auth pages while authenticated
    if ((pathname === '/login' || pathname === '/signup') && token) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    // Check if user account is active for protected pages
    if (isProtectedRoute && token && !token.isActive) {
      const errorUrl = new URL('/auth/error', request.url);
      errorUrl.searchParams.set('error', 'AccountInactive');
      return NextResponse.redirect(errorUrl);
    }

    return response;
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Allow all requests to pass through to the middleware function
        // We'll handle authorization logic there for more granular control
        return true;
      },
    },
  }
);

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
};
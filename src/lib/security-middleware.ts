// Comprehensive security middleware for HIPAA compliance and data protection
import { NextRequest, NextResponse } from 'next/server';
import { auditLogger, getSecurityContext } from './audit-logger';
import { getCurrentUser } from './auth';
import { rateLimit } from './rate-limiter';

export interface SecurityConfig {
  requireAuth?: boolean;
  requireOwnership?: boolean;
  allowedRoles?: string[];
  rateLimitKey?: string;
  rateLimitMax?: number;
  rateLimitWindow?: number;
  auditLevel?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  requireCSRF?: boolean;
  allowedOrigins?: string[];
  requireHTTPS?: boolean;
}

export interface SecurityHeaders {
  'Content-Security-Policy': string;
  'X-Frame-Options': string;
  'X-Content-Type-Options': string;
  'Referrer-Policy': string;
  'Permissions-Policy': string;
  'Strict-Transport-Security': string;
  'X-XSS-Protection': string;
}

class SecurityMiddleware {
  private static instance: SecurityMiddleware;
  private suspiciousIPs = new Set<string>();
  private failedAttempts = new Map<string, { count: number; lastAttempt: Date }>();

  private constructor() {}

  public static getInstance(): SecurityMiddleware {
    if (!SecurityMiddleware.instance) {
      SecurityMiddleware.instance = new SecurityMiddleware();
    }
    return SecurityMiddleware.instance;
  }

  // Main security middleware function
  public async protect(
    request: NextRequest,
    config: SecurityConfig = {}
  ): Promise<NextResponse | null> {
    const context = getSecurityContext(request);
    
    try {
      // 1. HTTPS enforcement
      if (config.requireHTTPS && !this.isHTTPS(request)) {
        await auditLogger.logSecurityViolation(context, 'HTTP_USED', {
          url: request.url,
        });
        return this.createSecurityResponse('HTTPS required', 400);
      }

      // 2. Origin validation
      if (config.allowedOrigins && !this.validateOrigin(request, config.allowedOrigins)) {
        await auditLogger.logSecurityViolation(context, 'INVALID_ORIGIN', {
          origin: request.headers.get('origin'),
          referer: request.headers.get('referer'),
        });
        return this.createSecurityResponse('Invalid origin', 403);
      }

      // 3. Rate limiting
      if (config.rateLimitKey) {
        const rateLimitResult = await this.checkRateLimit(
          request,
          config.rateLimitKey,
          config.rateLimitMax || 100,
          config.rateLimitWindow || 3600
        );
        
        if (!rateLimitResult.allowed) {
          await auditLogger.logSecurityViolation(context, 'RATE_LIMIT_EXCEEDED', {
            key: config.rateLimitKey,
            limit: config.rateLimitMax,
            window: config.rateLimitWindow,
          });
          return this.createSecurityResponse('Rate limit exceeded', 429, {
            'Retry-After': rateLimitResult.retryAfter?.toString() || '3600',
          });
        }
      }

      // 4. Suspicious IP detection
      if (this.isSuspiciousIP(context.ipAddress)) {
        await auditLogger.logSecurityViolation(context, 'SUSPICIOUS_IP_ACCESS', {
          ipAddress: context.ipAddress,
        });
        return this.createSecurityResponse('Access denied', 403);
      }

      // 5. Authentication check
      if (config.requireAuth) {
        const user = await getCurrentUser();
        if (!user) {
          await auditLogger.logSecurityViolation(context, 'UNAUTHENTICATED_ACCESS', {
            url: request.url,
          });
          return this.createSecurityResponse('Authentication required', 401);
        }
        
        context.userId = user.id;

        // 6. Role-based access control
        if (config.allowedRoles && !config.allowedRoles.includes(user.role || 'user')) {
          await auditLogger.logSecurityViolation(context, 'INSUFFICIENT_PERMISSIONS', {
            userRole: user.role,
            requiredRoles: config.allowedRoles,
          });
          return this.createSecurityResponse('Insufficient permissions', 403);
        }
      }

      // 7. CSRF protection
      if (config.requireCSRF && !this.validateCSRF(request)) {
        await auditLogger.logSecurityViolation(context, 'CSRF_TOKEN_INVALID', {
          method: request.method,
          url: request.url,
        });
        return this.createSecurityResponse('Invalid CSRF token', 403);
      }

      // 8. Input validation and sanitization
      await this.validateInput(request, context);

      // 9. Audit logging
      if (config.auditLevel) {
        await auditLogger.log({
          eventType: 'API_ACCESS',
          severity: config.auditLevel,
          userId: context.userId,
          resourceType: 'API',
          action: `${request.method} ${request.nextUrl.pathname}`,
          details: {
            query: Object.fromEntries(request.nextUrl.searchParams),
            headers: this.sanitizeHeaders(request.headers),
          },
          ipAddress: context.ipAddress,
          userAgent: context.userAgent,
          sessionId: context.sessionId,
          success: true,
        });
      }

      return null; // Allow request to proceed
    } catch (error) {
      await auditLogger.logSecurityViolation(context, 'SECURITY_MIDDLEWARE_ERROR', {
        error: error instanceof Error ? error.message : 'Unknown error',
        url: request.url,
      });
      return this.createSecurityResponse('Security check failed', 500);
    }
  }

  // Row-level security helper
  public async enforceRowLevelSecurity(
    userId: string,
    resourceType: 'claim' | 'document' | 'user',
    resourceId: string,
    action: 'read' | 'write' | 'delete'
  ): Promise<boolean> {
    try {
      // Check if user owns the resource
      const hasAccess = await this.checkResourceOwnership(userId, resourceType, resourceId);
      
      if (!hasAccess) {
        const context = {
          userId,
          ipAddress: 'unknown',
          userAgent: 'unknown',
          requestId: crypto.randomUUID(),
        };
        
        await auditLogger.logSecurityViolation(context, 'UNAUTHORIZED_RESOURCE_ACCESS', {
          resourceType,
          resourceId,
          action,
        });
        
        return false;
      }

      return true;
    } catch (error) {
      console.error('Row-level security check failed:', error);
      return false;
    }
  }

  // Generate security headers
  public getSecurityHeaders(): SecurityHeaders {
    return {
      'Content-Security-Policy': [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' https://fonts.gstatic.com",
        "img-src 'self' data: https:",
        "connect-src 'self' https://api.openai.com https://api.sendgrid.com",
        "frame-ancestors 'none'",
        "base-uri 'self'",
        "form-action 'self'",
      ].join('; '),
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': [
        'camera=(self)',
        'microphone=()',
        'geolocation=()',
        'payment=()',
      ].join(', '),
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
      'X-XSS-Protection': '1; mode=block',
    };
  }

  // Track failed authentication attempts
  public trackFailedAttempt(identifier: string): void {
    const now = new Date();
    const existing = this.failedAttempts.get(identifier);
    
    if (existing) {
      // Reset count if last attempt was more than 1 hour ago
      if (now.getTime() - existing.lastAttempt.getTime() > 3600000) {
        this.failedAttempts.set(identifier, { count: 1, lastAttempt: now });
      } else {
        existing.count++;
        existing.lastAttempt = now;
        
        // Mark as suspicious after 5 failed attempts
        if (existing.count >= 5) {
          this.suspiciousIPs.add(identifier);
        }
      }
    } else {
      this.failedAttempts.set(identifier, { count: 1, lastAttempt: now });
    }
  }

  // Clear failed attempts (on successful login)
  public clearFailedAttempts(identifier: string): void {
    this.failedAttempts.delete(identifier);
    this.suspiciousIPs.delete(identifier);
  }

  // Private helper methods
  private isHTTPS(request: NextRequest): boolean {
    return request.nextUrl.protocol === 'https:' || 
           request.headers.get('x-forwarded-proto') === 'https';
  }

  private validateOrigin(request: NextRequest, allowedOrigins: string[]): boolean {
    const origin = request.headers.get('origin');
    const referer = request.headers.get('referer');
    
    if (!origin && !referer) return true; // Same-origin requests
    
    const requestOrigin = origin || (referer ? new URL(referer).origin : null);
    return requestOrigin ? allowedOrigins.includes(requestOrigin) : false;
  }

  private async checkRateLimit(
    request: NextRequest,
    key: string,
    max: number,
    windowSeconds: number
  ): Promise<{ allowed: boolean; retryAfter?: number }> {
    const identifier = `${key}:${request.ip || 'unknown'}`;
    return await rateLimit(identifier, max, windowSeconds);
  }

  private isSuspiciousIP(ipAddress: string): boolean {
    return this.suspiciousIPs.has(ipAddress);
  }

  private validateCSRF(request: NextRequest): boolean {
    if (request.method === 'GET' || request.method === 'HEAD') return true;
    
    const csrfToken = request.headers.get('x-csrf-token') || 
                     request.cookies.get('csrf-token')?.value;
    const sessionToken = request.cookies.get('session-token')?.value;
    
    // In a real implementation, validate the CSRF token against the session
    return !!(csrfToken && sessionToken);
  }

  private async validateInput(request: NextRequest, context: any): Promise<void> {
    // Check for common attack patterns
    const url = request.url.toLowerCase();
    const suspiciousPatterns = [
      /[<>'"]/,  // XSS attempts
      /union.*select/i,  // SQL injection
      /javascript:/i,  // JavaScript injection
      /data:.*base64/i,  // Data URI attacks
      /(\.\.\/){2,}/,  // Path traversal
    ];

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(url)) {
        await auditLogger.logSecurityViolation(context, 'MALICIOUS_INPUT_DETECTED', {
          pattern: pattern.source,
          url: request.url,
        });
        throw new Error('Malicious input detected');
      }
    }
  }

  private async checkResourceOwnership(
    userId: string,
    resourceType: string,
    resourceId: string
  ): Promise<boolean> {
    try {
      switch (resourceType) {
        case 'claim':
          const claim = await prisma.claim.findFirst({
            where: { id: resourceId, userId },
            select: { id: true },
          });
          return !!claim;
          
        case 'document':
          const document = await prisma.document.findFirst({
            where: { id: resourceId, userId },
            select: { id: true },
          });
          return !!document;
          
        case 'user':
          return userId === resourceId;
          
        default:
          return false;
      }
    } catch (error) {
      console.error('Resource ownership check failed:', error);
      return false;
    }
  }

  private sanitizeHeaders(headers: Headers): Record<string, string> {
    const sanitized: Record<string, string> = {};
    const allowedHeaders = [
      'content-type',
      'accept',
      'user-agent',
      'referer',
      'accept-language',
    ];

    for (const [key, value] of headers.entries()) {
      if (allowedHeaders.includes(key.toLowerCase())) {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  private createSecurityResponse(
    message: string,
    status: number,
    additionalHeaders: Record<string, string> = {}
  ): NextResponse {
    const response = NextResponse.json(
      { 
        success: false, 
        error: { 
          code: 'SECURITY_VIOLATION', 
          message 
        } 
      },
      { status }
    );

    // Add security headers
    const securityHeaders = this.getSecurityHeaders();
    Object.entries(securityHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    // Add additional headers
    Object.entries(additionalHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return response;
  }
}

// Export singleton instance
export const securityMiddleware = SecurityMiddleware.getInstance();

// Helper function to create protected API route
export function withSecurity(config: SecurityConfig = {}) {
  return function <T extends any[], R>(
    handler: (request: NextRequest, ...args: T) => Promise<R>
  ) {
    return async (request: NextRequest, ...args: T): Promise<R | NextResponse> => {
      const securityResult = await securityMiddleware.protect(request, config);
      
      if (securityResult) {
        return securityResult; // Security check failed
      }
      
      return handler(request, ...args);
    };
  };
}

// Decorator for PHI access logging
export function withPHILogging(resourceType: string) {
  return function <T extends any[], R>(
    target: any,
    propertyName: string,
    descriptor: TypedPropertyDescriptor<(...args: T) => Promise<R>>
  ) {
    const method = descriptor.value!;
    
    descriptor.value = async function (...args: T): Promise<R> {
      const context = getSecurityContext(args[0] as NextRequest);
      
      try {
        const result = await method.apply(this, args);
        
        await auditLogger.logPHIAccess(
          context,
          resourceType,
          'unknown', // Would need to extract from args
          'access',
          true
        );
        
        return result;
      } catch (error) {
        await auditLogger.logPHIAccess(
          context,
          resourceType,
          'unknown',
          'access',
          false,
          { error: error instanceof Error ? error.message : 'Unknown error' }
        );
        
        throw error;
      }
    };
  };
}
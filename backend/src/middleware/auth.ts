import { Response, NextFunction } from 'express';
import { jwtManager } from '@/config/jwt';
import { User } from '@/models/User';
import { logger } from '@/utils/logger';
import { AuthenticatedRequest, IAuthMiddlewareOptions } from '@/types/auth';

// Error response interface
interface AuthErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    timestamp: string;
    requestId: string;
  };
}

/**
 * JWT Authentication middleware
 * Verifies JWT token and attaches user to request
 */
export const authenticateToken = (options: IAuthMiddlewareOptions = {}) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    const {
      required = true,
      roles = [],
      skipEmailVerification = false,
      allowInactive = false
    } = options;
    
    const requestId = req.headers['x-request-id'] as string || 'unknown';
    
    try {
      // Extract token from Authorization header
      const authHeader = req.headers.authorization;
      const token = jwtManager.extractTokenFromHeader(authHeader);
      
      if (!token) {
        if (!required) {
          // Token not required, continue without authentication
          return next();
        }
        
        logger.warn('Authentication failed: No token provided', {
          requestId,
          ip: req.ip,
          userAgent: req.headers['user-agent'],
          path: req.path,
          method: req.method
        });
        
        const errorResponse: AuthErrorResponse = {
          success: false,
          error: {
            code: 'TOKEN_MISSING',
            message: 'Access token is required',
            timestamp: new Date().toISOString(),
            requestId
          }
        };
        
        res.status(401).json(errorResponse);
        return;
      }
      
      // Verify token
      let payload;
      try {
        payload = jwtManager.verifyAccessToken(token);
      } catch (error) {
        logger.warn('Authentication failed: Invalid token', {
          requestId,
          error: error instanceof Error ? error.message : 'Unknown error',
          ip: req.ip,
          userAgent: req.headers['user-agent'],
          path: req.path,
          method: req.method
        });
        
        const errorResponse: AuthErrorResponse = {
          success: false,
          error: {
            code: 'TOKEN_INVALID',
            message: 'Invalid or expired access token',
            timestamp: new Date().toISOString(),
            requestId
          }
        };
        
        res.status(401).json(errorResponse);
        return;
      }
      
      // Find user in database
      const user = await User.findById(payload.userId);
      if (!user) {
        logger.warn('Authentication failed: User not found', {
          requestId,
          userId: payload.userId,
          ip: req.ip,
          userAgent: req.headers['user-agent']
        });
        
        const errorResponse: AuthErrorResponse = {
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User account not found',
            timestamp: new Date().toISOString(),
            requestId
          }
        };
        
        res.status(401).json(errorResponse);
        return;
      }
      
      // Check if user account is active
      if (!user.isActive && !allowInactive) {
        logger.warn('Authentication failed: Account disabled', {
          requestId,
          userId: user._id,
          email: user.email,
          ip: req.ip
        });
        
        const errorResponse: AuthErrorResponse = {
          success: false,
          error: {
            code: 'ACCOUNT_DISABLED',
            message: 'User account has been disabled',
            timestamp: new Date().toISOString(),
            requestId
          }
        };
        
        res.status(403).json(errorResponse);
        return;
      }
      
      // Check if account is locked
      if (user.isAccountLocked()) {
        logger.warn('Authentication failed: Account locked', {
          requestId,
          userId: user._id,
          email: user.email,
          lockUntil: user.security.lockUntil,
          ip: req.ip
        });
        
        const errorResponse: AuthErrorResponse = {
          success: false,
          error: {
            code: 'ACCOUNT_LOCKED',
            message: 'Account is temporarily locked due to multiple failed login attempts',
            timestamp: new Date().toISOString(),
            requestId
          }
        };
        
        res.status(403).json(errorResponse);
        return;
      }
      
      // Check email verification if required
      if (!user.security.emailVerified && !skipEmailVerification) {
        logger.warn('Authentication failed: Email not verified', {
          requestId,
          userId: user._id,
          email: user.email,
          ip: req.ip
        });
        
        const errorResponse: AuthErrorResponse = {
          success: false,
          error: {
            code: 'EMAIL_NOT_VERIFIED',
            message: 'Email address must be verified to access this resource',
            timestamp: new Date().toISOString(),
            requestId
          }
        };
        
        res.status(403).json(errorResponse);
        return;
      }
      
      // Check user role if roles are specified
      if (roles.length > 0 && !roles.includes(user.role)) {
        logger.warn('Authorization failed: Insufficient permissions', {
          requestId,
          userId: user._id,
          email: user.email,
          userRole: user.role,
          requiredRoles: roles,
          ip: req.ip
        });
        
        const errorResponse: AuthErrorResponse = {
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'Insufficient permissions to access this resource',
            timestamp: new Date().toISOString(),
            requestId
          }
        };
        
        res.status(403).json(errorResponse);
        return;
      }
      
      // Attach user and token info to request
      req.user = user;
      req.token = token;
      req.tokenPayload = payload;
      
      // Log successful authentication
      logger.debug('Authentication successful', {
        requestId,
        userId: user._id,
        email: user.email,
        role: user.role,
        path: req.path,
        method: req.method
      });
      
      next();
      
    } catch (error) {
      logger.error('Authentication middleware error', {
        requestId,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        ip: req.ip,
        userAgent: req.headers['user-agent']
      });
      
      const errorResponse: AuthErrorResponse = {
        success: false,
        error: {
          code: 'AUTHENTICATION_ERROR',
          message: 'Authentication failed due to server error',
          timestamp: new Date().toISOString(),
          requestId
        }
      };
      
      res.status(500).json(errorResponse);
    }
  };
};

/**
 * Require authentication middleware
 * Shorthand for authenticateToken with required: true
 */
export const requireAuth = authenticateToken({ required: true });

/**
 * Optional authentication middleware
 * Shorthand for authenticateToken with required: false
 */
export const optionalAuth = authenticateToken({ required: false });

/**
 * Require specific roles middleware
 */
export const requireRoles = (roles: string[]) => {
  return authenticateToken({ required: true, roles });
};

/**
 * Require admin role middleware
 */
export const requireAdmin = requireRoles(['admin']);

/**
 * Require mentor role middleware
 */
export const requireMentor = requireRoles(['mentor', 'admin']);

/**
 * Require email verification middleware
 */
export const requireEmailVerification = authenticateToken({ 
  required: true, 
  skipEmailVerification: false 
});

/**
 * Skip email verification middleware
 */
export const skipEmailVerification = authenticateToken({ 
  required: true, 
  skipEmailVerification: true 
});

/**
 * Check if user owns resource middleware
 * Compares user ID with a parameter or body field
 */
export const requireOwnership = (userIdField: string = 'userId') => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    const requestId = req.headers['x-request-id'] as string || 'unknown';
    
    if (!req.user) {
      const errorResponse: AuthErrorResponse = {
        success: false,
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication required for ownership check',
          timestamp: new Date().toISOString(),
          requestId
        }
      };
      
      res.status(401).json(errorResponse);
      return;
    }
    
    // Get user ID from params, body, or query
    const resourceUserId = req.params[userIdField] || 
                          req.body[userIdField] || 
                          req.query[userIdField];
    
    if (!resourceUserId) {
      logger.warn('Ownership check failed: User ID field not found', {
        requestId,
        userIdField,
        userId: req.user._id,
        params: req.params,
        body: req.body,
        query: req.query
      });
      
      const errorResponse: AuthErrorResponse = {
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: `User ID field '${userIdField}' not found in request`,
          timestamp: new Date().toISOString(),
          requestId
        }
      };
      
      res.status(400).json(errorResponse);
      return;
    }
    
    // Check ownership (allow admins to access any resource)
    if (req.user._id.toString() !== resourceUserId && req.user.role !== 'admin') {
      logger.warn('Authorization failed: Resource ownership check failed', {
        requestId,
        userId: req.user._id,
        resourceUserId,
        userRole: req.user.role,
        ip: req.ip
      });
      
      const errorResponse: AuthErrorResponse = {
        success: false,
        error: {
          code: 'ACCESS_DENIED',
          message: 'Access denied: You can only access your own resources',
          timestamp: new Date().toISOString(),
          requestId
        }
      };
      
      res.status(403).json(errorResponse);
      return;
    }
    
    logger.debug('Ownership check passed', {
      requestId,
      userId: req.user._id,
      resourceUserId,
      userRole: req.user.role
    });
    
    next();
  };
};

/**
 * Rate limiting by user middleware
 * Tracks requests per user for additional security
 */
export const rateLimitByUser = (options: {
  windowMs: number;
  maxRequests: number;
}) => {
  const userRequestCounts = new Map<string, { count: number; resetTime: number }>();
  
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    const requestId = req.headers['x-request-id'] as string || 'unknown';
    
    if (!req.user) {
      // If no user, skip rate limiting (handled by IP-based rate limiting)
      return next();
    }
    
    const userId = req.user._id.toString();
    const now = Date.now();
    const windowStart = now - options.windowMs;
    
    // Clean up expired entries
    for (const [key, value] of userRequestCounts.entries()) {
      if (value.resetTime < now) {
        userRequestCounts.delete(key);
      }
    }
    
    // Get or create user request count
    let userCount = userRequestCounts.get(userId);
    if (!userCount || userCount.resetTime < windowStart) {
      userCount = { count: 0, resetTime: now + options.windowMs };
      userRequestCounts.set(userId, userCount);
    }
    
    // Increment count
    userCount.count++;
    
    // Check if limit exceeded
    if (userCount.count > options.maxRequests) {
      logger.warn('Rate limit exceeded for user', {
        requestId,
        userId,
        count: userCount.count,
        maxRequests: options.maxRequests,
        windowMs: options.windowMs,
        ip: req.ip
      });
      
      const errorResponse: AuthErrorResponse = {
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests. Please try again later.',
          timestamp: new Date().toISOString(),
          requestId
        }
      };
      
      res.status(429).json(errorResponse);
      return;
    }
    
    // Add rate limit headers
    res.set({
      'X-RateLimit-Limit': options.maxRequests.toString(),
      'X-RateLimit-Remaining': (options.maxRequests - userCount.count).toString(),
      'X-RateLimit-Reset': new Date(userCount.resetTime).toISOString()
    });
    
    next();
  };
};
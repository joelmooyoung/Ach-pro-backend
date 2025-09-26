import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

import { AuthTokenPayload, UserRole, ApiResponse } from '../types';
import { logger } from '../utils/logger';

interface AuthenticatedRequest extends Request {
  user?: AuthTokenPayload;
}

export const authenticateToken = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, error: 'Access token required' });
  }

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    logger.error('JWT_SECRET environment variable not set');
    return res.status(500).json({ success: false, error: 'Server configuration error' });
  }

  try {
    const decoded = jwt.verify(token, jwtSecret) as AuthTokenPayload;
    req.user = decoded;
    next();
  } catch (error) {
    logger.warn('Invalid token attempt', { token: token.substring(0, 10) + '...' });
    return res.status(403).json({ success: false, error: 'Invalid or expired token' });
  }
};

export const requireRole = (roles: UserRole[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    if (!roles.includes(req.user.role)) {
      logger.warn('Insufficient permissions', { 
        userId: req.user.userId, 
        role: req.user.role, 
        requiredRoles: roles 
      });
      return res.status(403).json({ 
        success: false, 
        error: 'Insufficient permissions' 
      });
    }

    next();
  };
};

// Extend Express Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: AuthTokenPayload;
    }
  }
}

export const requireAdmin = requireRole([UserRole.ADMIN]);
export const requireOperator = requireRole([UserRole.ADMIN, UserRole.OPERATOR]);
export const requireOrganization = requireRole([UserRole.ORGANIZATION]);
export const requireTransactionAccess = requireRole([UserRole.ADMIN, UserRole.OPERATOR, UserRole.ORGANIZATION]);
export const requireInternal = requireRole([UserRole.ADMIN, UserRole.OPERATOR]);

// Alias for backward compatibility
export const authMiddleware = authenticateToken;

// Export the authenticated request type for use in routes
export { AuthenticatedRequest };
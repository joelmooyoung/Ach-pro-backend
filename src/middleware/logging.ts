import { Request, Response, NextFunction } from 'express';
import { UserRole } from '@/types';

// Enhanced logging for unauthorized access attempts
export const logUnauthorizedAccess = (req: Request, res: Response, next: NextFunction): void => {
  const originalJson = res.json;
  
  res.json = function(body: any) {
    // Log unauthorized access attempts (403 responses)
    if (res.statusCode === 403) {
      const logData = {
        timestamp: new Date().toISOString(),
        method: req.method,
        url: req.originalUrl,
        userAgent: req.get('User-Agent'),
        ip: req.ip || req.connection.remoteAddress,
        user: req.user ? {
          userId: req.user.userId,
          email: req.user.email,
          role: req.user.role
        } : null,
        statusCode: res.statusCode,
        response: body
      };
      
      console.warn('UNAUTHORIZED ACCESS ATTEMPT:', JSON.stringify(logData, null, 2));
      
      // In production, you might want to send this to a logging service
      // Example: await logToService(logData);
    }
    
    return originalJson.call(this, body);
  };
  
  next();
};

// Middleware to track organization activity for auditing
export const logOrganizationActivity = (req: Request, res: Response, next: NextFunction): void => {
  if (req.user?.role === UserRole.ORGANIZATION) {
    const originalJson = res.json;
    
    res.json = function(body: any) {
      // Log all organization activity
      const logData = {
        timestamp: new Date().toISOString(),
        method: req.method,
        url: req.originalUrl,
        userAgent: req.get('User-Agent'),
        ip: req.ip || req.connection.remoteAddress,
        organization: {
          userId: req.user!.userId,
          email: req.user!.email
        },
        statusCode: res.statusCode,
        success: body?.success || false
      };
      
      console.log('ORGANIZATION ACTIVITY:', JSON.stringify(logData, null, 2));
      
      return originalJson.call(this, body);
    };
  }
  
  next();
};
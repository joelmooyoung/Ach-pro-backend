import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { supabase, supabaseAdmin } from '../utils/supabase';
import { logger } from '../utils/logger';
import { AuthTokenPayload } from '../types';
import Joi from 'joi';

const router = Router();

// Validation schemas
const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required()
});

const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  firstName: Joi.string().min(1).max(50).required(),
  lastName: Joi.string().min(1).max(50).required(),
  role: Joi.string().valid('admin', 'operator', 'viewer').default('viewer')
});

// Login endpoint
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.details.map(d => d.message)
      });
    }

    const { email, password } = value;

    // Get user from database
    const { data: user, error: dbError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .eq('active', true)
      .single();

    if (dbError || !user) {
      logger.warn('Login attempt with invalid email', { email });
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      logger.warn('Login attempt with invalid password', { email, userId: user.id });
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Update last login
    await supabase
      .from('users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', user.id);

    // Generate JWT token
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET not configured');
    }

    const tokenPayload: Omit<AuthTokenPayload, 'iat' | 'exp'> = {
      userId: user.id,
      email: user.email,
      role: user.role
    };

    const token = jwt.sign(tokenPayload, jwtSecret, { expiresIn: '24h' });

    logger.info('User logged in successfully', { userId: user.id, email });

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.name.split(' ')[0] || user.name,
          lastName: user.name.split(' ').slice(1).join(' ') || '',
          role: user.role
        }
      }
    });
  } catch (error: any) {
    logger.error('Login error', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Register endpoint (admin only in production)
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { error, value } = registerSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.details.map(d => d.message)
      });
    }

    const { email, password, firstName, lastName, role } = value;

    if (!supabaseAdmin) {
      throw new Error('Admin client not configured');
    }

    // Check if user already exists
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: 'User already exists'
      });
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Get default organization
    const { data: defaultOrg } = await supabaseAdmin
      .from('organizations')
      .select('id')
      .eq('name', 'Default Organization')
      .single();

    if (!defaultOrg) {
      throw new Error('Default organization not found');
    }

    // Create user
    const { data: newUser, error: createError } = await supabaseAdmin
      .from('users')
      .insert({
        email,
        password: passwordHash,
        name: `${firstName} ${lastName}`.trim(),
        role,
        organization_id: defaultOrg.id,
        active: true
      })
      .select('id, email, name, role')
      .single();

    if (createError) {
      throw createError;
    }

    logger.info('New user registered', { userId: newUser.id, email, role });

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: newUser.id,
          email: newUser.email,
          firstName: newUser.name.split(' ')[0] || newUser.name,
          lastName: newUser.name.split(' ').slice(1).join(' ') || '',
          role: newUser.role
        }
      }
    });
  } catch (error: any) {
    logger.error('Registration error', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Refresh token endpoint
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Token required'
      });
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET not configured');
    }

    // Verify current token (even if expired)
    let decoded: AuthTokenPayload;
    try {
      decoded = jwt.verify(token, jwtSecret) as AuthTokenPayload;
    } catch (error: any) {
      if (error.name === 'TokenExpiredError') {
        decoded = jwt.decode(token) as AuthTokenPayload;
      } else {
        return res.status(403).json({
          success: false,
          error: 'Invalid token'
        });
      }
    }

    // Generate new token
    const tokenPayload: Omit<AuthTokenPayload, 'iat' | 'exp'> = {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role
    };

    const newToken = jwt.sign(tokenPayload, jwtSecret, { expiresIn: '24h' });

    res.json({
      success: true,
      data: { token: newToken }
    });
  } catch (error: any) {
    logger.error('Token refresh error', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

export { router as authRoutes };
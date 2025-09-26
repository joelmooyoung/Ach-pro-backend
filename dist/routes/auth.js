"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRoutes = void 0;
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const supabase_1 = require("../utils/supabase");
const logger_1 = require("../utils/logger");
const joi_1 = __importDefault(require("joi"));
const router = (0, express_1.Router)();
exports.authRoutes = router;
const loginSchema = joi_1.default.object({
    email: joi_1.default.string().email().required(),
    password: joi_1.default.string().min(8).required()
});
const registerSchema = joi_1.default.object({
    email: joi_1.default.string().email().required(),
    password: joi_1.default.string().min(8).required(),
    firstName: joi_1.default.string().min(1).max(50).required(),
    lastName: joi_1.default.string().min(1).max(50).required(),
    role: joi_1.default.string().valid('admin', 'operator', 'viewer').default('viewer')
});
router.post('/login', async (req, res) => {
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
        const { data: user, error: dbError } = await supabase_1.supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .eq('active', true)
            .single();
        if (dbError || !user) {
            logger_1.logger.warn('Login attempt with invalid email', { email });
            return res.status(401).json({
                success: false,
                error: 'Invalid credentials'
            });
        }
        const isValidPassword = await bcryptjs_1.default.compare(password, user.password);
        if (!isValidPassword) {
            logger_1.logger.warn('Login attempt with invalid password', { email, userId: user.id });
            return res.status(401).json({
                success: false,
                error: 'Invalid credentials'
            });
        }
        await supabase_1.supabase
            .from('users')
            .update({ last_login: new Date().toISOString() })
            .eq('id', user.id);
        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            throw new Error('JWT_SECRET not configured');
        }
        const tokenPayload = {
            userId: user.id,
            email: user.email,
            role: user.role
        };
        const token = jsonwebtoken_1.default.sign(tokenPayload, jwtSecret, { expiresIn: '24h' });
        logger_1.logger.info('User logged in successfully', { userId: user.id, email });
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
    }
    catch (error) {
        logger_1.logger.error('Login error', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});
router.post('/register', async (req, res) => {
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
        if (!supabase_1.supabaseAdmin) {
            throw new Error('Admin client not configured');
        }
        const { data: existingUser } = await supabase_1.supabaseAdmin
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
        const saltRounds = 12;
        const passwordHash = await bcryptjs_1.default.hash(password, saltRounds);
        const { data: defaultOrg } = await supabase_1.supabaseAdmin
            .from('organizations')
            .select('id')
            .eq('name', 'Default Organization')
            .single();
        if (!defaultOrg) {
            throw new Error('Default organization not found');
        }
        const { data: newUser, error: createError } = await supabase_1.supabaseAdmin
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
        logger_1.logger.info('New user registered', { userId: newUser.id, email, role });
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
    }
    catch (error) {
        logger_1.logger.error('Registration error', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});
router.post('/refresh', async (req, res) => {
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
        let decoded;
        try {
            decoded = jsonwebtoken_1.default.verify(token, jwtSecret);
        }
        catch (error) {
            if (error.name === 'TokenExpiredError') {
                decoded = jsonwebtoken_1.default.decode(token);
            }
            else {
                return res.status(403).json({
                    success: false,
                    error: 'Invalid token'
                });
            }
        }
        const tokenPayload = {
            userId: decoded.userId,
            email: decoded.email,
            role: decoded.role
        };
        const newToken = jsonwebtoken_1.default.sign(tokenPayload, jwtSecret, { expiresIn: '24h' });
        res.json({
            success: true,
            data: { token: newToken }
        });
    }
    catch (error) {
        logger_1.logger.error('Token refresh error', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});
//# sourceMappingURL=auth.js.map
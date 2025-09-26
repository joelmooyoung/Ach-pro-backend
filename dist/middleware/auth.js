"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = exports.requireInternal = exports.requireTransactionAccess = exports.requireOrganization = exports.requireOperator = exports.requireAdmin = exports.requireRole = exports.authenticateToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const types_1 = require("../types");
const logger_1 = require("../utils/logger");
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) {
        return res.status(401).json({ success: false, error: 'Access token required' });
    }
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
        logger_1.logger.error('JWT_SECRET environment variable not set');
        return res.status(500).json({ success: false, error: 'Server configuration error' });
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, jwtSecret);
        req.user = decoded;
        next();
    }
    catch (error) {
        logger_1.logger.warn('Invalid token attempt', { token: token.substring(0, 10) + '...' });
        return res.status(403).json({ success: false, error: 'Invalid or expired token' });
    }
};
exports.authenticateToken = authenticateToken;
const requireRole = (roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ success: false, error: 'Authentication required' });
        }
        if (!roles.includes(req.user.role)) {
            logger_1.logger.warn('Insufficient permissions', {
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
exports.requireRole = requireRole;
exports.requireAdmin = (0, exports.requireRole)([types_1.UserRole.ADMIN]);
exports.requireOperator = (0, exports.requireRole)([types_1.UserRole.ADMIN, types_1.UserRole.OPERATOR]);
exports.requireOrganization = (0, exports.requireRole)([types_1.UserRole.ORGANIZATION]);
exports.requireTransactionAccess = (0, exports.requireRole)([types_1.UserRole.ADMIN, types_1.UserRole.OPERATOR, types_1.UserRole.ORGANIZATION]);
exports.requireInternal = (0, exports.requireRole)([types_1.UserRole.ADMIN, types_1.UserRole.OPERATOR]);
exports.authMiddleware = exports.authenticateToken;
//# sourceMappingURL=auth.js.map
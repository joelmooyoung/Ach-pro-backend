"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logOrganizationActivity = exports.logUnauthorizedAccess = void 0;
const types_1 = require("../types");
const logUnauthorizedAccess = (req, res, next) => {
    const originalJson = res.json;
    res.json = function (body) {
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
        }
        return originalJson.call(this, body);
    };
    next();
};
exports.logUnauthorizedAccess = logUnauthorizedAccess;
const logOrganizationActivity = (req, res, next) => {
    if (req.user?.role === types_1.UserRole.ORGANIZATION) {
        const originalJson = res.json;
        res.json = function (body) {
            const logData = {
                timestamp: new Date().toISOString(),
                method: req.method,
                url: req.originalUrl,
                userAgent: req.get('User-Agent'),
                ip: req.ip || req.connection.remoteAddress,
                organization: {
                    userId: req.user.userId,
                    email: req.user.email
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
exports.logOrganizationActivity = logOrganizationActivity;
//# sourceMappingURL=logging.js.map
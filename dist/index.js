"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const dotenv_1 = __importDefault(require("dotenv"));
const logger_1 = require("./utils/logger");
const errorHandler_1 = require("./middleware/errorHandler");
const logging_1 = require("./middleware/logging");
const databaseService_1 = require("./services/databaseService");
const encryptionService_1 = require("./services/encryptionService");
const businessDayService_1 = require("./services/businessDayService");
const nachaService_1 = require("./services/nachaService");
const auth_1 = require("./routes/auth");
const transactions_1 = require("./routes/transactions");
const nacha_1 = require("./routes/nacha");
const config_1 = require("./routes/config");
const holidays_1 = require("./routes/holidays");
const organizations_1 = require("./routes/organizations");
const ach_1 = require("./routes/ach");
const reports_1 = require("./routes/reports");
dotenv_1.default.config({ path: './config.env' });
const requiredEnvVars = [
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'ENCRYPTION_KEY',
    'JWT_SECRET'
];
for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
        console.error(`Missing required environment variable: ${envVar}`);
        process.exit(1);
    }
}
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
}));
app.use((0, morgan_1.default)('combined'));
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true }));
const databaseService = new databaseService_1.DatabaseService(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const encryptionService = new encryptionService_1.EncryptionService(process.env.ENCRYPTION_KEY);
const businessDayService = new businessDayService_1.BusinessDayService();
const nachaService = new nachaService_1.NACHAService({
    immediateOrigin: process.env.ACH_IMMEDIATE_ORIGIN || '1234567890',
    immediateDestination: process.env.ACH_IMMEDIATE_DESTINATION || '9876543210',
    companyName: process.env.ACH_COMPANY_NAME || 'ACH Company',
    companyId: process.env.ACH_COMPANY_ID || '1234567890',
    originatingDFI: process.env.ACH_ORIGINATING_DFI || '1234567890'
}, encryptionService);
app.use(logging_1.logUnauthorizedAccess);
app.use(logging_1.logOrganizationActivity);
app.locals.databaseService = databaseService;
app.locals.encryptionService = encryptionService;
app.locals.businessDayService = businessDayService;
app.locals.nachaService = nachaService;
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});
app.use('/api/auth', auth_1.authRoutes);
app.use('/api/transactions', transactions_1.transactionRouter);
app.use('/api/nacha', nacha_1.nachaRouter);
app.use('/api/config', config_1.configRouter);
app.use('/api/holidays', holidays_1.holidayRouter);
app.use('/api/organizations', organizations_1.organizationRouter);
app.use('/api/ach', ach_1.achRoutes);
app.use('/api/reports', reports_1.reportRoutes);
app.use(errorHandler_1.errorHandler);
app.use('*', (req, res) => {
    const response = {
        success: false,
        message: 'Route not found',
        error: 'NOT_FOUND'
    };
    res.status(404).json(response);
});
const server = app.listen(PORT, () => {
    logger_1.logger.info(`Server running on port ${PORT}`);
    console.log(`ACH Processing System API running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
process.on('SIGTERM', () => {
    logger_1.logger.info('SIGTERM received, shutting down gracefully');
    server.close(() => {
        logger_1.logger.info('Process terminated');
    });
});
exports.default = app;
//# sourceMappingURL=index.js.map
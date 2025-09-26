import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';

import { logger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { logUnauthorizedAccess, logOrganizationActivity } from './middleware/logging';

// Services
import { DatabaseService } from './services/databaseService';
import { EncryptionService } from './services/encryptionService';
import { BusinessDayService } from './services/businessDayService';
import { NACHAService } from './services/nachaService';

// Routes
import { authRoutes } from './routes/auth';
import { transactionRouter } from './routes/transactions';
import { nachaRouter } from './routes/nacha';
import { configRouter } from './routes/config';
import { holidayRouter } from './routes/holidays';
import { organizationRouter } from './routes/organizations';
import { achRoutes } from './routes/ach';
import { reportRoutes } from './routes/reports';

import { ApiResponse } from './types';

// Load environment variables - only in development
if (process.env.NODE_ENV !== 'production') {
  dotenv.config({ path: './config.env' });
}

// Validate required environment variables
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

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Logging middleware
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Initialize services
const databaseService = new DatabaseService(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
const encryptionService = new EncryptionService(process.env.ENCRYPTION_KEY!);
const businessDayService = new BusinessDayService();
const nachaService = new NACHAService({
  immediateOrigin: process.env.ACH_IMMEDIATE_ORIGIN || '1234567890',
  immediateDestination: process.env.ACH_IMMEDIATE_DESTINATION || '9876543210',
  companyName: process.env.ACH_COMPANY_NAME || 'ACH Company',
  companyId: process.env.ACH_COMPANY_ID || '1234567890',
  originatingDFI: process.env.ACH_ORIGINATING_DFI || '1234567890'
}, encryptionService);

// Add logging middleware
app.use(logUnauthorizedAccess);
app.use(logOrganizationActivity);

// Make services available to routes
app.locals.databaseService = databaseService;
app.locals.encryptionService = encryptionService;
app.locals.businessDayService = businessDayService;
app.locals.nachaService = nachaService;

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionRouter);
app.use('/api/nacha', nachaRouter);
app.use('/api/config', configRouter);
app.use('/api/holidays', holidayRouter);
app.use('/api/organizations', organizationRouter);
app.use('/api/ach', achRoutes);
app.use('/api/reports', reportRoutes);

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  const response: ApiResponse = {
    success: false,
    message: 'Route not found',
    error: 'NOT_FOUND'
  };
  res.status(404).json(response);
});

// Start server
const server = app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
  console.log(`ACH Processing System API running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
  });
});

export default app;
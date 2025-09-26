import { Router, Request, Response } from 'express';
import { authenticateToken, requireOperator, AuthenticatedRequest } from '../middleware/auth';
import { ACHTransactionService } from '../services/achTransaction';
import { NACHAService } from '../services/nacha';
import { logger } from '../utils/logger';
import Joi from 'joi';

const router = Router();

// Validation schema for ACH transaction
const achTransactionSchema = Joi.object({
  transactionId: Joi.string().required(),
  routingNumber: Joi.string().length(9).pattern(/^\d+$/).required(),
  accountNumber: Joi.string().min(1).max(17).required(),
  accountType: Joi.string().valid('checking', 'savings').required(),
  transactionType: Joi.string().valid('debit', 'credit').required(),
  amount: Joi.number().positive().precision(2).required(),
  effectiveDate: Joi.date().min('now').required(),
  description: Joi.string().max(100).required(),
  individualId: Joi.string().max(15).required(),
  individualName: Joi.string().max(22).required(),
  companyName: Joi.string().max(50).optional(),
  companyId: Joi.string().max(10).optional()
});

// Create new ACH transaction
router.post('/', authenticateToken, requireOperator, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { error, value } = achTransactionSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.details.map(d => d.message)
      });
    }

    const senderIp = req.ip || req.connection.remoteAddress || 'unknown';
    const transaction = await ACHTransactionService.createTransaction({
      ...value,
      senderIp,
      createdBy: req.user!.userId
    });

    logger.info('ACH transaction created', {
      transactionId: transaction.id,
      userId: req.user!.userId,
      amount: value.amount
    });

    res.status(201).json({
      success: true,
      data: transaction
    });
  } catch (error: any) {
    logger.error('Failed to create ACH transaction', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get ACH transactions with pagination and filtering
router.get('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const status = req.query.status as string;
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;

    const result = await ACHTransactionService.getTransactions({
      page,
      limit,
      status,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined
    });

    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination
    });
  } catch (error: any) {
    logger.error('Failed to fetch ACH transactions', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get specific ACH transaction
router.get('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const transaction = await ACHTransactionService.getTransactionById(req.params.id);
    
    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: 'Transaction not found'
      });
    }

    res.json({
      success: true,
      data: transaction
    });
  } catch (error: any) {
    logger.error('Failed to fetch ACH transaction', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Update ACH transaction status
router.patch('/:id/status', authenticateToken, requireOperator, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { status } = req.body;
    const validStatuses = ['pending', 'processed', 'failed', 'cancelled'];
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status value'
      });
    }

    const transaction = await ACHTransactionService.updateTransactionStatus(
      req.params.id,
      status,
      req.user!.userId
    );

    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: 'Transaction not found'
      });
    }

    logger.info('ACH transaction status updated', {
      transactionId: req.params.id,
      newStatus: status,
      userId: req.user!.userId
    });

    res.json({
      success: true,
      data: transaction
    });
  } catch (error: any) {
    logger.error('Failed to update ACH transaction status', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Generate NACHA file for specific effective date
router.post('/nacha/generate', authenticateToken, requireOperator, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { effectiveDate } = req.body;
    
    if (!effectiveDate) {
      return res.status(400).json({
        success: false,
        error: 'Effective date is required'
      });
    }

    const result = await ACHTransactionService.generateNACHAFile(
      new Date(effectiveDate),
      req.user!.userId
    );

    logger.info('NACHA file generated', {
      effectiveDate,
      filename: result.filename,
      recordCount: result.totalRecords,
      userId: req.user!.userId
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    logger.error('Failed to generate NACHA file', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get NACHA files
router.get('/nacha/files', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const result = await ACHTransactionService.getNACHAFiles({ page, limit });

    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination
    });
  } catch (error: any) {
    logger.error('Failed to fetch NACHA files', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Download NACHA file content
router.get('/nacha/files/:id/download', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const fileData = await ACHTransactionService.getNACHAFileContent(req.params.id);
    
    if (!fileData) {
      return res.status(404).json({
        success: false,
        error: 'NACHA file not found'
      });
    }

    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', `attachment; filename="${fileData.filename}"`);
    res.send(fileData.content);
  } catch (error: any) {
    logger.error('Failed to download NACHA file', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export { router as achRoutes };
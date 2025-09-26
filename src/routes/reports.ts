import { Router, Response } from 'express';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { ReportService } from '../services/reports';
import { logger } from '../utils/logger';
import Joi from 'joi';

const router = Router();

// Validation schema for date range reports
const dateRangeSchema = Joi.object({
  startDate: Joi.date().required(),
  endDate: Joi.date().min(Joi.ref('startDate')).required()
});

// Daily summary report
router.get('/daily-summary', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const date = req.query.date ? new Date(req.query.date as string) : new Date();
    
    const summary = await ReportService.getDailySummary(date);
    
    res.json({
      success: true,
      data: summary
    });
  } catch (error: any) {
    logger.error('Failed to generate daily summary report', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Monthly summary report
router.get('/monthly-summary', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const year = parseInt(req.query.year as string) || new Date().getFullYear();
    const month = parseInt(req.query.month as string) || new Date().getMonth() + 1;
    
    const summary = await ReportService.getMonthlySummary(year, month);
    
    res.json({
      success: true,
      data: summary
    });
  } catch (error: any) {
    logger.error('Failed to generate monthly summary report', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Transaction statistics
router.post('/transaction-stats', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { error, value } = dateRangeSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.details.map(d => d.message)
      });
    }

    const stats = await ReportService.getTransactionStatistics(value.startDate, value.endDate);
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error: any) {
    logger.error('Failed to generate transaction statistics', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// NACHA file statistics
router.get('/nacha-stats', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    
    const stats = await ReportService.getNACHAFileStatistics(days);
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error: any) {
    logger.error('Failed to generate NACHA file statistics', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Error report
router.get('/errors', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const days = parseInt(req.query.days as string) || 7;
    
    const errorReport = await ReportService.getErrorReport(days);
    
    res.json({
      success: true,
      data: errorReport
    });
  } catch (error: any) {
    logger.error('Failed to generate error report', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Export transactions to CSV
router.post('/export/transactions', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { error, value } = dateRangeSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.details.map(d => d.message)
      });
    }

    const csvData = await ReportService.exportTransactionsToCSV(value.startDate, value.endDate);
    
    const filename = `transactions_${value.startDate.toISOString().split('T')[0]}_to_${value.endDate.toISOString().split('T')[0]}.csv`;
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csvData);
  } catch (error: any) {
    logger.error('Failed to export transactions', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// User activity report
router.get('/user-activity', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    
    const activity = await ReportService.getUserActivityReport(days);
    
    res.json({
      success: true,
      data: activity
    });
  } catch (error: any) {
    logger.error('Failed to generate user activity report', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export { router as reportRoutes };
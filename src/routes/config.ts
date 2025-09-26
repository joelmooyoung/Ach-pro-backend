import { Router, Response } from 'express';
import { authenticateToken, requireAdmin, requireInternal, AuthenticatedRequest } from '../middleware/auth';
import { ConfigService } from '../services/config';
import { logger } from '../utils/logger';
import Joi from 'joi';

const router = Router();

// Validation schemas
const configSchema = Joi.object({
  key: Joi.string().required(),
  value: Joi.any().required(),
  description: Joi.string().optional(),
  isEncrypted: Joi.boolean().default(false)
});

const holidaySchema = Joi.object({
  name: Joi.string().required(),
  date: Joi.date().required(),
  isRecurring: Joi.boolean().default(false)
});

const sftpConfigSchema = Joi.object({
  host: Joi.string().required(),
  port: Joi.number().integer().min(1).max(65535).default(22),
  username: Joi.string().required(),
  password: Joi.string().optional(),
  privateKey: Joi.string().optional(),
  remotePath: Joi.string().required(),
  enabled: Joi.boolean().default(true)
});

// Get all system configuration
router.get('/', requireInternal, async (req, res) => {
  try {
    const config = await ConfigService.getAllConfigs();
    res.json({
      success: true,
      data: config
    });
  } catch (error: any) {
    logger.error('Failed to get system configuration', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get specific configuration value
router.get('/:key', requireInternal, async (req, res) => {
  try {
    const { key } = req.params;
    const value = await ConfigService.getConfig(key);
    
    if (value === null) {
      return res.status(404).json({
        success: false,
        error: 'Configuration not found'
      });
    }
    
    res.json({
      success: true,
      data: { key, value }
    });
  } catch (error: any) {
    logger.error('Failed to get configuration', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Update configuration value
router.put('/:key', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { key } = req.params;
    const { value, description, isEncrypted } = req.body;
    
    const { error: validationError } = configSchema.validate({ key, value, description, isEncrypted });
    if (validationError) {
      return res.status(400).json({
        success: false,
        error: validationError.details[0].message
      });
    }
    
    await ConfigService.setConfig(key, value, description, isEncrypted);
    
    logger.info('Configuration updated', {
      key,
      updatedBy: req.user!.userId
    });
    
    res.json({
      success: true,
      message: 'Configuration updated successfully'
    });
  } catch (error: any) {
    logger.error('Failed to update configuration', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get holidays
router.get('/holidays', requireInternal, async (req, res) => {
  try {
    const holidays = await ConfigService.getFederalHolidays();
    res.json({
      success: true,
      data: holidays
    });
  } catch (error: any) {
    logger.error('Failed to get holidays', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Add holiday
router.post('/holidays', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { error: validationError } = holidaySchema.validate(req.body);
    if (validationError) {
      return res.status(400).json({
        success: false,
        error: validationError.details[0].message
      });
    }
    
    const holiday = await ConfigService.addFederalHoliday(req.body);
    
    logger.info('Holiday added', {
      holiday: holiday.name,
      date: holiday.date,
      addedBy: req.user!.userId
    });
    
    res.json({
      success: true,
      data: holiday
    });
  } catch (error: any) {
    logger.error('Failed to add holiday', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Delete holiday
router.delete('/holidays/:id', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    await ConfigService.deleteFederalHoliday(id);
    
    logger.info('Holiday deleted', {
      holidayId: id,
      deletedBy: req.user!.userId
    });
    
    res.json({
      success: true,
      message: 'Holiday deleted successfully'
    });
  } catch (error: any) {
    logger.error('Failed to delete holiday', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get SFTP configuration
router.get('/sftp', requireInternal, async (req, res) => {
  try {
    const config = await ConfigService.getSFTPConfig();
    res.json({
      success: true,
      data: config
    });
  } catch (error: any) {
    logger.error('Failed to get SFTP configuration', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Update SFTP configuration
router.put('/sftp', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { error: validationError } = sftpConfigSchema.validate(req.body);
    if (validationError) {
      return res.status(400).json({
        success: false,
        error: validationError.details[0].message
      });
    }
    
    await ConfigService.setSFTPConfig(req.body, req.user!.userId);
    
    logger.info('SFTP configuration updated', {
      host: req.body.host,
      updatedBy: req.user!.userId
    });
    
    res.json({
      success: true,
      message: 'SFTP configuration updated successfully'
    });
  } catch (error: any) {
    logger.error('Failed to update SFTP configuration', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Test SFTP connection
router.post('/sftp/test', requireInternal, async (req, res) => {
  try {
    const result = await ConfigService.testSFTPConnection();
    
    res.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    logger.error('SFTP connection test failed', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export { router as configRouter };
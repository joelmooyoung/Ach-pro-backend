"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.configRouter = void 0;
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const config_1 = require("../services/config");
const logger_1 = require("../utils/logger");
const joi_1 = __importDefault(require("joi"));
const router = (0, express_1.Router)();
exports.configRouter = router;
const configSchema = joi_1.default.object({
    key: joi_1.default.string().required(),
    value: joi_1.default.any().required(),
    description: joi_1.default.string().optional(),
    isEncrypted: joi_1.default.boolean().default(false)
});
const holidaySchema = joi_1.default.object({
    name: joi_1.default.string().required(),
    date: joi_1.default.date().required(),
    isRecurring: joi_1.default.boolean().default(false)
});
const sftpConfigSchema = joi_1.default.object({
    host: joi_1.default.string().required(),
    port: joi_1.default.number().integer().min(1).max(65535).default(22),
    username: joi_1.default.string().required(),
    password: joi_1.default.string().optional(),
    privateKey: joi_1.default.string().optional(),
    remotePath: joi_1.default.string().required(),
    enabled: joi_1.default.boolean().default(true)
});
router.get('/', auth_1.requireInternal, async (req, res) => {
    try {
        const config = await config_1.ConfigService.getAllConfigs();
        res.json({
            success: true,
            data: config
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to get system configuration', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});
router.get('/:key', auth_1.requireInternal, async (req, res) => {
    try {
        const { key } = req.params;
        const value = await config_1.ConfigService.getConfig(key);
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
    }
    catch (error) {
        logger_1.logger.error('Failed to get configuration', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});
router.put('/:key', auth_1.requireAdmin, async (req, res) => {
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
        await config_1.ConfigService.setConfig(key, value, description, isEncrypted);
        logger_1.logger.info('Configuration updated', {
            key,
            updatedBy: req.user.userId
        });
        res.json({
            success: true,
            message: 'Configuration updated successfully'
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to update configuration', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});
router.get('/holidays', auth_1.requireInternal, async (req, res) => {
    try {
        const holidays = await config_1.ConfigService.getFederalHolidays();
        res.json({
            success: true,
            data: holidays
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to get holidays', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});
router.post('/holidays', auth_1.requireAdmin, async (req, res) => {
    try {
        const { error: validationError } = holidaySchema.validate(req.body);
        if (validationError) {
            return res.status(400).json({
                success: false,
                error: validationError.details[0].message
            });
        }
        const holiday = await config_1.ConfigService.addFederalHoliday(req.body);
        logger_1.logger.info('Holiday added', {
            holiday: holiday.name,
            date: holiday.date,
            addedBy: req.user.userId
        });
        res.json({
            success: true,
            data: holiday
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to add holiday', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});
router.delete('/holidays/:id', auth_1.requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        await config_1.ConfigService.deleteFederalHoliday(id);
        logger_1.logger.info('Holiday deleted', {
            holidayId: id,
            deletedBy: req.user.userId
        });
        res.json({
            success: true,
            message: 'Holiday deleted successfully'
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to delete holiday', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});
router.get('/sftp', auth_1.requireInternal, async (req, res) => {
    try {
        const config = await config_1.ConfigService.getSFTPConfig();
        res.json({
            success: true,
            data: config
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to get SFTP configuration', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});
router.put('/sftp', auth_1.requireAdmin, async (req, res) => {
    try {
        const { error: validationError } = sftpConfigSchema.validate(req.body);
        if (validationError) {
            return res.status(400).json({
                success: false,
                error: validationError.details[0].message
            });
        }
        await config_1.ConfigService.setSFTPConfig(req.body, req.user.userId);
        logger_1.logger.info('SFTP configuration updated', {
            host: req.body.host,
            updatedBy: req.user.userId
        });
        res.json({
            success: true,
            message: 'SFTP configuration updated successfully'
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to update SFTP configuration', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});
router.post('/sftp/test', auth_1.requireInternal, async (req, res) => {
    try {
        const result = await config_1.ConfigService.testSFTPConnection();
        res.json({
            success: true,
            data: result
        });
    }
    catch (error) {
        logger_1.logger.error('SFTP connection test failed', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});
//# sourceMappingURL=config.js.map
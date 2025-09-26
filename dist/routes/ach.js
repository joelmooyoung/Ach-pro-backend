"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.achRoutes = void 0;
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const achTransaction_1 = require("../services/achTransaction");
const logger_1 = require("../utils/logger");
const joi_1 = __importDefault(require("joi"));
const router = (0, express_1.Router)();
exports.achRoutes = router;
const achTransactionSchema = joi_1.default.object({
    transactionId: joi_1.default.string().required(),
    routingNumber: joi_1.default.string().length(9).pattern(/^\d+$/).required(),
    accountNumber: joi_1.default.string().min(1).max(17).required(),
    accountType: joi_1.default.string().valid('checking', 'savings').required(),
    transactionType: joi_1.default.string().valid('debit', 'credit').required(),
    amount: joi_1.default.number().positive().precision(2).required(),
    effectiveDate: joi_1.default.date().min('now').required(),
    description: joi_1.default.string().max(100).required(),
    individualId: joi_1.default.string().max(15).required(),
    individualName: joi_1.default.string().max(22).required(),
    companyName: joi_1.default.string().max(50).optional(),
    companyId: joi_1.default.string().max(10).optional()
});
router.post('/', auth_1.authenticateToken, auth_1.requireOperator, async (req, res) => {
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
        const transaction = await achTransaction_1.ACHTransactionService.createTransaction({
            ...value,
            senderIp,
            createdBy: req.user.userId
        });
        logger_1.logger.info('ACH transaction created', {
            transactionId: transaction.id,
            userId: req.user.userId,
            amount: value.amount
        });
        res.status(201).json({
            success: true,
            data: transaction
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to create ACH transaction', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});
router.get('/', auth_1.authenticateToken, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const status = req.query.status;
        const startDate = req.query.startDate;
        const endDate = req.query.endDate;
        const result = await achTransaction_1.ACHTransactionService.getTransactions({
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
    }
    catch (error) {
        logger_1.logger.error('Failed to fetch ACH transactions', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});
router.get('/:id', auth_1.authenticateToken, async (req, res) => {
    try {
        const transaction = await achTransaction_1.ACHTransactionService.getTransactionById(req.params.id);
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
    }
    catch (error) {
        logger_1.logger.error('Failed to fetch ACH transaction', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});
router.patch('/:id/status', auth_1.authenticateToken, auth_1.requireOperator, async (req, res) => {
    try {
        const { status } = req.body;
        const validStatuses = ['pending', 'processed', 'failed', 'cancelled'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid status value'
            });
        }
        const transaction = await achTransaction_1.ACHTransactionService.updateTransactionStatus(req.params.id, status, req.user.userId);
        if (!transaction) {
            return res.status(404).json({
                success: false,
                error: 'Transaction not found'
            });
        }
        logger_1.logger.info('ACH transaction status updated', {
            transactionId: req.params.id,
            newStatus: status,
            userId: req.user.userId
        });
        res.json({
            success: true,
            data: transaction
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to update ACH transaction status', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});
router.post('/nacha/generate', auth_1.authenticateToken, auth_1.requireOperator, async (req, res) => {
    try {
        const { effectiveDate } = req.body;
        if (!effectiveDate) {
            return res.status(400).json({
                success: false,
                error: 'Effective date is required'
            });
        }
        const result = await achTransaction_1.ACHTransactionService.generateNACHAFile(new Date(effectiveDate), req.user.userId);
        logger_1.logger.info('NACHA file generated', {
            effectiveDate,
            filename: result.filename,
            recordCount: result.totalRecords,
            userId: req.user.userId
        });
        res.json({
            success: true,
            data: result
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to generate NACHA file', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});
router.get('/nacha/files', auth_1.authenticateToken, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const result = await achTransaction_1.ACHTransactionService.getNACHAFiles({ page, limit });
        res.json({
            success: true,
            data: result.data,
            pagination: result.pagination
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to fetch NACHA files', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});
router.get('/nacha/files/:id/download', auth_1.authenticateToken, async (req, res) => {
    try {
        const fileData = await achTransaction_1.ACHTransactionService.getNACHAFileContent(req.params.id);
        if (!fileData) {
            return res.status(404).json({
                success: false,
                error: 'NACHA file not found'
            });
        }
        res.setHeader('Content-Type', 'text/plain');
        res.setHeader('Content-Disposition', `attachment; filename="${fileData.filename}"`);
        res.send(fileData.content);
    }
    catch (error) {
        logger_1.logger.error('Failed to download NACHA file', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});
//# sourceMappingURL=ach.js.map
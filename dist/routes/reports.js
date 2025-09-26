"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.reportRoutes = void 0;
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const reports_1 = require("../services/reports");
const logger_1 = require("../utils/logger");
const joi_1 = __importDefault(require("joi"));
const router = (0, express_1.Router)();
exports.reportRoutes = router;
const dateRangeSchema = joi_1.default.object({
    startDate: joi_1.default.date().required(),
    endDate: joi_1.default.date().min(joi_1.default.ref('startDate')).required()
});
router.get('/daily-summary', auth_1.authenticateToken, async (req, res) => {
    try {
        const date = req.query.date ? new Date(req.query.date) : new Date();
        const summary = await reports_1.ReportService.getDailySummary(date);
        res.json({
            success: true,
            data: summary
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to generate daily summary report', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});
router.get('/monthly-summary', auth_1.authenticateToken, async (req, res) => {
    try {
        const year = parseInt(req.query.year) || new Date().getFullYear();
        const month = parseInt(req.query.month) || new Date().getMonth() + 1;
        const summary = await reports_1.ReportService.getMonthlySummary(year, month);
        res.json({
            success: true,
            data: summary
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to generate monthly summary report', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});
router.post('/transaction-stats', auth_1.authenticateToken, async (req, res) => {
    try {
        const { error, value } = dateRangeSchema.validate(req.body);
        if (error) {
            return res.status(400).json({
                success: false,
                error: 'Validation failed',
                details: error.details.map(d => d.message)
            });
        }
        const stats = await reports_1.ReportService.getTransactionStatistics(value.startDate, value.endDate);
        res.json({
            success: true,
            data: stats
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to generate transaction statistics', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});
router.get('/nacha-stats', auth_1.authenticateToken, async (req, res) => {
    try {
        const days = parseInt(req.query.days) || 30;
        const stats = await reports_1.ReportService.getNACHAFileStatistics(days);
        res.json({
            success: true,
            data: stats
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to generate NACHA file statistics', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});
router.get('/errors', auth_1.authenticateToken, async (req, res) => {
    try {
        const days = parseInt(req.query.days) || 7;
        const errorReport = await reports_1.ReportService.getErrorReport(days);
        res.json({
            success: true,
            data: errorReport
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to generate error report', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});
router.post('/export/transactions', auth_1.authenticateToken, async (req, res) => {
    try {
        const { error, value } = dateRangeSchema.validate(req.body);
        if (error) {
            return res.status(400).json({
                success: false,
                error: 'Validation failed',
                details: error.details.map(d => d.message)
            });
        }
        const csvData = await reports_1.ReportService.exportTransactionsToCSV(value.startDate, value.endDate);
        const filename = `transactions_${value.startDate.toISOString().split('T')[0]}_to_${value.endDate.toISOString().split('T')[0]}.csv`;
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(csvData);
    }
    catch (error) {
        logger_1.logger.error('Failed to export transactions', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});
router.get('/user-activity', auth_1.authenticateToken, async (req, res) => {
    try {
        const days = parseInt(req.query.days) || 30;
        const activity = await reports_1.ReportService.getUserActivityReport(days);
        res.json({
            success: true,
            data: activity
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to generate user activity report', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});
//# sourceMappingURL=reports.js.map
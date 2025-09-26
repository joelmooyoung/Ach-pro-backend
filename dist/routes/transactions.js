"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.transactionRouter = void 0;
const express_1 = __importDefault(require("express"));
const joi_1 = __importDefault(require("joi"));
const uuid_1 = require("uuid");
const types_1 = require("../types");
const transactionEntryService_1 = require("../services/transactionEntryService");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
exports.transactionRouter = router;
router.use(auth_1.authMiddleware);
const transactionSchema = joi_1.default.object({
    organizationKey: joi_1.default.string().uuid().required(),
    drRoutingNumber: joi_1.default.string().pattern(/^\d{9}$/).required().messages({
        'string.pattern.base': 'DR Routing Number must be exactly 9 digits'
    }),
    drAccountNumber: joi_1.default.string().min(1).max(17).required(),
    drId: joi_1.default.string().max(15).required(),
    drName: joi_1.default.string().max(22).required(),
    crRoutingNumber: joi_1.default.string().pattern(/^\d{9}$/).required().messages({
        'string.pattern.base': 'CR Routing Number must be exactly 9 digits'
    }),
    crAccountNumber: joi_1.default.string().min(1).max(17).required(),
    crId: joi_1.default.string().max(15).required(),
    crName: joi_1.default.string().max(22).required(),
    amount: joi_1.default.number().positive().precision(2).required().messages({
        'number.positive': 'Amount must be a positive number'
    }),
    effectiveDate: joi_1.default.date().min('now').required().messages({
        'date.min': 'Effective date cannot be in the past'
    }),
    senderDetails: joi_1.default.string().max(255).optional()
});
const separateTransactionSchema = joi_1.default.object({
    drRoutingNumber: joi_1.default.string().pattern(/^\d{9}$/).required().messages({
        'string.pattern.base': 'DR Routing Number must be exactly 9 digits'
    }),
    drAccountNumber: joi_1.default.string().min(1).max(17).required(),
    drId: joi_1.default.string().max(15).required(),
    drName: joi_1.default.string().max(22).required(),
    drEffectiveDate: joi_1.default.date().min('now').required().messages({
        'date.min': 'DR Effective date cannot be in the past'
    }),
    crRoutingNumber: joi_1.default.string().pattern(/^\d{9}$/).required().messages({
        'string.pattern.base': 'CR Routing Number must be exactly 9 digits'
    }),
    crAccountNumber: joi_1.default.string().min(1).max(17).required(),
    crId: joi_1.default.string().max(15).required(),
    crName: joi_1.default.string().max(22).required(),
    crEffectiveDate: joi_1.default.date().min('now').required().messages({
        'date.min': 'CR Effective date cannot be in the past'
    }),
    amount: joi_1.default.number().positive().precision(2).required().messages({
        'number.positive': 'Amount must be a positive number'
    }),
    senderDetails: joi_1.default.string().max(255).optional()
});
router.post('/', auth_1.requireOperator, async (req, res) => {
    try {
        const { error, value } = transactionSchema.validate(req.body);
        if (error) {
            const response = {
                success: false,
                error: error.details[0].message
            };
            return res.status(400).json(response);
        }
        const databaseService = req.app.locals.databaseService;
        const encryptionService = req.app.locals.encryptionService;
        const businessDayService = req.app.locals.businessDayService;
        const organization = await databaseService.getOrganizationByKey(value.organizationKey);
        if (!organization) {
            const response = {
                success: false,
                error: 'Invalid organization key'
            };
            return res.status(400).json(response);
        }
        const senderIp = req.ip || req.connection.remoteAddress || 'unknown';
        const effectiveDate = businessDayService.getACHEffectiveDate(new Date(value.effectiveDate));
        const traceNumber = Math.floor(Math.random() * 999999999999999).toString().padStart(15, '0');
        const transaction = {
            id: (0, uuid_1.v4)(),
            transactionId: (0, uuid_1.v4)(),
            routingNumber: value.drRoutingNumber,
            accountNumber: value.drAccountNumber,
            accountType: 'checking',
            transactionType: 'debit',
            amount: value.amount,
            effectiveDate,
            description: `ACH Transaction - DR: ${value.drName}, CR: ${value.crName}`,
            individualId: value.drId,
            individualName: value.drName,
            companyName: value.crName,
            companyId: value.crId,
            senderIp,
            timestamp: new Date(),
            status: types_1.TransactionStatus.PENDING,
            createdBy: req.user?.userId || 'system',
            updatedBy: req.user?.userId || 'system'
        };
        const encryptedTransaction = {
            ...transaction,
            accountNumberEncrypted: encryptionService.encrypt(transaction.accountNumber),
            drRoutingNumber: value.drRoutingNumber,
            drAccountNumberEncrypted: encryptionService.encrypt(value.drAccountNumber),
            drId: value.drId,
            drName: value.drName,
            crRoutingNumber: value.crRoutingNumber,
            crAccountNumberEncrypted: encryptionService.encrypt(value.crAccountNumber),
            crId: value.crId,
            crName: value.crName,
            senderDetails: value.senderDetails,
            organizationId: organization.id,
            traceNumber: traceNumber,
            createdAt: new Date(),
            updatedAt: new Date()
        };
        delete encryptedTransaction.accountNumber;
        const savedTransaction = await databaseService.createTransaction(encryptedTransaction);
        const response = {
            success: true,
            data: {
                id: savedTransaction.id,
                transactionId: savedTransaction.transactionId,
                routingNumber: savedTransaction.routingNumber,
                accountNumber: '****' + value.drAccountNumber.slice(-4),
                accountType: savedTransaction.accountType,
                transactionType: savedTransaction.transactionType,
                amount: savedTransaction.amount,
                effectiveDate: savedTransaction.effectiveDate,
                description: savedTransaction.description,
                individualId: savedTransaction.individualId,
                individualName: savedTransaction.individualName,
                companyName: savedTransaction.companyName,
                companyId: savedTransaction.companyId,
                status: savedTransaction.status,
                createdAt: savedTransaction.timestamp
            },
            message: 'ACH transaction created successfully'
        };
        return res.status(201).json(response);
    }
    catch (error) {
        console.error('Create transaction error:', error);
        const response = {
            success: false,
            error: 'Failed to create ACH transaction'
        };
        return res.status(500).json(response);
    }
});
router.post('/separate', auth_1.requireOperator, async (req, res) => {
    try {
        const { error, value } = separateTransactionSchema.validate(req.body);
        if (error) {
            const response = {
                success: false,
                error: error.details[0].message
            };
            return res.status(400).json(response);
        }
        const databaseService = req.app.locals.databaseService;
        const encryptionService = req.app.locals.encryptionService;
        const businessDayService = req.app.locals.businessDayService;
        const transactionEntryService = new transactionEntryService_1.TransactionEntryService(databaseService, encryptionService, businessDayService);
        const senderIp = req.ip || req.connection.remoteAddress || 'unknown';
        const transactionGroup = await transactionEntryService.createSeparateTransaction(value, senderIp);
        const response = {
            success: true,
            data: {
                id: transactionGroup.id,
                drEntryId: transactionGroup.drEntryId,
                crEntryId: transactionGroup.crEntryId,
                amount: value.amount,
                drEffectiveDate: value.drEffectiveDate,
                crEffectiveDate: value.crEffectiveDate,
                createdAt: transactionGroup.createdAt
            },
            message: 'Separate debit/credit transaction created successfully'
        };
        res.status(201).json(response);
    }
    catch (error) {
        console.error('Create separate transaction error:', error);
        const response = {
            success: false,
            error: 'Failed to create separate debit/credit transaction'
        };
        res.status(500).json(response);
    }
});
router.get('/', auth_1.requireInternal, async (req, res) => {
    try {
        const querySchema = joi_1.default.object({
            page: joi_1.default.number().integer().min(1).default(1),
            limit: joi_1.default.number().integer().min(1).max(100).default(50),
            status: joi_1.default.string().valid(...Object.values(types_1.TransactionStatus)).optional(),
            effectiveDate: joi_1.default.date().optional(),
            organizationKey: joi_1.default.string().uuid().optional(),
            amountMin: joi_1.default.number().min(0).optional(),
            amountMax: joi_1.default.number().min(0).optional(),
            traceNumber: joi_1.default.string().optional(),
            drId: joi_1.default.string().optional(),
            crId: joi_1.default.string().optional(),
            dateFrom: joi_1.default.date().optional(),
            dateTo: joi_1.default.date().optional()
        });
        const { error, value } = querySchema.validate(req.query);
        if (error) {
            const response = {
                success: false,
                error: error.details[0].message
            };
            return res.status(400).json(response);
        }
        const databaseService = req.app.locals.databaseService;
        const encryptionService = req.app.locals.encryptionService;
        const filters = {};
        if (value.status)
            filters.status = value.status;
        if (value.effectiveDate)
            filters.effectiveDate = new Date(value.effectiveDate);
        if (value.amountMin !== undefined)
            filters.amountMin = value.amountMin;
        if (value.amountMax !== undefined)
            filters.amountMax = value.amountMax;
        if (value.traceNumber)
            filters.traceNumber = value.traceNumber;
        if (value.drId)
            filters.drId = value.drId;
        if (value.crId)
            filters.crId = value.crId;
        if (value.dateFrom)
            filters.dateFrom = new Date(value.dateFrom);
        if (value.dateTo)
            filters.dateTo = new Date(value.dateTo);
        if (value.organizationKey) {
            const organization = await databaseService.getOrganizationByKey(value.organizationKey);
            if (organization) {
                filters.organizationId = organization.id;
            }
            else {
                const response = {
                    success: false,
                    error: 'Invalid organization key'
                };
                return res.status(400).json(response);
            }
        }
        const result = await databaseService.getTransactions(value.page, value.limit, filters);
        const transactionsWithMaskedAccounts = result.data.map(tx => {
            try {
                const drAccountFull = encryptionService.decrypt(tx.drAccountNumberEncrypted);
                const crAccountFull = encryptionService.decrypt(tx.crAccountNumberEncrypted);
                return {
                    ...tx,
                    drAccountNumber: '****' + drAccountFull.slice(-4),
                    crAccountNumber: '****' + crAccountFull.slice(-4),
                    drAccountNumberEncrypted: undefined,
                    crAccountNumberEncrypted: undefined
                };
            }
            catch (decryptError) {
                console.error('Decryption error for transaction', tx.id, decryptError);
                return {
                    ...tx,
                    drAccountNumber: '****ERROR',
                    crAccountNumber: '****ERROR',
                    drAccountNumberEncrypted: undefined,
                    crAccountNumberEncrypted: undefined
                };
            }
        });
        const response = {
            success: true,
            data: transactionsWithMaskedAccounts,
            pagination: result.pagination
        };
        return res.json(response);
    }
    catch (error) {
        console.error('Get transactions error:', error);
        const response = {
            success: false,
            error: 'Failed to retrieve ACH transactions'
        };
        return res.status(500).json(response);
    }
});
router.get('/:id', auth_1.requireInternal, async (req, res) => {
    try {
        const { id } = req.params;
        const databaseService = req.app.locals.databaseService;
        const encryptionService = req.app.locals.encryptionService;
        const transaction = await databaseService.getTransaction(id);
        if (!transaction) {
            const response = {
                success: false,
                error: 'Transaction not found'
            };
            return res.status(404).json(response);
        }
        let drAccountNumber = '****ERROR';
        let crAccountNumber = '****ERROR';
        try {
            const drAccountFull = encryptionService.decrypt(transaction.drAccountNumberEncrypted);
            const crAccountFull = encryptionService.decrypt(transaction.crAccountNumberEncrypted);
            drAccountNumber = '****' + drAccountFull.slice(-4);
            crAccountNumber = '****' + crAccountFull.slice(-4);
        }
        catch (decryptError) {
            console.error('Decryption error for transaction', id, decryptError);
        }
        const response = {
            success: true,
            data: {
                ...transaction,
                drAccountNumber,
                crAccountNumber,
                drAccountNumberEncrypted: undefined,
                crAccountNumberEncrypted: undefined
            }
        };
        return res.json(response);
    }
    catch (error) {
        console.error('Get transaction error:', error);
        const response = {
            success: false,
            error: 'Failed to retrieve ACH transaction'
        };
        return res.status(500).json(response);
    }
});
router.patch('/:id/status', auth_1.requireOperator, async (req, res) => {
    try {
        const { id } = req.params;
        const statusSchema = joi_1.default.object({
            status: joi_1.default.string().valid(...Object.values(types_1.TransactionStatus)).required()
        });
        const { error, value } = statusSchema.validate(req.body);
        if (error) {
            const response = {
                success: false,
                error: error.details[0].message
            };
            return res.status(400).json(response);
        }
        const databaseService = req.app.locals.databaseService;
        const transaction = await databaseService.getTransaction(id);
        if (!transaction) {
            const response = {
                success: false,
                error: 'Transaction not found'
            };
            return res.status(404).json(response);
        }
        await databaseService.updateTransactionStatus(id, value.status);
        const response = {
            success: true,
            message: 'Transaction status updated successfully'
        };
        return res.json(response);
    }
    catch (error) {
        console.error('Update transaction status error:', error);
        const response = {
            success: false,
            error: 'Failed to update transaction status'
        };
        return res.status(500).json(response);
    }
});
router.get('/stats/summary', auth_1.requireInternal, async (req, res) => {
    try {
        const databaseService = req.app.locals.databaseService;
        const currentMonth = new Date();
        currentMonth.setDate(1);
        currentMonth.setHours(0, 0, 0, 0);
        const nextMonth = new Date(currentMonth);
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        const allTransactions = await databaseService.getTransactions(1, 1000);
        const stats = {
            totalTransactions: allTransactions.data?.length || 0,
            pendingTransactions: allTransactions.data?.filter(tx => tx.status === types_1.TransactionStatus.PENDING).length || 0,
            processedTransactions: allTransactions.data?.filter(tx => tx.status === types_1.TransactionStatus.PROCESSED).length || 0,
            failedTransactions: allTransactions.data?.filter(tx => tx.status === types_1.TransactionStatus.FAILED).length || 0,
            totalAmount: allTransactions.data?.reduce((sum, tx) => sum + tx.amount, 0) || 0,
            averageAmount: allTransactions.data?.length ?
                (allTransactions.data.reduce((sum, tx) => sum + tx.amount, 0) / allTransactions.data.length) : 0
        };
        const response = {
            success: true,
            data: stats
        };
        return res.json(response);
    }
    catch (error) {
        console.error('Get transaction stats error:', error);
        const response = {
            success: false,
            error: 'Failed to retrieve transaction statistics'
        };
        return res.status(500).json(response);
    }
});
router.get('/entries', async (req, res) => {
    try {
        const querySchema = joi_1.default.object({
            page: joi_1.default.number().integer().min(1).default(1),
            limit: joi_1.default.number().integer().min(1).max(100).default(50),
            status: joi_1.default.string().valid(...Object.values(types_1.TransactionStatus)).optional(),
            effectiveDate: joi_1.default.date().optional(),
            entryType: joi_1.default.string().valid('DR', 'CR').optional()
        });
        const { error, value } = querySchema.validate(req.query);
        if (error) {
            const response = {
                success: false,
                error: error.details[0].message
            };
            return res.status(400).json(response);
        }
        const databaseService = req.app.locals.databaseService;
        const encryptionService = req.app.locals.encryptionService;
        const businessDayService = req.app.locals.businessDayService;
        const transactionEntryService = new transactionEntryService_1.TransactionEntryService(databaseService, encryptionService, businessDayService);
        const filters = {};
        if (value.status)
            filters.status = value.status;
        if (value.effectiveDate)
            filters.effectiveDate = new Date(value.effectiveDate);
        if (value.entryType)
            filters.entryType = value.entryType;
        const result = await transactionEntryService.getTransactionEntriesForDisplay(value.page, value.limit, filters);
        const response = {
            success: true,
            data: result.data,
            pagination: result.pagination
        };
        res.json(response);
    }
    catch (error) {
        console.error('Get transaction entries error:', error);
        const response = {
            success: false,
            error: 'Failed to retrieve transaction entries'
        };
        res.status(500).json(response);
    }
});
router.get('/groups', async (req, res) => {
    try {
        const querySchema = joi_1.default.object({
            page: joi_1.default.number().integer().min(1).default(1),
            limit: joi_1.default.number().integer().min(1).max(100).default(50)
        });
        const { error, value } = querySchema.validate(req.query);
        if (error) {
            const response = {
                success: false,
                error: error.details[0].message
            };
            return res.status(400).json(response);
        }
        const databaseService = req.app.locals.databaseService;
        const result = await databaseService.getTransactionGroups(value.page, value.limit);
        const response = {
            success: true,
            data: result.data,
            pagination: result.pagination
        };
        res.json(response);
    }
    catch (error) {
        console.error('Get transaction groups error:', error);
        const response = {
            success: false,
            error: 'Failed to retrieve transaction groups'
        };
        res.status(500).json(response);
    }
});
//# sourceMappingURL=transactions.js.map
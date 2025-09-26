import express from 'express';
import Joi from 'joi';
import { DatabaseService } from '@/services/databaseService';
import { EncryptionService } from '@/services/encryptionService';
import { BusinessDayService } from '@/services/businessDayService';
import { NACHAService } from '@/services/nachaService';
import { TransactionEntryService } from '@/services/transactionEntryService';
import { ACHTransaction, TransactionStatus, ApiResponse } from '@/types';
import { authMiddleware, requireOperator, requireInternal } from '@/middleware/auth';

const router = express.Router();

// Apply authentication to all routes
router.use(authMiddleware);

// Generate NACHA files for a specific effective date - Internal access only
router.post('/generate', requireInternal, async (req, res) => {
  try {
    const generateSchema = Joi.object({
      effectiveDate: Joi.date().required(),
      fileType: Joi.string().valid('DR', 'CR').required()
    });

    const { error, value } = generateSchema.validate(req.body);
    if (error) {
      const response: ApiResponse = {
        success: false,
        error: error.details[0].message
      };
      return res.status(400).json(response);
    }

    const databaseService: DatabaseService = req.app.locals.databaseService;
    const encryptionService: EncryptionService = req.app.locals.encryptionService;
    const businessDayService: BusinessDayService = req.app.locals.businessDayService;
    const nachaService: NACHAService = req.app.locals.nachaService;

    const { effectiveDate, fileType } = value;

    // Calculate the appropriate effective date based on file type
    let targetEffectiveDate = new Date(effectiveDate);
    if (fileType === 'CR') {
      // Credit files should be 2 business days after debit effective date
      targetEffectiveDate = businessDayService.getCreditEffectiveDate(targetEffectiveDate);
    }

    // Get transactions for the effective date
    const transactionsResult = await databaseService.getTransactions(1, 1000, {
      effectiveDate: targetEffectiveDate,
      status: TransactionStatus.PENDING
    });

    if (!transactionsResult.data || transactionsResult.data.length === 0) {
      const response: ApiResponse = {
        success: false,
        error: `No pending transactions found for effective date ${targetEffectiveDate.toISOString().split('T')[0]}`
      };
      return res.status(404).json(response);
    }

    // Decrypt account numbers for NACHA file generation
    const decryptedTransactions: ACHTransaction[] = transactionsResult.data.map(tx => {
      const drAccountNumber = encryptionService.decrypt(tx.drAccountNumberEncrypted);
      const crAccountNumber = encryptionService.decrypt(tx.crAccountNumberEncrypted);
      
      return {
        ...tx,
        accountNumber: drAccountNumber, // Use DR account as primary
        drAccountNumber,
        crAccountNumber,
        drName: tx.drName,
        crName: tx.crName,
        drId: tx.drId,
        crId: tx.crId,
        drRoutingNumber: tx.drRoutingNumber,
        crRoutingNumber: tx.crRoutingNumber
      } as ACHTransaction;
    });

    // Generate NACHA file with encryption
    const nachaFile = nachaService.generateSecureNACHAFile(
      decryptedTransactions,
      targetEffectiveDate,
      fileType
    );

    // Save NACHA file to database
    const savedNachaFile = await databaseService.createNACHAFile({
      organizationId: 'default-org', // TODO: Get from request context
      filename: nachaFile.filename,
      content: nachaFile.content,
      effectiveDate: nachaFile.effectiveDate,
      transactionCount: nachaFile.transactionCount,
      totalAmount: nachaFile.totalAmount,
      totalRecords: nachaFile.transactionCount,
      totalDebits: fileType === 'DR' ? nachaFile.transactionCount : 0,
      totalCredits: fileType === 'CR' ? nachaFile.transactionCount : 0,
      status: 'generated',
      generatedAt: new Date(),
      filePath: `/nacha/${nachaFile.filename}`,
      transactionIds: decryptedTransactions.map(tx => tx.id),
      createdBy: req.user?.userId || 'system',
      transmitted: false
    });

    // Update transaction status to processed
    await Promise.all(
      decryptedTransactions.map(tx => 
        databaseService.updateTransactionStatus(tx.id, TransactionStatus.PROCESSED)
      )
    );

    // Increment NACHA service sequence number
    nachaService.incrementSequenceNumber();

    const response: ApiResponse = {
      success: true,
      data: {
        id: savedNachaFile.id,
        filename: savedNachaFile.filename,
        effectiveDate: savedNachaFile.effectiveDate,
        transactionCount: savedNachaFile.transactionCount,
        totalAmount: savedNachaFile.totalAmount,
        createdAt: savedNachaFile.createdAt
      },
      message: `NACHA ${fileType} file generated successfully`
    };

    return res.status(201).json(response);
  } catch (error) {
    console.error('Generate NACHA file error:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to generate NACHA file'
    };
    return res.status(500).json(response);
  }
});

// Generate NACHA files from transaction entries (new separate debit/credit structure)
router.post('/generate-from-entries', requireOperator, async (req, res) => {
  try {
    const generateSchema = Joi.object({
      effectiveDate: Joi.date().required(),
      fileType: Joi.string().valid('DR', 'CR').required()
    });

    const { error, value } = generateSchema.validate(req.body);
    if (error) {
      const response: ApiResponse = {
        success: false,
        error: error.details[0].message
      };
      return res.status(400).json(response);
    }

    const databaseService: DatabaseService = req.app.locals.databaseService;
    const encryptionService: EncryptionService = req.app.locals.encryptionService;
    const businessDayService: BusinessDayService = req.app.locals.businessDayService;
    const nachaService: NACHAService = req.app.locals.nachaService;

    // Create transaction entry service
    const transactionEntryService = new TransactionEntryService(
      databaseService,
      encryptionService,
      businessDayService
    );

    const { effectiveDate, fileType } = value;

    // Get transaction entries for the effective date and type
    const targetEffectiveDate = new Date(effectiveDate);
    const transactionEntries = await transactionEntryService.getTransactionEntriesForNACHA(
      targetEffectiveDate,
      fileType
    );

    if (transactionEntries.length === 0) {
      const response: ApiResponse = {
        success: false,
        error: `No pending ${fileType} transaction entries found for effective date ${targetEffectiveDate.toISOString().split('T')[0]}`
      };
      return res.status(404).json(response);
    }

    // Generate NACHA file from transaction entries
    const nachaFile = nachaService.generateNACHAFileFromEntries(
      transactionEntries,
      targetEffectiveDate,
      fileType
    );

    // Save NACHA file to database
    const savedNachaFile = await databaseService.createNACHAFile({
      organizationId: 'default-org', // TODO: Get from request context
      filename: nachaFile.filename,
      content: nachaFile.content,
      effectiveDate: nachaFile.effectiveDate,
      transactionCount: nachaFile.transactionCount,
      totalAmount: nachaFile.totalAmount,
      totalRecords: nachaFile.transactionCount,
      totalDebits: fileType === 'DR' ? nachaFile.transactionCount : 0,
      totalCredits: fileType === 'CR' ? nachaFile.transactionCount : 0,
      status: 'generated',
      generatedAt: new Date(),
      filePath: `/nacha/${nachaFile.filename}`,
      transactionIds: transactionEntries.map(entry => entry.id),
      createdBy: req.user?.userId || 'system',
      transmitted: false
    });

    // Update transaction entry status to processed
    await Promise.all(
      transactionEntries.map(entry => 
        transactionEntryService.updateTransactionEntryStatus(entry.id, TransactionStatus.PROCESSED)
      )
    );

    // Increment NACHA service sequence number
    nachaService.incrementSequenceNumber();

    const response: ApiResponse = {
      success: true,
      data: {
        id: savedNachaFile.id,
        filename: savedNachaFile.filename,
        effectiveDate: savedNachaFile.effectiveDate,
        transactionCount: savedNachaFile.transactionCount,
        totalAmount: savedNachaFile.totalAmount,
        createdAt: savedNachaFile.createdAt
      },
      message: `NACHA ${fileType} file generated successfully from transaction entries`
    };

    res.status(201).json(response);
  } catch (error) {
    console.error('Generate NACHA file from entries error:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to generate NACHA file from transaction entries'
    };
    res.status(500).json(response);
  }
});

// Generate NACHA files for next business day (automated daily processing)
router.post('/generate/daily', requireOperator, async (req, res) => {
  try {
    const generateSchema = Joi.object({
      fileType: Joi.string().valid('DR', 'CR').required(),
      releaseDate: Joi.date().optional() // Optional, defaults to today
    });

    const { error, value } = generateSchema.validate(req.body);
    if (error) {
      const response: ApiResponse = {
        success: false,
        error: error.details[0].message
      };
      return res.status(400).json(response);
    }

    const databaseService: DatabaseService = req.app.locals.databaseService;
    const encryptionService: EncryptionService = req.app.locals.encryptionService;
    const businessDayService: BusinessDayService = req.app.locals.businessDayService;
    const nachaService: NACHAService = req.app.locals.nachaService;

    const { fileType, releaseDate } = value;

    // Calculate target effective date for transactions to be released today
    // This ensures ACH files are released one business day prior to their effective date
    const releaseFromDate = releaseDate ? new Date(releaseDate) : new Date();
    let targetEffectiveDate = businessDayService.getACHReleaseEffectiveDate(releaseFromDate);
    
    if (fileType === 'CR') {
      // Credit files should be 2 business days after debit effective date
      targetEffectiveDate = businessDayService.getCreditEffectiveDate(targetEffectiveDate);
    }

    // Get transactions for the calculated effective date
    const transactionsResult = await databaseService.getTransactions(1, 1000, {
      effectiveDate: targetEffectiveDate,
      status: TransactionStatus.PENDING
    });

    if (!transactionsResult.data || transactionsResult.data.length === 0) {
      const response: ApiResponse = {
        success: false,
        error: `No pending transactions found for effective date ${targetEffectiveDate.toISOString().split('T')[0]} (release date: ${releaseFromDate.toISOString().split('T')[0]})`
      };
      return res.status(404).json(response);
    }

    // Decrypt account numbers for NACHA file generation
    const decryptedTransactions: ACHTransaction[] = transactionsResult.data.map(tx => {
      const drAccountNumber = encryptionService.decrypt(tx.drAccountNumberEncrypted);
      const crAccountNumber = encryptionService.decrypt(tx.crAccountNumberEncrypted);
      
      return {
        ...tx,
        accountNumber: drAccountNumber, // Use DR account as primary
        drAccountNumber,
        crAccountNumber,
        drName: tx.drName,
        crName: tx.crName,
        drId: tx.drId,
        crId: tx.crId,
        drRoutingNumber: tx.drRoutingNumber,
        crRoutingNumber: tx.crRoutingNumber
      } as ACHTransaction;
    });

    // Generate NACHA file
    const nachaFile = nachaService.generateNACHAFile(
      decryptedTransactions,
      targetEffectiveDate,
      fileType
    );

    // Save NACHA file to database
    const savedNachaFile = await databaseService.createNACHAFile({
      organizationId: 'default-org', // TODO: Get from request context
      filename: nachaFile.filename,
      content: nachaFile.content,
      effectiveDate: nachaFile.effectiveDate,
      transactionCount: nachaFile.transactionCount,
      totalAmount: nachaFile.totalAmount,
      totalRecords: nachaFile.transactionCount,
      totalDebits: fileType === 'DR' ? nachaFile.transactionCount : 0,
      totalCredits: fileType === 'CR' ? nachaFile.transactionCount : 0,
      status: 'generated',
      generatedAt: new Date(),
      filePath: `/nacha/${nachaFile.filename}`,
      transactionIds: decryptedTransactions.map(tx => tx.id),
      createdBy: req.user?.userId || 'system',
      transmitted: false
    });

    // Update transaction status to processed
    await Promise.all(
      decryptedTransactions.map(tx => 
        databaseService.updateTransactionStatus(tx.id, TransactionStatus.PROCESSED)
      )
    );

    // Increment NACHA service sequence number
    nachaService.incrementSequenceNumber();

    const response: ApiResponse = {
      success: true,
      data: {
        id: savedNachaFile.id,
        filename: savedNachaFile.filename,
        effectiveDate: savedNachaFile.effectiveDate,
        transactionCount: savedNachaFile.transactionCount,
        totalAmount: savedNachaFile.totalAmount,
        createdAt: savedNachaFile.createdAt,
        releaseDate: releaseFromDate.toISOString().split('T')[0]
      },
      message: `NACHA ${fileType} file generated successfully for daily processing`
    };

    res.status(201).json(response);
  } catch (error) {
    console.error('Generate daily NACHA file error:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to generate daily NACHA file'
    };
    res.status(500).json(response);
  }
});

// Get effective date for ACH processing for a given release date
router.get('/effective-date/:releaseDate', async (req, res) => {
  try {
    const { releaseDate } = req.params;
    const checkDate = new Date(releaseDate);

    if (isNaN(checkDate.getTime())) {
      const response: ApiResponse = {
        success: false,
        error: 'Invalid date format. Use YYYY-MM-DD format.'
      };
      return res.status(400).json(response);
    }

    const businessDayService: BusinessDayService = req.app.locals.businessDayService;

    const debitEffectiveDate = businessDayService.getACHReleaseEffectiveDate(checkDate);
    const creditEffectiveDate = businessDayService.getCreditEffectiveDate(debitEffectiveDate);

    const response: ApiResponse = {
      success: true,
      data: {
        releaseDate: checkDate.toISOString().split('T')[0],
        debitEffectiveDate: debitEffectiveDate.toISOString().split('T')[0],
        creditEffectiveDate: creditEffectiveDate.toISOString().split('T')[0],
        isReleaseBusinessDay: businessDayService.isBusinessDay(checkDate),
        daysUntilDebitEffective: businessDayService.getBusinessDaysBetween(checkDate, debitEffectiveDate)
      }
    };

    res.json(response);
  } catch (error) {
    console.error('Get effective date error:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to calculate effective date'
    };
    res.status(500).json(response);
  }
});

// Get all NACHA files - Internal access only
router.get('/files', requireInternal, async (req, res) => {
  try {
    const querySchema = Joi.object({
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(100).default(50)
    });

    const { error, value } = querySchema.validate(req.query);
    if (error) {
      const response: ApiResponse = {
        success: false,
        error: error.details[0].message
      };
      return res.status(400).json(response);
    }

    const databaseService: DatabaseService = req.app.locals.databaseService;
    const result = await databaseService.getNACHAFiles(value.page, value.limit);

    // Remove file content from list view for performance
    const filesWithoutContent = result.data!.map(file => ({
      ...file,
      content: undefined
    }));

    const response: ApiResponse = {
      success: true,
      data: filesWithoutContent,
      pagination: result.pagination
    };

    return res.json(response);
  } catch (error) {
    console.error('Get NACHA files error:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to retrieve NACHA files'
    };
    return res.status(500).json(response);
  }
});

// Get a specific NACHA file by ID - Internal access only
router.get('/files/:id', requireInternal, async (req, res) => {
  try {
    const { id } = req.params;

    const databaseService: DatabaseService = req.app.locals.databaseService;
    const nachaFile = await databaseService.getNACHAFile(id);

    if (!nachaFile) {
      const response: ApiResponse = {
        success: false,
        error: 'NACHA file not found'
      };
      return res.status(404).json(response);
    }

    const response: ApiResponse = {
      success: true,
      data: nachaFile
    };

    return res.json(response);
  } catch (error) {
    console.error('Get NACHA file error:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to retrieve NACHA file'
    };
    return res.status(500).json(response);
  }
});

// Download a NACHA file - Internal access only
router.get('/files/:id/download', requireInternal, async (req, res) => {
  try {
    const { id } = req.params;

    const databaseService: DatabaseService = req.app.locals.databaseService;
    const nachaService: NACHAService = req.app.locals.nachaService;
    const nachaFile = await databaseService.getNACHAFile(id);

    if (!nachaFile) {
      const response: ApiResponse = {
        success: false,
        error: 'NACHA file not found'
      };
      return res.status(404).json(response);
    }

    // Get the actual content (decrypt if necessary)
    const actualContent = nachaService.getNACHAFileContent(nachaFile.content);

    // Set headers for file download
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', `attachment; filename="${nachaFile.filename}"`);
    
    return res.send(actualContent);
  } catch (error) {
    console.error('Download NACHA file error:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to download NACHA file'
    };
    return res.status(500).json(response);
  }
});

// Validate a NACHA file - Internal access only
router.post('/files/:id/validate', requireInternal, async (req, res) => {
  try {
    const { id } = req.params;

    const databaseService: DatabaseService = req.app.locals.databaseService;
    const nachaService: NACHAService = req.app.locals.nachaService;

    const nachaFile = await databaseService.getNACHAFile(id);

    if (!nachaFile) {
      const response: ApiResponse = {
        success: false,
        error: 'NACHA file not found'
      };
      return res.status(404).json(response);
    }

    const validation = nachaService.validateNACHAFileComplete(nachaFile.content);

    const response: ApiResponse = {
      success: true,
      data: {
        isValid: validation.isValid,
        errors: validation.errors,
        filename: nachaFile.filename,
        isEncrypted: validation.isEncrypted,
        integrityValid: validation.integrityValid,
        metadata: validation.metadata
      }
    };

    return res.json(response);
  } catch (error) {
    console.error('Validate NACHA file error:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to validate NACHA file'
    };
    return res.status(500).json(response);
  }
});

// Mark NACHA file as transmitted - Internal access only
router.patch('/files/:id/transmitted', requireInternal, async (req, res) => {
  try {
    const { id } = req.params;

    const databaseService: DatabaseService = req.app.locals.databaseService;

    // Check if file exists
    const nachaFile = await databaseService.getNACHAFile(id);
    if (!nachaFile) {
      const response: ApiResponse = {
        success: false,
        error: 'NACHA file not found'
      };
      return res.status(404).json(response);
    }

    await databaseService.updateNACHAFileTransmissionStatus(id, true);

    const response: ApiResponse = {
      success: true,
      message: 'NACHA file marked as transmitted'
    };

    return res.json(response);
  } catch (error) {
    console.error('Update NACHA file transmission status error:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to update NACHA file transmission status'
    };
    return res.status(500).json(response);
  }
});

// Get NACHA generation statistics - Internal access only
router.get('/stats/generation', requireInternal, async (req, res) => {
  try {
    const databaseService: DatabaseService = req.app.locals.databaseService;

    // Get all NACHA files for statistics
    const allFiles = await databaseService.getNACHAFiles(1, 1000);
    
    const stats = {
      totalFiles: allFiles.data?.length || 0,
      transmittedFiles: allFiles.data?.filter(file => file.transmitted).length || 0,
      pendingFiles: allFiles.data?.filter(file => !file.transmitted).length || 0,
      totalTransactionCount: allFiles.data?.reduce((sum, file) => sum + file.transactionCount, 0) || 0,
      totalAmount: allFiles.data?.reduce((sum, file) => sum + file.totalAmount, 0) || 0,
      averageFileSize: allFiles.data?.length ? 
        (allFiles.data.reduce((sum, file) => sum + file.transactionCount, 0) / allFiles.data.length) : 0
    };

    const response: ApiResponse = {
      success: true,
      data: stats
    };

    return res.json(response);
  } catch (error) {
    console.error('Get NACHA generation stats error:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to retrieve NACHA generation statistics'
    };
    return res.status(500).json(response);
  }
});

export { router as nachaRouter };
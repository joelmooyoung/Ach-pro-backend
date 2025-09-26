import moment from 'moment';
import { ACHTransaction, NACHAFile, TransactionEntry } from '@/types';
import { EncryptionService } from './encryptionService';

export interface NACHAConfig {
  immediateDestination: string;
  immediateOrigin: string;
  companyName: string;
  companyId: string;
  companyDiscretionaryData?: string;
  originatingDFI: string;
}

export class NACHAService {
  private config: NACHAConfig;
  private fileSequenceNumber: number = 1;
  private encryptionService?: EncryptionService;

  constructor(config: NACHAConfig, encryptionService?: EncryptionService) {
    this.config = config;
    this.encryptionService = encryptionService;
  }

  /**
   * Generate a NACHA file from ACH transactions
   */
  generateNACHAFile(
    transactions: ACHTransaction[], 
    effectiveDate: Date,
    fileType: 'DR' | 'CR' = 'DR',
    encrypt: boolean = true
  ): NACHAFile {
    const filename = this.generateFilename(effectiveDate, fileType);
    const content = this.generateFileContent(transactions, effectiveDate, fileType);
    const transactionIds = transactions.map(tx => tx.id);
    
    // Encrypt content if encryption service is available and encryption is requested
    const finalContent = encrypt && this.encryptionService 
      ? this.encryptionService.encryptNACHAFile(content, transactionIds, effectiveDate)
      : content;
    
    const totalAmount = transactions.reduce((sum, tx) => sum + tx.amount, 0);

    return {
      id: this.generateId(),
      organizationId: 'default-org', // TODO: Get from context
      filename,
      content: finalContent,
      effectiveDate,
      transactionCount: transactions.length,
      totalAmount,
      totalRecords: transactions.length,
      totalDebits: fileType === 'DR' ? transactions.length : 0,
      totalCredits: fileType === 'CR' ? transactions.length : 0,
      status: 'generated',
      generatedAt: new Date(),
      transmittedAt: undefined,
      filePath: `/nacha/${filename}`,
      transactionIds,
      createdBy: 'system',
      createdAt: new Date(),
      transmitted: false,
      encrypted: encrypt && !!this.encryptionService
    };
  }

  /**
   * Generate a NACHA file from transaction entries (new method for separate debit/credit structure)
   */
  generateNACHAFileFromEntries(
    entries: TransactionEntry[], 
    effectiveDate: Date,
    fileType: 'DR' | 'CR'
  ): NACHAFile {
    // Filter entries by type to ensure we only include the correct type
    const filteredEntries = entries.filter(entry => entry.entryType === fileType);
    
    const filename = this.generateFilename(effectiveDate, fileType);
    const content = this.generateFileContentFromEntries(filteredEntries, effectiveDate, fileType);
    
    const totalAmount = filteredEntries.reduce((sum, entry) => sum + entry.amount, 0);

    return {
      id: this.generateId(),
      organizationId: 'default-org', // TODO: Get from context
      filename,
      content,
      effectiveDate,
      transactionCount: filteredEntries.length,
      totalAmount,
      totalRecords: filteredEntries.length,
      totalDebits: fileType === 'DR' ? filteredEntries.length : 0,
      totalCredits: fileType === 'CR' ? filteredEntries.length : 0,
      status: 'generated',
      generatedAt: new Date(),
      transmittedAt: undefined,
      filePath: `/nacha/${filename}`,
      transactionIds: filteredEntries.map(entry => entry.id),
      createdBy: 'system',
      createdAt: new Date(),
      transmitted: false
    };
  }

  /**
   * Generate NACHA file with enhanced security (always encrypted)
   */
  generateSecureNACHAFile(
    transactions: ACHTransaction[], 
    effectiveDate: Date,
    fileType: 'DR' | 'CR' = 'DR'
  ): NACHAFile {
    if (!this.encryptionService) {
      throw new Error('Encryption service is required for secure NACHA file generation');
    }
    return this.generateNACHAFile(transactions, effectiveDate, fileType, true);
  }

  /**
   * Generate the complete NACHA file content
   */
  private generateFileContent(
    transactions: ACHTransaction[], 
    effectiveDate: Date,
    fileType: 'DR' | 'CR'
  ): string {
    const lines: string[] = [];

    // File Header Record (Record Type 1)
    lines.push(this.generateFileHeader(effectiveDate));

    // Batch Header Record (Record Type 5)
    lines.push(this.generateBatchHeader(effectiveDate, fileType));

    // Entry Detail Records (Record Type 6)
    transactions.forEach(transaction => {
      lines.push(this.generateEntryDetail(transaction, fileType));
    });

    // Batch Control Record (Record Type 8)
    lines.push(this.generateBatchControl(transactions, fileType));

    // File Control Record (Record Type 9)
    lines.push(this.generateFileControl(transactions));

    // Pad to multiple of 10 records with 9s
    const recordCount = lines.length;
    const paddingNeeded = 10 - (recordCount % 10);
    if (paddingNeeded !== 10) {
      for (let i = 0; i < paddingNeeded; i++) {
        lines.push('9'.repeat(94));
      }
    }

    return lines.join('\n');
  }

  /**
   * Generate the complete NACHA file content from transaction entries
   */
  private generateFileContentFromEntries(
    entries: TransactionEntry[], 
    effectiveDate: Date,
    fileType: 'DR' | 'CR'
  ): string {
    const lines: string[] = [];

    // File Header Record (Record Type 1)
    lines.push(this.generateFileHeader(effectiveDate));

    // Batch Header Record (Record Type 5)
    lines.push(this.generateBatchHeader(effectiveDate, fileType));

    // Entry Detail Records (Record Type 6)
    entries.forEach(entry => {
      lines.push(this.generateEntryDetailFromEntry(entry));
    });

    // Batch Control Record (Record Type 8)
    lines.push(this.generateBatchControlFromEntries(entries, fileType));

    // File Control Record (Record Type 9)
    lines.push(this.generateFileControlFromEntries(entries));

    // Pad to multiple of 10 records with 9s
    const recordCount = lines.length;
    const paddingNeeded = 10 - (recordCount % 10);
    if (paddingNeeded !== 10) {
      for (let i = 0; i < paddingNeeded; i++) {
        lines.push('9'.repeat(94));
      }
    }

    return lines.join('\n');
  }

  /**
   * Generate File Header Record (Record Type 1)
   */
  private generateFileHeader(effectiveDate: Date): string {
    const creationDate = moment().format('YYMMDD');
    const creationTime = moment().format('HHmm');
    
    return [
      '1',                                          // Record Type Code
      '01',                                         // Priority Code
      this.padLeft(this.config.immediateDestination, 10, ' '), // Immediate Destination
      this.padLeft(this.config.immediateOrigin, 10, ' '),      // Immediate Origin
      creationDate,                                 // File Creation Date
      creationTime,                                 // File Creation Time
      this.padLeft(this.fileSequenceNumber.toString(), 1, 'A'), // File ID Modifier
      '094',                                        // Record Size
      '10',                                         // Blocking Factor
      '1',                                          // Format Code
      this.padRight(this.config.immediateDestination, 23, ' '), // Immediate Destination Name
      this.padRight(this.config.immediateOrigin, 23, ' '),      // Immediate Origin Name
      this.padRight('', 8, ' ')                     // Reference Code
    ].join('');
  }

  /**
   * Generate Batch Header Record (Record Type 5)
   */
  private generateBatchHeader(effectiveDate: Date, fileType: 'DR' | 'CR'): string {
    const serviceClassCode = fileType === 'DR' ? '225' : '220'; // 225 = Debits Only, 220 = Credits Only
    const effectiveDateStr = moment(effectiveDate).format('YYMMDD');
    
    return [
      '5',                                          // Record Type Code
      serviceClassCode,                             // Service Class Code
      this.padRight(this.config.companyName, 16, ' '), // Company Name
      this.padRight(this.config.companyDiscretionaryData || '', 20, ' '), // Company Discretionary Data
      this.config.companyId,                        // Company Identification
      'CCD',                                        // Standard Entry Class Code
      this.padRight(`${fileType} PAYMENT`, 10, ' '), // Company Entry Description
      this.padRight('', 6, ' '),                    // Company Descriptive Date
      effectiveDateStr,                             // Effective Entry Date
      this.padRight('', 3, ' '),                    // Settlement Date
      '1',                                          // Originator Status Code
      this.config.originatingDFI.substring(0, 8),  // Originating DFI Identification
      '0000001'                                     // Batch Number
    ].join('');
  }

  /**
   * Generate Entry Detail Record (Record Type 6)
   */
  private generateEntryDetail(transaction: ACHTransaction, fileType: 'DR' | 'CR'): string {
    const transactionCode = fileType === 'DR' ? '27' : '22'; // 27 = Checking Debit, 22 = Checking Credit
    const routingNumber = fileType === 'DR' ? (transaction.drRoutingNumber || transaction.routingNumber) : (transaction.crRoutingNumber || transaction.routingNumber);
    const accountNumber = fileType === 'DR' ? (transaction.drAccountNumber || transaction.accountNumber) : (transaction.crAccountNumber || transaction.accountNumber);
    const individualName = fileType === 'DR' ? (transaction.drName || transaction.individualName) : (transaction.crName || transaction.individualName);
    const individualId = fileType === 'DR' ? (transaction.drId || transaction.individualId) : (transaction.crId || transaction.individualId);
    
    const amount = Math.round(transaction.amount * 100); // Convert to cents
    
    return [
      '6',                                          // Record Type Code
      transactionCode,                              // Transaction Code
      routingNumber.substring(0, 8),                // Receiving DFI Identification
      routingNumber.substring(8, 9),                // Check Digit
      this.padLeft(accountNumber, 17, ' '),         // DFI Account Number
      this.padLeft(amount.toString(), 10, '0'),     // Amount
      this.padLeft(individualId, 15, ' '),          // Individual Identification Number
      this.padRight(individualName, 22, ' '),       // Individual Name
      this.padRight('', 2, ' '),                    // Discretionary Data
      '0',                                          // Addenda Record Indicator
      this.padLeft((this.getTraceNumber()).toString(), 15, '0') // Trace Number
    ].join('');
  }

  /**
   * Generate Entry Detail Record from Transaction Entry (Record Type 6)
   */
  private generateEntryDetailFromEntry(entry: TransactionEntry): string {
    const transactionCode = entry.entryType === 'DR' ? '27' : '22'; // 27 = Checking Debit, 22 = Checking Credit
    const amount = Math.round(entry.amount * 100); // Convert to cents
    
    return [
      '6',                                          // Record Type Code
      transactionCode,                              // Transaction Code
      entry.routingNumber.substring(0, 8),          // Receiving DFI Identification
      entry.routingNumber.substring(8, 9),          // Check Digit
      this.padLeft(entry.accountNumber, 17, ' '),   // DFI Account Number
      this.padLeft(amount.toString(), 10, '0'),     // Amount
      this.padLeft(entry.accountId, 15, ' '),       // Individual Identification Number
      this.padRight(entry.accountName, 22, ' '),    // Individual Name
      this.padRight('', 2, ' '),                    // Discretionary Data
      '0',                                          // Addenda Record Indicator
      this.padLeft((this.getTraceNumber()).toString(), 15, '0') // Trace Number
    ].join('');
  }

  /**
   * Generate Batch Control Record (Record Type 8)
   */
  private generateBatchControl(transactions: ACHTransaction[], fileType: 'DR' | 'CR'): string {
    const serviceClassCode = fileType === 'DR' ? '225' : '220';
    const entryCount = transactions.length;
    const totalAmount = transactions.reduce((sum, tx) => sum + tx.amount, 0);
    const totalAmountCents = Math.round(totalAmount * 100);
    
    // Calculate entry hash (sum of first 8 digits of routing numbers)
    const entryHash = transactions.reduce((sum, tx) => {
      const routingNumber = fileType === 'DR' ? (tx.drRoutingNumber || tx.routingNumber) : (tx.crRoutingNumber || tx.routingNumber);
      return sum + parseInt(routingNumber.substring(0, 8));
    }, 0);
    
    return [
      '8',                                          // Record Type Code
      serviceClassCode,                             // Service Class Code
      this.padLeft(entryCount.toString(), 6, '0'),  // Entry/Addenda Count
      this.padLeft((entryHash % 10000000000).toString(), 10, '0'), // Entry Hash
      this.padLeft(totalAmountCents.toString(), 12, '0'), // Total Debit Entry Dollar Amount
      this.padLeft('0', 12, '0'),                   // Total Credit Entry Dollar Amount
      this.config.companyId,                        // Company Identification
      this.padRight('', 19, ' '),                   // Message Authentication Code
      this.padRight('', 6, ' '),                    // Reserved
      this.config.originatingDFI.substring(0, 8),  // Originating DFI Identification
      '0000001'                                     // Batch Number
    ].join('');
  }

  /**
   * Generate Batch Control Record from Transaction Entries (Record Type 8)
   */
  private generateBatchControlFromEntries(entries: TransactionEntry[], fileType: 'DR' | 'CR'): string {
    const serviceClassCode = fileType === 'DR' ? '225' : '220';
    const entryCount = entries.length;
    const totalAmount = entries.reduce((sum, entry) => sum + entry.amount, 0);
    const totalAmountCents = Math.round(totalAmount * 100);
    
    // Calculate entry hash (sum of first 8 digits of routing numbers)
    const entryHash = entries.reduce((sum, entry) => {
      return sum + parseInt(entry.routingNumber.substring(0, 8));
    }, 0);
    
    return [
      '8',                                          // Record Type Code
      serviceClassCode,                             // Service Class Code
      this.padLeft(entryCount.toString(), 6, '0'),  // Entry/Addenda Count
      this.padLeft((entryHash % 10000000000).toString(), 10, '0'), // Entry Hash
      this.padLeft(totalAmountCents.toString(), 12, '0'), // Total Debit Entry Dollar Amount
      this.padLeft('0', 12, '0'),                   // Total Credit Entry Dollar Amount
      this.config.companyId,                        // Company Identification
      this.padRight('', 19, ' '),                   // Message Authentication Code
      this.padRight('', 6, ' '),                    // Reserved
      this.config.originatingDFI.substring(0, 8),  // Originating DFI Identification
      '0000001'                                     // Batch Number
    ].join('');
  }

  /**
   * Generate File Control Record (Record Type 9)
   */
  private generateFileControl(transactions: ACHTransaction[]): string {
    const batchCount = 1;
    const blockCount = Math.ceil((5 + transactions.length) / 10); // 5 = header + batch header + batch control + file control records
    const entryCount = transactions.length;
    const totalAmount = transactions.reduce((sum, tx) => sum + tx.amount, 0);
    const totalAmountCents = Math.round(totalAmount * 100);
    
    // Calculate entry hash
    const entryHash = transactions.reduce((sum, tx) => {
      const drHash = parseInt((tx.drRoutingNumber || tx.routingNumber).substring(0, 8));
      const crHash = parseInt((tx.crRoutingNumber || tx.routingNumber).substring(0, 8));
      return sum + drHash + crHash;
    }, 0);
    
    return [
      '9',                                          // Record Type Code
      this.padLeft(batchCount.toString(), 6, '0'),  // Batch Count
      this.padLeft(blockCount.toString(), 6, '0'),  // Block Count
      this.padLeft(entryCount.toString(), 8, '0'),  // Entry/Addenda Count
      this.padLeft((entryHash % 10000000000).toString(), 10, '0'), // Entry Hash
      this.padLeft(totalAmountCents.toString(), 12, '0'), // Total Debit Entry Dollar Amount
      this.padLeft(totalAmountCents.toString(), 12, '0'), // Total Credit Entry Dollar Amount
      this.padRight('', 39, ' ')                    // Reserved
    ].join('');
  }

  /**
   * Generate File Control Record from Transaction Entries (Record Type 9)
   */
  private generateFileControlFromEntries(entries: TransactionEntry[]): string {
    const batchCount = 1;
    const blockCount = Math.ceil((5 + entries.length) / 10); // 5 = header + batch header + batch control + file control records
    const entryCount = entries.length;
    const totalAmount = entries.reduce((sum, entry) => sum + entry.amount, 0);
    const totalAmountCents = Math.round(totalAmount * 100);
    
    // Calculate entry hash (for transaction entries, only use their routing numbers once)
    const entryHash = entries.reduce((sum, entry) => {
      return sum + parseInt(entry.routingNumber.substring(0, 8));
    }, 0);
    
    return [
      '9',                                          // Record Type Code
      this.padLeft(batchCount.toString(), 6, '0'),  // Batch Count
      this.padLeft(blockCount.toString(), 6, '0'),  // Block Count
      this.padLeft(entryCount.toString(), 8, '0'),  // Entry/Addenda Count
      this.padLeft((entryHash % 10000000000).toString(), 10, '0'), // Entry Hash
      this.padLeft(totalAmountCents.toString(), 12, '0'), // Total Debit Entry Dollar Amount
      this.padLeft(totalAmountCents.toString(), 12, '0'), // Total Credit Entry Dollar Amount
      this.padRight('', 39, ' ')                    // Reserved
    ].join('');
  }

  /**
   * Generate filename for NACHA file
   */
  private generateFilename(effectiveDate: Date, fileType: 'DR' | 'CR'): string {
    const dateStr = moment(effectiveDate).format('YYYYMMDD');
    const timeStr = moment().format('HHmmss');
    return `ACH_${fileType}_${dateStr}_${timeStr}.txt`;
  }

  /**
   * Generate a unique ID
   */
  private generateId(): string {
    return `nacha_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get trace number (simplified implementation)
   */
  private getTraceNumber(): number {
    return parseInt(this.config.originatingDFI.substring(0, 8)) * 10000000 + 
           Math.floor(Math.random() * 10000000);
  }

  /**
   * Pad string to the left
   */
  private padLeft(str: string, length: number, padChar: string): string {
    return str.padStart(length, padChar).substring(0, length);
  }

  /**
   * Pad string to the right
   */
  private padRight(str: string, length: number, padChar: string): string {
    return str.padEnd(length, padChar).substring(0, length);
  }

  /**
   * Decrypt and validate NACHA file content
   */
  decryptNACHAFile(encryptedContent: string): { content: string; metadata: any; isValid: boolean } {
    if (!this.encryptionService) {
      throw new Error('Encryption service is required for NACHA file decryption');
    }
    
    return this.encryptionService.decryptNACHAFile(encryptedContent);
  }

  /**
   * Get plain text content from NACHA file (handles both encrypted and unencrypted)
   */
  getNACHAFileContent(content: string): string {
    // Check if content is encrypted (starts with FILE:)
    if (content.startsWith('FILE:') && this.encryptionService) {
      const decrypted = this.decryptNACHAFile(content);
      return decrypted.content;
    }
    
    // Return as-is if not encrypted
    return content;
  }

  /**
   * Enhanced NACHA file validation with encryption support
   */
  validateNACHAFileComplete(content: string): { 
    isValid: boolean; 
    errors: string[]; 
    isEncrypted: boolean; 
    metadata?: any;
    integrityValid?: boolean;
  } {
    let actualContent = content;
    let isEncrypted = false;
    let metadata: any = {};
    let integrityValid = true;

    // Handle encrypted content
    if (content.startsWith('FILE:')) {
      isEncrypted = true;
      if (!this.encryptionService) {
        return {
          isValid: false,
          errors: ['Encrypted file detected but no encryption service available'],
          isEncrypted: true
        };
      }

      try {
        const decrypted = this.decryptNACHAFile(content);
        actualContent = decrypted.content;
        metadata = decrypted.metadata;
        integrityValid = decrypted.isValid;
        
        if (!integrityValid) {
          return {
            isValid: false,
            errors: ['File integrity check failed - content may be corrupted'],
            isEncrypted: true,
            metadata,
            integrityValid: false
          };
        }
      } catch (error) {
        return {
          isValid: false,
          errors: [`Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
          isEncrypted: true,
          integrityValid: false
        };
      }
    }

    // Validate NACHA format
    const validation = this.validateNACHAFile(actualContent);
    
    return {
      ...validation,
      isEncrypted,
      metadata,
      integrityValid
    };
  }

  /**
   * Validate NACHA file format (basic validation)
   */
  validateNACHAFile(content: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    const lines = content.split('\n');

    // Check if file has minimum required records
    if (lines.length < 4) {
      errors.push('File must have at least 4 records (header, batch header, batch control, file control)');
    }

    // Check record types
    if (lines.length > 0 && !lines[0].startsWith('1')) {
      errors.push('First record must be File Header (type 1)');
    }

    if (lines.length > 1 && !lines[1].startsWith('5')) {
      errors.push('Second record must be Batch Header (type 5)');
    }

    // Check that all lines are 94 characters (except possibly the last line)
    lines.forEach((line, index) => {
      if (line.length !== 94 && index < lines.length - 1) {
        errors.push(`Line ${index + 1} must be exactly 94 characters`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Increment file sequence number
   */
  incrementSequenceNumber(): void {
    this.fileSequenceNumber++;
    if (this.fileSequenceNumber > 9) {
      this.fileSequenceNumber = 1;
    }
  }
}
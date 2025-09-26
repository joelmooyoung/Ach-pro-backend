import moment from 'moment';
import { ACHTransaction, NACHAFile } from '../types';
import { BusinessDayService } from '../utils/businessDay';
import { logger } from '../utils/logger';

interface CompanyInfo {
  name: string;
  id: string;
  description: string;
  routingNumber: string;
  accountNumber: string;
}

export class NACHAService {
  private static readonly RECORD_LENGTH = 94;
  
  // Generate NACHA file for transactions with specific effective date
  static async generateNACHAFile(
    transactions: ACHTransaction[],
    effectiveDate: Date,
    companyInfo: CompanyInfo
  ): Promise<{ content: string; filename: string; metadata: Partial<NACHAFile> }> {
    
    await BusinessDayService.refreshHolidaysIfNeeded();
    
    // Ensure effective date is a business day
    const adjustedEffectiveDate = BusinessDayService.isBusinessDay(effectiveDate)
      ? effectiveDate
      : BusinessDayService.getNextBusinessDay(effectiveDate);

    // Filter transactions for this effective date
    const effectiveDateStr = moment(adjustedEffectiveDate).format('YYYY-MM-DD');
    const filteredTransactions = transactions.filter(t => 
      moment(t.effectiveDate).format('YYYY-MM-DD') === effectiveDateStr
    );

    if (filteredTransactions.length === 0) {
      throw new Error('No transactions found for the specified effective date');
    }

    // Calculate totals
    const totalDebits = filteredTransactions
      .filter(t => t.transactionType === 'debit')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const totalCredits = filteredTransactions
      .filter(t => t.transactionType === 'credit')
      .reduce((sum, t) => sum + t.amount, 0);

    // Generate file content
    const fileContent = this.buildNACHAFileContent(
      filteredTransactions,
      adjustedEffectiveDate,
      companyInfo
    );

    // Generate filename
    const filename = `ACH_${moment(adjustedEffectiveDate).format('YYYYMMDD')}_${Date.now()}.txt`;

    const metadata: Partial<NACHAFile> = {
      filename,
      effectiveDate: adjustedEffectiveDate,
      totalRecords: filteredTransactions.length,
      totalDebits,
      totalCredits,
      status: 'generated',
      generatedAt: new Date(),
      transactionIds: filteredTransactions.map(t => t.id)
    };

    return { content: fileContent, filename, metadata };
  }

  private static buildNACHAFileContent(
    transactions: ACHTransaction[],
    effectiveDate: Date,
    companyInfo: CompanyInfo
  ): string {
    const lines: string[] = [];

    // File Header Record (Record Type 1)
    lines.push(this.buildFileHeader(effectiveDate, companyInfo));

    // Batch Header Record (Record Type 5)
    lines.push(this.buildBatchHeader(effectiveDate, companyInfo));

    // Entry Detail Records (Record Type 6)
    transactions.forEach(transaction => {
      lines.push(this.buildEntryDetail(transaction));
    });

    // Batch Control Record (Record Type 8)
    lines.push(this.buildBatchControl(transactions, companyInfo));

    // File Control Record (Record Type 9)
    lines.push(this.buildFileControl(transactions));

    // Pad file to multiple of 10 records with 9s
    while (lines.length % 10 !== 0) {
      lines.push('9'.repeat(this.RECORD_LENGTH));
    }

    return lines.join('\n');
  }

  private static buildFileHeader(effectiveDate: Date, companyInfo: CompanyInfo): string {
    const now = new Date();
    const fileCreationDate = moment(now).format('YYMMDD');
    const fileCreationTime = moment(now).format('HHmm');
    const fileIdModifier = 'A'; // Single character
    
    return [
      '1',                                          // Record Type Code
      '01',                                         // Priority Code
      ' ' + companyInfo.routingNumber.padEnd(9),   // Immediate Destination (10 chars)
      companyInfo.id.padEnd(10),                   // Immediate Origin (10 chars)
      fileCreationDate,                            // File Creation Date (6 chars)
      fileCreationTime,                            // File Creation Time (4 chars)
      fileIdModifier,                              // File ID Modifier (1 char)
      '094',                                       // Record Size (3 chars)
      '10',                                        // Blocking Factor (2 chars)
      '1',                                         // Format Code (1 char)
      companyInfo.name.padEnd(23),                 // Immediate Destination Name (23 chars)
      companyInfo.name.padEnd(23),                 // Immediate Origin Name (23 chars)
      ' '.repeat(8)                                // Reference Code (8 chars)
    ].join('').substring(0, this.RECORD_LENGTH);
  }

  private static buildBatchHeader(effectiveDate: Date, companyInfo: CompanyInfo): string {
    const serviceClassCode = '200'; // Mixed debits and credits
    const batchNumber = '0000001';
    const effectiveDateStr = moment(effectiveDate).format('YYMMDD');
    
    return [
      '5',                                         // Record Type Code
      serviceClassCode,                            // Service Class Code (3 chars)
      companyInfo.name.padEnd(16),                 // Company Name (16 chars)
      ' '.repeat(20),                              // Company Discretionary Data (20 chars)
      companyInfo.id.padEnd(10),                   // Company Identification (10 chars)
      'PPD',                                       // Standard Entry Class Code (3 chars)
      companyInfo.description.padEnd(10),          // Company Entry Description (10 chars)
      ' '.repeat(6),                               // Company Descriptive Date (6 chars)
      effectiveDateStr,                            // Effective Entry Date (6 chars)
      ' '.repeat(3),                               // Settlement Date (3 chars)
      '1',                                         // Originator Status Code (1 char)
      companyInfo.routingNumber.substring(0, 8),   // Originating DFI ID (8 chars)
      batchNumber                                  // Batch Number (7 chars)
    ].join('').substring(0, this.RECORD_LENGTH);
  }

  private static buildEntryDetail(transaction: ACHTransaction): string {
    const transactionCode = transaction.transactionType === 'debit' ? 
      (transaction.accountType === 'checking' ? '27' : '37') :
      (transaction.accountType === 'checking' ? '22' : '32');
    
    const receivingDFI = transaction.routingNumber.substring(0, 8);
    const checkDigit = transaction.routingNumber.substring(8, 9);
    const dfiAccountNumber = transaction.accountNumber.padEnd(17);
    const amount = Math.round(transaction.amount * 100).toString().padStart(10, '0');
    const individualName = transaction.individualName.padEnd(22);
    const traceNumber = receivingDFI + '0000001'; // Sequential within batch

    return [
      '6',                     // Record Type Code
      transactionCode,         // Transaction Code (2 chars)
      receivingDFI,           // Receiving DFI Identification (8 chars)
      checkDigit,             // Check Digit (1 char)
      dfiAccountNumber,       // DFI Account Number (17 chars)
      amount,                 // Amount (10 chars)
      transaction.individualId.padEnd(15), // Individual ID Number (15 chars)
      individualName,         // Individual Name (22 chars)
      '  ',                   // Discretionary Data (2 chars)
      '0',                    // Addenda Record Indicator (1 char)
      traceNumber             // Trace Number (15 chars)
    ].join('').substring(0, this.RECORD_LENGTH);
  }

  private static buildBatchControl(transactions: ACHTransaction[], companyInfo: CompanyInfo): string {
    const serviceClassCode = '200';
    const entryAddendaCount = transactions.length.toString().padStart(6, '0');
    const entryHash = this.calculateEntryHash(transactions);
    
    const totalDebits = transactions
      .filter(t => t.transactionType === 'debit')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const totalCredits = transactions
      .filter(t => t.transactionType === 'credit')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalDebitAmount = Math.round(totalDebits * 100).toString().padStart(12, '0');
    const totalCreditAmount = Math.round(totalCredits * 100).toString().padStart(12, '0');

    return [
      '8',                                         // Record Type Code
      serviceClassCode,                            // Service Class Code (3 chars)
      entryAddendaCount,                          // Entry/Addenda Count (6 chars)
      entryHash,                                  // Entry Hash (10 chars)
      totalDebitAmount,                           // Total Debit Entry Dollar Amount (12 chars)
      totalCreditAmount,                          // Total Credit Entry Dollar Amount (12 chars)
      companyInfo.id.padEnd(10),                  // Company Identification (10 chars)
      ' '.repeat(19),                             // Message Authentication Code (19 chars)
      ' '.repeat(6),                              // Reserved (6 chars)
      companyInfo.routingNumber.substring(0, 8),  // Originating DFI ID (8 chars)
      '0000001'                                   // Batch Number (7 chars)
    ].join('').substring(0, this.RECORD_LENGTH);
  }

  private static buildFileControl(transactions: ACHTransaction[]): string {
    const batchCount = '000001'; // Single batch
    const blockCount = Math.ceil((transactions.length + 4) / 10).toString().padStart(6, '0'); // +4 for header/control records
    const entryAddendaCount = transactions.length.toString().padStart(8, '0');
    const entryHash = this.calculateEntryHash(transactions);
    
    const totalDebits = transactions
      .filter(t => t.transactionType === 'debit')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const totalCredits = transactions
      .filter(t => t.transactionType === 'credit')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalDebitAmount = Math.round(totalDebits * 100).toString().padStart(12, '0');
    const totalCreditAmount = Math.round(totalCredits * 100).toString().padStart(12, '0');

    return [
      '9',                     // Record Type Code
      batchCount,             // Batch Count (6 chars)
      blockCount,             // Block Count (6 chars)
      entryAddendaCount,      // Entry/Addenda Count (8 chars)
      entryHash,              // Entry Hash (10 chars)
      totalDebitAmount,       // Total Debit Entry Dollar Amount (12 chars)
      totalCreditAmount,      // Total Credit Entry Dollar Amount (12 chars)
      ' '.repeat(39)          // Reserved (39 chars)
    ].join('').substring(0, this.RECORD_LENGTH);
  }

  private static calculateEntryHash(transactions: ACHTransaction[]): string {
    const hash = transactions.reduce((sum, transaction) => {
      const routingNumber = parseInt(transaction.routingNumber.substring(0, 8));
      return sum + routingNumber;
    }, 0);
    
    // Take last 10 digits
    return (hash % 10000000000).toString().padStart(10, '0');
  }

  // Validate NACHA file format
  static validateNACHAFile(content: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    const lines = content.split('\n');

    // Check file structure
    if (lines.length % 10 !== 0) {
      errors.push('File must contain a multiple of 10 records');
    }

    // Check record lengths
    lines.forEach((line, index) => {
      if (line.length !== this.RECORD_LENGTH) {
        errors.push(`Line ${index + 1}: Invalid record length (${line.length}, expected ${this.RECORD_LENGTH})`);
      }
    });

    // Check required records
    if (!lines[0] || lines[0].charAt(0) !== '1') {
      errors.push('Missing or invalid file header record');
    }

    if (!lines[1] || lines[1].charAt(0) !== '5') {
      errors.push('Missing or invalid batch header record');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}
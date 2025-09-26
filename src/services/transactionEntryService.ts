import { v4 as uuidv4 } from 'uuid';
import { 
  TransactionEntry, 
  EncryptedTransactionEntry, 
  TransactionGroup,
  CreateSeparateTransactionRequest,
  TransactionStatus 
} from '@/types';
import { DatabaseService } from './databaseService';
import { EncryptionService } from './encryptionService';
import { BusinessDayService } from './businessDayService';

export class TransactionEntryService {
  constructor(
    private databaseService: DatabaseService,
    private encryptionService: EncryptionService,
    private businessDayService: BusinessDayService
  ) {}

  /**
   * Create a new transaction with separate debit and credit entries
   */
  async createSeparateTransaction(
    request: CreateSeparateTransactionRequest,
    senderIp?: string
  ): Promise<TransactionGroup> {
    // Generate a parent transaction ID to link the entries
    const parentTransactionId = uuidv4();

    // Ensure effective dates are business days
    const drEffectiveDate = this.businessDayService.getACHEffectiveDate(request.drEffectiveDate);
    const crEffectiveDate = this.businessDayService.getACHEffectiveDate(request.crEffectiveDate);

    // Create debit entry
    const debitEntry: TransactionEntry = {
      id: uuidv4(),
      parentTransactionId,
      entryType: 'DR',
      routingNumber: request.drRoutingNumber,
      accountNumber: request.drAccountNumber,
      accountId: request.drId,
      accountName: request.drName,
      amount: request.amount,
      effectiveDate: drEffectiveDate,
      senderIp,
      senderDetails: request.senderDetails,
      createdAt: new Date(),
      updatedAt: new Date(),
      status: TransactionStatus.PENDING
    };

    // Create credit entry
    const creditEntry: TransactionEntry = {
      id: uuidv4(),
      parentTransactionId,
      entryType: 'CR',
      routingNumber: request.crRoutingNumber,
      accountNumber: request.crAccountNumber,
      accountId: request.crId,
      accountName: request.crName,
      amount: request.amount,
      effectiveDate: crEffectiveDate,
      senderIp,
      senderDetails: request.senderDetails,
      createdAt: new Date(),
      updatedAt: new Date(),
      status: TransactionStatus.PENDING
    };

    // Encrypt sensitive account numbers
    const { accountNumber: drAccountNumber, ...debitEntryRest } = debitEntry;
    const encryptedDebitEntry: EncryptedTransactionEntry = {
      ...debitEntryRest,
      accountNumberEncrypted: this.encryptionService.encrypt(drAccountNumber)
    };

    const { accountNumber: crAccountNumber, ...creditEntryRest } = creditEntry;
    const encryptedCreditEntry: EncryptedTransactionEntry = {
      ...creditEntryRest,
      accountNumberEncrypted: this.encryptionService.encrypt(crAccountNumber)
    };

    // Save entries to database
    const savedDebitEntry = await this.databaseService.createTransactionEntry(encryptedDebitEntry);
    const savedCreditEntry = await this.databaseService.createTransactionEntry(encryptedCreditEntry);

    // Create transaction group linking the entries
    const transactionGroup = await this.databaseService.createTransactionGroup({
      drEntryId: savedDebitEntry.id,
      crEntryId: savedCreditEntry.id,
      senderIp,
      senderDetails: request.senderDetails
    });

    return transactionGroup;
  }

  /**
   * Create a transaction from legacy ACH transaction data (for backward compatibility)
   */
  async createTransactionFromLegacy(
    drRoutingNumber: string,
    drAccountNumber: string,
    drId: string,
    drName: string,
    crRoutingNumber: string,
    crAccountNumber: string,
    crId: string,
    crName: string,
    amount: number,
    effectiveDate: Date,
    senderIp?: string,
    senderDetails?: string
  ): Promise<TransactionGroup> {
    const request: CreateSeparateTransactionRequest = {
      drRoutingNumber,
      drAccountNumber,
      drId,
      drName,
      drEffectiveDate: effectiveDate,
      crRoutingNumber,
      crAccountNumber,
      crId,
      crName,
      crEffectiveDate: effectiveDate, // Same effective date for both entries in legacy mode
      amount,
      senderDetails
    };

    return this.createSeparateTransaction(request, senderIp);
  }

  /**
   * Get transaction entries by effective date and type for NACHA file generation
   */
  async getTransactionEntriesForNACHA(
    effectiveDate: Date,
    entryType: 'DR' | 'CR'
  ): Promise<TransactionEntry[]> {
    const result = await this.databaseService.getTransactionEntries(1, 1000, {
      effectiveDate,
      entryType,
      status: TransactionStatus.PENDING
    });

    if (!result.data) {
      return [];
    }

    // Decrypt account numbers for NACHA file generation
    const decryptedEntries: TransactionEntry[] = result.data.map(entry => {
      const accountNumber = this.encryptionService.decrypt(entry.accountNumberEncrypted);
      
      return {
        ...entry,
        accountNumber
      } as TransactionEntry;
    });

    return decryptedEntries;
  }

  /**
   * Update status of transaction entries
   */
  async updateTransactionEntryStatus(id: string, status: TransactionStatus): Promise<void> {
    await this.databaseService.updateTransactionEntryStatus(id, status);
  }

  /**
   * Get transaction entries with decrypted account numbers for display (masked)
   */
  async getTransactionEntriesForDisplay(
    page: number = 1,
    limit: number = 50,
    filters?: { status?: string; effectiveDate?: Date; entryType?: 'DR' | 'CR' }
  ) {
    const result = await this.databaseService.getTransactionEntries(page, limit, filters);

    if (!result.data) {
      return result;
    }

    // Decrypt and mask account numbers for display
    const entriesWithMaskedAccounts = result.data.map(entry => {
      try {
        const accountFull = this.encryptionService.decrypt(entry.accountNumberEncrypted);
        
        return {
          ...entry,
          accountNumber: '****' + accountFull.slice(-4),
          accountNumberEncrypted: undefined
        };
      } catch (decryptError) {
        console.error('Decryption error for transaction entry', entry.id, decryptError);
        return {
          ...entry,
          accountNumber: '****ERROR',
          accountNumberEncrypted: undefined
        };
      }
    });

    return {
      ...result,
      data: entriesWithMaskedAccounts
    };
  }
}
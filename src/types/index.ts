export interface Organization {
  id: string;
  organizationKey: string;
  name: string;
  description?: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export enum TransactionStatus {
  PENDING = 'pending',
  PROCESSED = 'processed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

export enum UserRole {
  ADMIN = 'admin',
  OPERATOR = 'operator',
  VIEWER = 'viewer',
  ORGANIZATION = 'organization'
}

// Individual transaction entry (either debit or credit)
export interface TransactionEntry {
  id: string;
  parentTransactionId: string;
  entryType: 'DR' | 'CR';
  // Account Information
  routingNumber: string;
  accountNumber: string;
  accountId: string;
  accountName: string;
  // Transaction Details
  amount: number;
  effectiveDate: Date;
  // Metadata
  senderIp?: string;
  senderDetails?: string;
  createdAt: Date;
  updatedAt: Date;
  status: TransactionStatus;
}

// Transaction group representing the relationship between debit and credit entries
export interface TransactionGroup {
  id: string;
  drEntryId: string;
  crEntryId: string;
  drEntry?: TransactionEntry;
  crEntry?: TransactionEntry;
  // Metadata
  senderIp?: string;
  senderDetails?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Legacy ACH Transaction interface (kept for backward compatibility and migration)
export interface ACHTransaction {
  id: string;
  transactionId: string;
  routingNumber: string;
  accountNumber: string; // Will be encrypted in storage
  accountType: 'checking' | 'savings';
  transactionType: 'debit' | 'credit';
  amount: number;
  effectiveDate: Date;
  description: string;
  individualId: string;
  individualName: string;
  companyName?: string;
  companyId?: string;
  // Additional fields for separate DR/CR structure
  drRoutingNumber?: string;
  drAccountNumber?: string;
  drId?: string;
  drName?: string;
  crRoutingNumber?: string;
  crAccountNumber?: string;
  crId?: string;
  crName?: string;
  // Metadata
  senderIp: string;
  timestamp: Date;
  status: TransactionStatus;
  processedAt?: Date;
  nachaFileId?: string;
  createdBy: string;
  updatedBy?: string;
}

export interface User {
  id: string;
  email: string;
  password: string;
  role: UserRole;
  name: string;
  organizationId?: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Transaction submission interface
export interface TransactionSubmission {
  // Debit Information
  drRoutingNumber: string;
  drAccountNumber: string;
  drId: string;
  drName: string;
  // Credit Information
  crRoutingNumber: string;
  crAccountNumber: string;
  crId: string;
  crName: string;
  // Transaction Details
  amount: number;
  effectiveDate: Date;
  // Metadata
  senderIp?: string;
  senderDetails?: string;
  createdAt: Date;
  updatedAt: Date;
  status: TransactionStatus;
}

// Encrypted version of transaction entry
export interface EncryptedTransactionEntry extends Omit<TransactionEntry, 'accountNumber'> {
  accountNumberEncrypted: string;
}

// Legacy encrypted transaction interface (kept for backward compatibility)
export interface EncryptedTransaction extends Omit<ACHTransaction, 'accountNumber'> {
  accountNumberEncrypted: string;
  // Additional fields for separate DR/CR structure
  drRoutingNumber: string;
  drAccountNumberEncrypted: string;
  drId: string;
  drName: string;
  crRoutingNumber: string;
  crAccountNumberEncrypted: string;
  crId: string;
  crName: string;
  senderDetails?: string;
  // Additional properties for database compatibility
  organizationId?: string;
  traceNumber?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface NACHAFile {
  id: string;
  organizationId: string;
  filename: string;
  content: string;
  effectiveDate: Date;
  transactionCount: number;
  totalAmount: number;
  totalRecords: number;
  totalDebits: number;
  totalCredits: number;
  status: 'generated' | 'transmitted' | 'failed';
  generatedAt: Date;
  transmittedAt?: Date;
  filePath: string;
  transactionIds: string[];
  createdBy: string;
  createdAt: Date;
  transmitted: boolean;
  encrypted?: boolean;
}

export interface FederalHoliday {
  id: string;
  name: string;
  date: Date;
  year: number;
  recurring: boolean;
  isRecurring: boolean;
  createdAt: Date;
}

export interface SystemConfig {
  id: string;
  key: string;
  value: any;
  description?: string;
  isEncrypted: boolean;
  updatedBy: string;
  updatedAt: Date;
}

export interface SFTPConfig {
  host: string;
  port: number;
  username: string;
  password?: string;
  privateKey?: string;
  remotePath: string;
  enabled: boolean;
}

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Request to create a new transaction with separate DR and CR effective dates
export interface CreateSeparateTransactionRequest {
  // Debit Information
  drRoutingNumber: string;
  drAccountNumber: string;
  drId: string;
  drName: string;
  drEffectiveDate: Date;
  // Credit Information
  crRoutingNumber: string;
  crAccountNumber: string;
  crId: string;
  crName: string;
  crEffectiveDate: Date;
  // Transaction Details
  amount: number;
  // Metadata
  senderDetails?: string;
}

export interface AuthTokenPayload {
  userId: string;
  email: string;
  role: UserRole;
  iat: number;
  exp: number;
}

export interface BusinessDayCalculatorOptions {
  holidays: Date[];
  excludeWeekends: boolean;
}

export interface TransactionFilters {
  status?: string;
  effectiveDate?: Date;
  organizationId?: string;
  amountMin?: number;
  amountMax?: number;
  traceNumber?: string;
  drId?: string;
  crId?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

export interface TransactionEntryFilters {
  status?: string;
  effectiveDate?: Date;
  entryType?: 'DR' | 'CR';
  organizationId?: string;
  amountMin?: number;
  amountMax?: number;
  dateFrom?: Date;
  dateTo?: Date;
}

export interface DailySummary {
  date: string;
  totalTransactions: number;
  totalAmount: number;
  debitCount: number;
  debitAmount: number;
  creditCount: number;
  creditAmount: number;
}

export interface TransactionStats {
  totalTransactions: number;
  totalAmount: number;
  pendingTransactions: number;
  processedTransactions: number;
  failedTransactions: number;
  cancelledTransactions: number;
}

export interface NACHAGenerationStats {
  totalFiles: number;
  totalTransactions: number;
  totalAmount: number;
  lastGenerated?: Date;
}

export interface SFTPSettings {
  host: string;
  port: number;
  username: string;
  password?: string;
  privateKey?: string;
  remotePath: string;
  enabled: boolean;
}

export interface ACHSettings {
  immediateOrigin: string;
  immediateDestination: string;
  companyName: string;
  companyId: string;
  companyDiscretionaryData?: string;
  companyEntryDescription: string;
  companyDescriptiveDate?: string;
  effectiveEntryDate?: string;
  settlementDate?: string;
  originatorStatusCode: string;
  originatingDFIId: string;
  batchNumber: number;
}

export interface BusinessDayInfo {
  date: string;
  isBusinessDay: boolean;
  isHoliday: boolean;
  holidayName?: string;
  nextBusinessDay?: string;
}
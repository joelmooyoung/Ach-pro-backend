export interface Organization {
    id: string;
    organizationKey: string;
    name: string;
    description?: string;
    active: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export declare enum TransactionStatus {
    PENDING = "pending",
    PROCESSED = "processed",
    FAILED = "failed",
    CANCELLED = "cancelled"
}
export declare enum UserRole {
    ADMIN = "admin",
    OPERATOR = "operator",
    VIEWER = "viewer",
    ORGANIZATION = "organization"
}
export interface TransactionEntry {
    id: string;
    parentTransactionId: string;
    entryType: 'DR' | 'CR';
    routingNumber: string;
    accountNumber: string;
    accountId: string;
    accountName: string;
    amount: number;
    effectiveDate: Date;
    senderIp?: string;
    senderDetails?: string;
    createdAt: Date;
    updatedAt: Date;
    status: TransactionStatus;
}
export interface TransactionGroup {
    id: string;
    drEntryId: string;
    crEntryId: string;
    drEntry?: TransactionEntry;
    crEntry?: TransactionEntry;
    senderIp?: string;
    senderDetails?: string;
    createdAt: Date;
    updatedAt: Date;
}
export interface ACHTransaction {
    id: string;
    transactionId: string;
    routingNumber: string;
    accountNumber: string;
    accountType: 'checking' | 'savings';
    transactionType: 'debit' | 'credit';
    amount: number;
    effectiveDate: Date;
    description: string;
    individualId: string;
    individualName: string;
    companyName?: string;
    companyId?: string;
    drRoutingNumber?: string;
    drAccountNumber?: string;
    drId?: string;
    drName?: string;
    crRoutingNumber?: string;
    crAccountNumber?: string;
    crId?: string;
    crName?: string;
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
export interface TransactionSubmission {
    drRoutingNumber: string;
    drAccountNumber: string;
    drId: string;
    drName: string;
    crRoutingNumber: string;
    crAccountNumber: string;
    crId: string;
    crName: string;
    amount: number;
    effectiveDate: Date;
    senderIp?: string;
    senderDetails?: string;
    createdAt: Date;
    updatedAt: Date;
    status: TransactionStatus;
}
export interface EncryptedTransactionEntry extends Omit<TransactionEntry, 'accountNumber'> {
    accountNumberEncrypted: string;
}
export interface EncryptedTransaction extends Omit<ACHTransaction, 'accountNumber'> {
    accountNumberEncrypted: string;
    drRoutingNumber: string;
    drAccountNumberEncrypted: string;
    drId: string;
    drName: string;
    crRoutingNumber: string;
    crAccountNumberEncrypted: string;
    crId: string;
    crName: string;
    senderDetails?: string;
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
export interface CreateSeparateTransactionRequest {
    drRoutingNumber: string;
    drAccountNumber: string;
    drId: string;
    drName: string;
    drEffectiveDate: Date;
    crRoutingNumber: string;
    crAccountNumber: string;
    crId: string;
    crName: string;
    crEffectiveDate: Date;
    amount: number;
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
//# sourceMappingURL=index.d.ts.map
import { ACHTransaction, NACHAFile, PaginatedResponse } from '../types';
interface CreateTransactionData {
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
    senderIp: string;
    createdBy: string;
}
interface TransactionFilters {
    page: number;
    limit: number;
    status?: string;
    startDate?: Date;
    endDate?: Date;
}
export declare class ACHTransactionService {
    static createTransaction(data: CreateTransactionData): Promise<ACHTransaction>;
    static getTransactions(filters: TransactionFilters): Promise<PaginatedResponse<ACHTransaction>>;
    static getTransactionById(id: string): Promise<ACHTransaction | null>;
    static updateTransactionStatus(id: string, status: string, updatedBy: string): Promise<ACHTransaction | null>;
    static generateNACHAFile(effectiveDate: Date, createdBy: string): Promise<NACHAFile>;
    static getNACHAFiles(options: {
        page: number;
        limit: number;
    }): Promise<PaginatedResponse<NACHAFile>>;
    static getNACHAFileContent(id: string): Promise<{
        filename: string;
        content: string;
    } | null>;
    private static getCompanyInfo;
    private static mapDatabaseToTransaction;
    private static mapDatabaseToNACHAFile;
}
export {};
//# sourceMappingURL=achTransaction.d.ts.map
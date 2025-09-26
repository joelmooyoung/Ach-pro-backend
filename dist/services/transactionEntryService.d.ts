import { TransactionEntry, EncryptedTransactionEntry, TransactionGroup, CreateSeparateTransactionRequest, TransactionStatus } from '../types';
import { DatabaseService } from './databaseService';
import { EncryptionService } from './encryptionService';
import { BusinessDayService } from './businessDayService';
export declare class TransactionEntryService {
    private databaseService;
    private encryptionService;
    private businessDayService;
    constructor(databaseService: DatabaseService, encryptionService: EncryptionService, businessDayService: BusinessDayService);
    createSeparateTransaction(request: CreateSeparateTransactionRequest, senderIp?: string): Promise<TransactionGroup>;
    createTransactionFromLegacy(drRoutingNumber: string, drAccountNumber: string, drId: string, drName: string, crRoutingNumber: string, crAccountNumber: string, crId: string, crName: string, amount: number, effectiveDate: Date, senderIp?: string, senderDetails?: string): Promise<TransactionGroup>;
    getTransactionEntriesForNACHA(effectiveDate: Date, entryType: 'DR' | 'CR'): Promise<TransactionEntry[]>;
    updateTransactionEntryStatus(id: string, status: TransactionStatus): Promise<void>;
    getTransactionEntriesForDisplay(page?: number, limit?: number, filters?: {
        status?: string;
        effectiveDate?: Date;
        entryType?: 'DR' | 'CR';
    }): Promise<import("../types").PaginatedResponse<EncryptedTransactionEntry> | {
        data: {
            accountNumber: string;
            accountNumberEncrypted: undefined;
            id: string;
            parentTransactionId: string;
            entryType: "DR" | "CR";
            routingNumber: string;
            accountId: string;
            accountName: string;
            amount: number;
            effectiveDate: Date;
            senderIp?: string | undefined;
            senderDetails?: string | undefined;
            createdAt: Date;
            updatedAt: Date;
            status: TransactionStatus;
        }[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
        success: boolean;
        message?: string;
        error?: string;
    }>;
}
//# sourceMappingURL=transactionEntryService.d.ts.map
import { ACHTransaction, NACHAFile, TransactionEntry } from '../types';
import { EncryptionService } from './encryptionService';
export interface NACHAConfig {
    immediateDestination: string;
    immediateOrigin: string;
    companyName: string;
    companyId: string;
    companyDiscretionaryData?: string;
    originatingDFI: string;
}
export declare class NACHAService {
    private config;
    private fileSequenceNumber;
    private encryptionService?;
    constructor(config: NACHAConfig, encryptionService?: EncryptionService);
    generateNACHAFile(transactions: ACHTransaction[], effectiveDate: Date, fileType?: 'DR' | 'CR', encrypt?: boolean): NACHAFile;
    generateNACHAFileFromEntries(entries: TransactionEntry[], effectiveDate: Date, fileType: 'DR' | 'CR'): NACHAFile;
    generateSecureNACHAFile(transactions: ACHTransaction[], effectiveDate: Date, fileType?: 'DR' | 'CR'): NACHAFile;
    private generateFileContent;
    private generateFileContentFromEntries;
    private generateFileHeader;
    private generateBatchHeader;
    private generateEntryDetail;
    private generateEntryDetailFromEntry;
    private generateBatchControl;
    private generateBatchControlFromEntries;
    private generateFileControl;
    private generateFileControlFromEntries;
    private generateFilename;
    private generateId;
    private getTraceNumber;
    private padLeft;
    private padRight;
    decryptNACHAFile(encryptedContent: string): {
        content: string;
        metadata: any;
        isValid: boolean;
    };
    getNACHAFileContent(content: string): string;
    validateNACHAFileComplete(content: string): {
        isValid: boolean;
        errors: string[];
        isEncrypted: boolean;
        metadata?: any;
        integrityValid?: boolean;
    };
    validateNACHAFile(content: string): {
        isValid: boolean;
        errors: string[];
    };
    incrementSequenceNumber(): void;
}
//# sourceMappingURL=nachaService.d.ts.map
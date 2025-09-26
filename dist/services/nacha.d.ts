import { ACHTransaction, NACHAFile } from '../types';
interface CompanyInfo {
    name: string;
    id: string;
    description: string;
    routingNumber: string;
    accountNumber: string;
}
export declare class NACHAService {
    private static readonly RECORD_LENGTH;
    static generateNACHAFile(transactions: ACHTransaction[], effectiveDate: Date, companyInfo: CompanyInfo): Promise<{
        content: string;
        filename: string;
        metadata: Partial<NACHAFile>;
    }>;
    private static buildNACHAFileContent;
    private static buildFileHeader;
    private static buildBatchHeader;
    private static buildEntryDetail;
    private static buildBatchControl;
    private static buildFileControl;
    private static calculateEntryHash;
    static validateNACHAFile(content: string): {
        isValid: boolean;
        errors: string[];
    };
}
export {};
//# sourceMappingURL=nacha.d.ts.map
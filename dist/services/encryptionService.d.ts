export declare class EncryptionService {
    private readonly algorithm;
    private readonly key;
    constructor(encryptionKey: string);
    encrypt(text: string): string;
    decrypt(encryptedText: string): string;
    hash(text: string): string;
    generateToken(length?: number): string;
    encryptFileContent(content: string, metadata?: Record<string, any>): string;
    decryptFileContent(encryptedFileData: string): {
        content: string;
        metadata: Record<string, any>;
        timestamp: string;
        version: string;
    };
    encryptNACHAFile(nachaContent: string, transactionIds: string[], effectiveDate: Date): string;
    decryptNACHAFile(encryptedNACHAData: string): {
        content: string;
        metadata: any;
        isValid: boolean;
    };
}
//# sourceMappingURL=encryptionService.d.ts.map
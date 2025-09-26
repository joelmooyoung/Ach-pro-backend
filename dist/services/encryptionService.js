"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EncryptionService = void 0;
const crypto_1 = __importDefault(require("crypto"));
class EncryptionService {
    constructor(encryptionKey) {
        this.algorithm = 'aes-256-cbc';
        this.key = crypto_1.default.scryptSync(encryptionKey, 'salt', 32);
    }
    encrypt(text) {
        try {
            const iv = crypto_1.default.randomBytes(16);
            const cipher = crypto_1.default.createCipheriv(this.algorithm, this.key, iv);
            let encrypted = cipher.update(text, 'utf8', 'hex');
            encrypted += cipher.final('hex');
            return iv.toString('hex') + ':' + encrypted;
        }
        catch (error) {
            throw new Error(`Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    decrypt(encryptedText) {
        try {
            const [ivHex, encrypted] = encryptedText.split(':');
            if (!ivHex || !encrypted) {
                throw new Error('Invalid encrypted data format');
            }
            const iv = Buffer.from(ivHex, 'hex');
            const decipher = crypto_1.default.createDecipheriv(this.algorithm, this.key, iv);
            let decrypted = decipher.update(encrypted, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            return decrypted;
        }
        catch (error) {
            throw new Error(`Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    hash(text) {
        return crypto_1.default.createHash('sha256').update(text).digest('hex');
    }
    generateToken(length = 32) {
        return crypto_1.default.randomBytes(length).toString('hex');
    }
    encryptFileContent(content, metadata) {
        try {
            const iv = crypto_1.default.randomBytes(16);
            const cipher = crypto_1.default.createCipheriv(this.algorithm, this.key, iv);
            const fileData = {
                content,
                metadata: metadata || {},
                timestamp: new Date().toISOString(),
                version: '1.0'
            };
            const fileJson = JSON.stringify(fileData);
            let encrypted = cipher.update(fileJson, 'utf8', 'hex');
            encrypted += cipher.final('hex');
            return `FILE:${iv.toString('hex')}:${encrypted}`;
        }
        catch (error) {
            throw new Error(`File encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    decryptFileContent(encryptedFileData) {
        try {
            if (!encryptedFileData.startsWith('FILE:')) {
                throw new Error('Invalid encrypted file format');
            }
            const [, ivHex, encrypted] = encryptedFileData.split(':');
            if (!ivHex || !encrypted) {
                throw new Error('Invalid encrypted file data format');
            }
            const iv = Buffer.from(ivHex, 'hex');
            const decipher = crypto_1.default.createDecipheriv(this.algorithm, this.key, iv);
            let decrypted = decipher.update(encrypted, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            const fileData = JSON.parse(decrypted);
            if (!fileData.content) {
                throw new Error('Invalid file data structure');
            }
            return {
                content: fileData.content,
                metadata: fileData.metadata || {},
                timestamp: fileData.timestamp,
                version: fileData.version
            };
        }
        catch (error) {
            throw new Error(`File decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    encryptNACHAFile(nachaContent, transactionIds, effectiveDate) {
        const metadata = {
            type: 'NACHA',
            transactionIds,
            effectiveDate: effectiveDate.toISOString(),
            recordCount: nachaContent.split('\n').length,
            checksum: this.hash(nachaContent)
        };
        return this.encryptFileContent(nachaContent, metadata);
    }
    decryptNACHAFile(encryptedNACHAData) {
        const decrypted = this.decryptFileContent(encryptedNACHAData);
        const expectedChecksum = this.hash(decrypted.content);
        const isValid = decrypted.metadata.checksum === expectedChecksum;
        return {
            content: decrypted.content,
            metadata: decrypted.metadata,
            isValid
        };
    }
}
exports.EncryptionService = EncryptionService;
//# sourceMappingURL=encryptionService.js.map
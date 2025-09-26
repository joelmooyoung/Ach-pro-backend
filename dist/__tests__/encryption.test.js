"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const encryption_1 = require("../utils/encryption");
describe('EncryptionService', () => {
    const testData = 'test-sensitive-data';
    beforeAll(() => {
        process.env.ENCRYPTION_KEY = 'test-encryption-key-for-testing';
    });
    test('should encrypt and decrypt data correctly', () => {
        const encrypted = encryption_1.EncryptionService.encrypt(testData);
        expect(encrypted).not.toBe(testData);
        expect(encrypted).toBeTruthy();
        const decrypted = encryption_1.EncryptionService.decrypt(encrypted);
        expect(decrypted).toBe(testData);
    });
    test('should hash sensitive data consistently', () => {
        const hash1 = encryption_1.EncryptionService.hashSensitiveData(testData);
        const hash2 = encryption_1.EncryptionService.hashSensitiveData(testData);
        expect(hash1).toBe(hash2);
        expect(hash1).not.toBe(testData);
        expect(hash1).toHaveLength(64); // SHA256 produces 64-char hex string
    });
    test('should throw error for invalid decryption', () => {
        expect(() => {
            encryption_1.EncryptionService.decrypt('invalid-encrypted-data');
        }).toThrow('Decryption failed');
    });
});
//# sourceMappingURL=encryption.test.js.map
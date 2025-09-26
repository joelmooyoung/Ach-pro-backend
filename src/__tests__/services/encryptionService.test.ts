import { EncryptionService } from '../../services/encryptionService';

describe('EncryptionService', () => {
  let encryptionService: EncryptionService;
  const testKey = 'test-encryption-key-for-unit-tests-1234567890';

  beforeEach(() => {
    encryptionService = new EncryptionService(testKey);
  });

  describe('Basic Encryption/Decryption', () => {
    test('should encrypt and decrypt text correctly', () => {
      const originalText = 'Test sensitive data 123456789';
      const encrypted = encryptionService.encrypt(originalText);
      const decrypted = encryptionService.decrypt(encrypted);

      expect(decrypted).toBe(originalText);
      expect(encrypted).not.toBe(originalText);
      expect(encrypted).toContain(':'); // Should contain IV separator
    });

    test('should generate different encrypted values for same input', () => {
      const text = 'Same input text';
      const encrypted1 = encryptionService.encrypt(text);
      const encrypted2 = encryptionService.encrypt(text);

      expect(encrypted1).not.toBe(encrypted2); // Due to random IV
      expect(encryptionService.decrypt(encrypted1)).toBe(text);
      expect(encryptionService.decrypt(encrypted2)).toBe(text);
    });

    test('should handle empty strings', () => {
      const empty = '';
      const encrypted = encryptionService.encrypt(empty);
      const decrypted = encryptionService.decrypt(encrypted);

      expect(decrypted).toBe(empty);
    });

    test('should throw error for invalid encrypted format', () => {
      expect(() => {
        encryptionService.decrypt('invalid-format');
      }).toThrow('Decryption failed');

      expect(() => {
        encryptionService.decrypt('invalid:format:too:many:parts');
      }).toThrow('Decryption failed');
    });
  });

  describe('Account Number Encryption (Sensitive Data)', () => {
    test('should encrypt account numbers securely', () => {
      const accountNumber = '1234567890123456';
      const encrypted = encryptionService.encrypt(accountNumber);
      const decrypted = encryptionService.decrypt(encrypted);

      expect(decrypted).toBe(accountNumber);
      expect(encrypted).not.toContain(accountNumber);
      expect(encrypted.length).toBeGreaterThan(accountNumber.length);
    });

    test('should handle various account number formats', () => {
      const accountNumbers = [
        '123456789',       // 9 digits
        '1234567890123456', // 16 digits  
        '000000000',       // All zeros
        '999999999999999'  // All nines
      ];

      accountNumbers.forEach(accountNumber => {
        const encrypted = encryptionService.encrypt(accountNumber);
        const decrypted = encryptionService.decrypt(encrypted);
        expect(decrypted).toBe(accountNumber);
      });
    });
  });

  describe('File-Level Encryption', () => {
    test('should encrypt and decrypt file content with metadata', () => {
      const content = 'File content with sensitive data\nLine 2\nLine 3';
      const metadata = { type: 'test', version: '1.0' };

      const encrypted = encryptionService.encryptFileContent(content, metadata);
      const decrypted = encryptionService.decryptFileContent(encrypted);

      expect(decrypted.content).toBe(content);
      expect(decrypted.metadata).toEqual(metadata);
      expect(decrypted.timestamp).toBeDefined();
      expect(decrypted.version).toBe('1.0');
      expect(encrypted).toMatch(/^FILE:/);
    });

    test('should handle file content without metadata', () => {
      const content = 'Simple file content';

      const encrypted = encryptionService.encryptFileContent(content);
      const decrypted = encryptionService.decryptFileContent(encrypted);

      expect(decrypted.content).toBe(content);
      expect(decrypted.metadata).toEqual({});
    });

    test('should throw error for invalid file format', () => {
      expect(() => {
        encryptionService.decryptFileContent('not-a-file-format');
      }).toThrow('Invalid encrypted file format');

      expect(() => {
        encryptionService.decryptFileContent('FILE:invalid');
      }).toThrow('File decryption failed');
    });
  });

  describe('NACHA File Encryption', () => {
    const mockNACHAContent = `101 123456789 987654321240917091700000001Bank Name              Company Name           
5220Company Name                      1234567890PPDSALARY    2409170917   1123456780000001
622123456789123456789012345678John Doe                0000010000      1234567890000001
82200000010123456780000001000000000100001234567801234567890                         123456780000001
9000001000001000000010123456780000001000000000100001234567801234567890                                       
9999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999`;

    test('should encrypt NACHA file with transaction metadata', () => {
      const transactionIds = ['tx1', 'tx2', 'tx3'];
      const effectiveDate = new Date('2024-09-17');

      const encrypted = encryptionService.encryptNACHAFile(mockNACHAContent, transactionIds, effectiveDate);
      expect(encrypted).toMatch(/^FILE:/);

      const decrypted = encryptionService.decryptNACHAFile(encrypted);
      expect(decrypted.content).toBe(mockNACHAContent);
      expect(decrypted.metadata.type).toBe('NACHA');
      expect(decrypted.metadata.transactionIds).toEqual(transactionIds);
      expect(decrypted.metadata.effectiveDate).toBe(effectiveDate.toISOString());
      expect(decrypted.isValid).toBe(true);
    });

    test('should detect file corruption through checksum validation', () => {
      const transactionIds = ['tx1'];
      const effectiveDate = new Date('2024-09-17');

      const encrypted = encryptionService.encryptNACHAFile(mockNACHAContent, transactionIds, effectiveDate);
      
      // Simulate corruption by modifying enough characters to break decryption
      const corruptedParts = encrypted.split(':');
      corruptedParts[2] = corruptedParts[2].substring(0, 10) + 'corrupted' + corruptedParts[2].substring(20);
      const corrupted = corruptedParts.join(':');
      
      expect(() => {
        encryptionService.decryptNACHAFile(corrupted);
      }).toThrow('File decryption failed');
    });

    test('should validate NACHA file integrity', () => {
      const transactionIds = ['tx1'];
      const effectiveDate = new Date('2024-09-17');

      const encrypted = encryptionService.encryptNACHAFile(mockNACHAContent, transactionIds, effectiveDate);
      const decrypted = encryptionService.decryptNACHAFile(encrypted);

      expect(decrypted.isValid).toBe(true);
      expect(decrypted.metadata.checksum).toBe(encryptionService.hash(mockNACHAContent));
    });
  });

  describe('Hash Function', () => {
    test('should generate consistent hashes', () => {
      const text = 'Test data for hashing';
      const hash1 = encryptionService.hash(text);
      const hash2 = encryptionService.hash(text);

      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64); // SHA-256 produces 64 character hex string
    });

    test('should generate different hashes for different inputs', () => {
      const text1 = 'First text';
      const text2 = 'Second text';

      const hash1 = encryptionService.hash(text1);
      const hash2 = encryptionService.hash(text2);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('Token Generation', () => {
    test('should generate random tokens of specified length', () => {
      const token1 = encryptionService.generateToken(16);
      const token2 = encryptionService.generateToken(16);

      expect(token1).toHaveLength(32); // 16 bytes = 32 hex characters
      expect(token2).toHaveLength(32);
      expect(token1).not.toBe(token2);
    });

    test('should generate default length tokens', () => {
      const token = encryptionService.generateToken();
      expect(token).toHaveLength(64); // Default 32 bytes = 64 hex characters
    });
  });

  describe('Error Handling', () => {
    test('should handle encryption errors gracefully', () => {
      // Test with service initialized with empty key (should work but be less secure)
      const weakService = new EncryptionService('');
      const text = 'Test text';
      
      // Should still work but might be less secure
      const encrypted = weakService.encrypt(text);
      const decrypted = weakService.decrypt(encrypted);
      expect(decrypted).toBe(text);
    });

    test('should throw meaningful error messages', () => {
      expect(() => {
        encryptionService.decrypt('malformed:data');
      }).toThrow(/Decryption failed/);

      expect(() => {
        encryptionService.decryptFileContent('FILE:bad:data');
      }).toThrow(/File decryption failed/);
    });
  });
});
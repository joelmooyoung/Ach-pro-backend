"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const nachaService_1 = require("../../services/nachaService");
const encryptionService_1 = require("../../services/encryptionService");
const types_1 = require("../../types");
describe('NACHAService - Compliance Validation', () => {
    let nachaService;
    let encryptionService;
    const mockConfig = {
        immediateDestination: '123456789',
        immediateOrigin: '987654321',
        companyName: 'TEST COMPANY',
        companyId: '1234567890',
        originatingDFI: '987654321'
    };
    const mockTransaction = {
        id: 'tx-123',
        drRoutingNumber: '123456789',
        drAccountNumber: '1234567890',
        drId: 'DR001',
        drName: 'John Doe',
        crRoutingNumber: '987654321',
        crAccountNumber: '0987654321',
        crId: 'CR001',
        crName: 'Jane Smith',
        amount: 100.00,
        effectiveDate: new Date('2024-09-17'),
        createdAt: new Date(),
        updatedAt: new Date(),
        status: types_1.TransactionStatus.PENDING
    };
    beforeEach(() => {
        encryptionService = new encryptionService_1.EncryptionService('test-key-for-nacha-testing-12345678');
        nachaService = new nachaService_1.NACHAService(mockConfig, encryptionService);
    });
    describe('NACHA File Format Compliance', () => {
        test('should generate valid NACHA file format', () => {
            const nachaFile = nachaService.generateNACHAFile([mockTransaction], new Date('2024-09-17'), 'DR', false);
            const lines = nachaFile.content.split('\n');
            // Should have minimum required records
            expect(lines.length).toBeGreaterThanOrEqual(4);
            // First line should be File Header (Type 1)
            expect(lines[0]).toMatch(/^1/);
            expect(lines[0]).toHaveLength(94);
            // Second line should be Batch Header (Type 5)  
            expect(lines[1]).toMatch(/^5/);
            expect(lines[1]).toHaveLength(94);
            // Should have Entry Detail records (Type 6)
            const entryRecords = lines.filter(line => line.startsWith('6'));
            expect(entryRecords.length).toBeGreaterThan(0);
            entryRecords.forEach(record => {
                expect(record).toHaveLength(94);
            });
            // Should have Batch Control Record (Type 8)
            const batchControl = lines.find(line => line.startsWith('8'));
            expect(batchControl).toBeDefined();
            expect(batchControl).toHaveLength(94);
            // Should have File Control Record (Type 9)
            const fileControl = lines.find(line => line.startsWith('9'));
            expect(fileControl).toBeDefined();
            expect(fileControl).toHaveLength(94);
        });
        test('should validate record lengths are exactly 94 characters', () => {
            const nachaFile = nachaService.generateNACHAFile([mockTransaction], new Date('2024-09-17'), 'DR', false);
            const lines = nachaFile.content.split('\n');
            lines.forEach((line, index) => {
                if (line.trim().length > 0) { // Skip empty lines
                    expect(line).toHaveLength(94);
                }
            });
        });
        test('should pad to multiple of 10 records with blocking records', () => {
            const nachaFile = nachaService.generateNACHAFile([mockTransaction], new Date('2024-09-17'), 'DR', false);
            const lines = nachaFile.content.split('\n').filter(line => line.trim().length > 0);
            // Total records should be multiple of 10
            expect(lines.length % 10).toBe(0);
            // Blocking records should be all 9s
            const blockingRecords = lines.filter(line => line.startsWith('9'.repeat(94)));
            if (lines.length > 10) {
                expect(blockingRecords.length).toBeGreaterThan(0);
            }
        });
        test('should generate valid file header record', () => {
            const nachaFile = nachaService.generateNACHAFile([mockTransaction], new Date('2024-09-17'), 'DR', false);
            const lines = nachaFile.content.split('\n');
            const fileHeader = lines[0];
            expect(fileHeader.substring(0, 1)).toBe('1'); // Record Type
            expect(fileHeader.substring(1, 3)).toBe('01'); // Priority Code
            expect(fileHeader.substring(3, 13)).toContain('123456789'); // Immediate Destination (with padding)
            expect(fileHeader.substring(13, 23)).toContain('987654321'); // Immediate Origin (with padding)
            expect(fileHeader.substring(23, 29)).toMatch(/\d{6}/); // File Creation Date (YYMMDD)
            expect(fileHeader.substring(29, 33)).toMatch(/\d{4}/); // File Creation Time (HHMM)
            expect(fileHeader).toHaveLength(94); // Exactly 94 characters
        });
        test('should generate valid batch header record', () => {
            const nachaFile = nachaService.generateNACHAFile([mockTransaction], new Date('2024-09-17'), 'DR', false);
            const lines = nachaFile.content.split('\n');
            const batchHeader = lines[1];
            expect(batchHeader.substring(0, 1)).toBe('5'); // Record Type
            expect(batchHeader.substring(1, 4)).toMatch(/22[0-9]/); // Service Class Code (220s for ACH)
            expect(batchHeader.substring(4, 20)).toContain('TEST COMPANY'); // Company Name
            expect(batchHeader.substring(40, 50)).toBe('1234567890'); // Company ID
            expect(batchHeader.substring(50, 53)).toMatch(/[A-Z]{3}/); // Standard Entry Class (CCD, PPD, etc.)
            expect(batchHeader.substring(68, 74)).toMatch(/.*\d+.*/); // Effective Entry Date (contains digits)
            expect(batchHeader).toHaveLength(94); // Exactly 94 characters
        });
        test('should generate valid entry detail records', () => {
            const nachaFile = nachaService.generateNACHAFile([mockTransaction], new Date('2024-09-17'), 'DR', false);
            const lines = nachaFile.content.split('\n');
            const entryRecords = lines.filter(line => line.startsWith('6'));
            expect(entryRecords.length).toBe(1);
            const entryRecord = entryRecords[0];
            expect(entryRecord.substring(0, 1)).toBe('6'); // Record Type
            expect(entryRecord.substring(1, 3)).toMatch(/2[0-9]/); // Transaction Code (20s for ACH)
            expect(entryRecord.substring(3, 12)).toMatch(/\d{9}/); // Receiving DFI Routing Number
            expect(entryRecord.substring(12, 13)).toMatch(/[\d\s]/); // Check Digit (digit or space)
            expect(entryRecord.substring(13, 30)).toMatch(/.*\d+.*/); // Account Number (with padding)
            expect(entryRecord.substring(30, 40)).toContain('10000'); // Amount (100.00 in cents, padded)
            expect(entryRecord.substring(54, 76)).toMatch(/.*[A-Za-z]+.*/); // Individual Name (with padding)
            expect(entryRecord).toHaveLength(94); // Exactly 94 characters
        });
        test('should calculate correct batch control totals', () => {
            const transactions = [
                { ...mockTransaction, amount: 100.00 },
                { ...mockTransaction, id: 'tx-124', amount: 250.50 },
                { ...mockTransaction, id: 'tx-125', amount: 75.25 }
            ];
            const nachaFile = nachaService.generateNACHAFile(transactions, new Date('2024-09-17'), 'DR', false);
            const lines = nachaFile.content.split('\n');
            const batchControl = lines.find(line => line.startsWith('8'));
            expect(batchControl).toBeDefined();
            // Entry/Addenda Count should be 3
            const entryCount = batchControl.substring(4, 10);
            expect(entryCount).toBe('000003');
            // Total debits should be sum of all amounts
            const totalAmount = batchControl.substring(20, 32);
            const expectedTotal = (100.00 + 250.50 + 75.25) * 100; // Convert to cents
            expect(parseInt(totalAmount)).toBe(expectedTotal);
        });
    });
    describe('Business Day Compliance', () => {
        test('should handle weekend effective dates', () => {
            // Saturday date
            const weekendDate = new Date('2024-09-14'); // Assuming this is a Saturday
            const nachaFile = nachaService.generateNACHAFile([mockTransaction], weekendDate, 'DR', false);
            // Should still generate file but effective date in content should be valid
            expect(nachaFile.effectiveDate).toEqual(weekendDate);
            expect(nachaFile.content).toBeDefined();
        });
        test('should handle holiday effective dates', () => {
            // Christmas Day 2024
            const holidayDate = new Date('2024-12-25');
            const nachaFile = nachaService.generateNACHAFile([mockTransaction], holidayDate, 'DR', false);
            expect(nachaFile.effectiveDate).toEqual(holidayDate);
            expect(nachaFile.content).toBeDefined();
        });
    });
    describe('File Validation', () => {
        test('should validate correct NACHA file format', () => {
            const nachaFile = nachaService.generateNACHAFile([mockTransaction], new Date('2024-09-17'), 'DR', false);
            const validation = nachaService.validateNACHAFile(nachaFile.content);
            expect(validation.isValid).toBe(true);
            expect(validation.errors).toHaveLength(0);
        });
        test('should detect invalid file format', () => {
            const invalidContent = 'This is not a valid NACHA file';
            const validation = nachaService.validateNACHAFile(invalidContent);
            expect(validation.isValid).toBe(false);
            expect(validation.errors.length).toBeGreaterThan(0);
            expect(validation.errors).toContain('File must have at least 4 records (header, batch header, batch control, file control)');
        });
        test('should detect incorrect record types', () => {
            const invalidContent = `2InvalidHeader\n5BatchHeader\n6EntryRecord\n8BatchControl\n9FileControl`;
            const validation = nachaService.validateNACHAFile(invalidContent);
            expect(validation.isValid).toBe(false);
            expect(validation.errors).toContain('First record must be File Header (type 1)');
        });
        test('should detect incorrect record lengths', () => {
            const shortRecord = '1' + '0'.repeat(50); // Only 51 characters instead of 94
            const invalidContent = `${shortRecord}\n${'5' + '0'.repeat(93)}\n${'8' + '0'.repeat(93)}\n${'9' + '0'.repeat(93)}`;
            const validation = nachaService.validateNACHAFile(invalidContent);
            expect(validation.isValid).toBe(false);
            expect(validation.errors.some(error => error.includes('must be exactly 94 characters'))).toBe(true);
        });
    });
    describe('Encrypted File Validation', () => {
        test('should validate encrypted NACHA files', () => {
            const nachaFile = nachaService.generateSecureNACHAFile([mockTransaction], new Date('2024-09-17'), 'DR');
            expect(nachaFile.encrypted).toBe(true);
            expect(nachaFile.content).toMatch(/^FILE:/);
            const validation = nachaService.validateNACHAFileComplete(nachaFile.content);
            expect(validation.isValid).toBe(true);
            expect(validation.isEncrypted).toBe(true);
            expect(validation.integrityValid).toBe(true);
            expect(validation.metadata).toBeDefined();
            expect(validation.metadata.type).toBe('NACHA');
        });
        test('should detect corrupted encrypted files', () => {
            const nachaFile = nachaService.generateSecureNACHAFile([mockTransaction], new Date('2024-09-17'), 'DR');
            // Corrupt the encrypted content
            const corruptedContent = nachaFile.content.slice(0, -5) + 'XXXXX';
            const validation = nachaService.validateNACHAFileComplete(corruptedContent);
            expect(validation.isValid).toBe(false);
            expect(validation.isEncrypted).toBe(true);
            expect(validation.integrityValid).toBe(false);
        });
        test('should handle unencrypted files when encryption service is available', () => {
            const nachaFile = nachaService.generateNACHAFile([mockTransaction], new Date('2024-09-17'), 'DR', false);
            const validation = nachaService.validateNACHAFileComplete(nachaFile.content);
            expect(validation.isValid).toBe(true);
            expect(validation.isEncrypted).toBe(false);
            expect(validation.integrityValid).toBe(true);
        });
    });
    describe('Multiple Transaction Scenarios', () => {
        test('should handle multiple transactions correctly', () => {
            const transactions = Array.from({ length: 50 }, (_, i) => ({
                ...mockTransaction,
                id: `tx-${i}`,
                amount: (i + 1) * 10.50,
                drName: `Person ${i}`,
                crName: `Recipient ${i}`
            }));
            const nachaFile = nachaService.generateNACHAFile(transactions, new Date('2024-09-17'), 'DR', false);
            const validation = nachaService.validateNACHAFile(nachaFile.content);
            expect(validation.isValid).toBe(true);
            expect(nachaFile.transactionCount).toBe(50);
            const lines = nachaFile.content.split('\n').filter(line => line.trim().length > 0);
            const entryRecords = lines.filter(line => line.startsWith('6'));
            expect(entryRecords.length).toBe(50);
        });
        test('should handle large transaction amounts correctly', () => {
            const largeTransaction = { ...mockTransaction, amount: 999999.99 };
            const nachaFile = nachaService.generateNACHAFile([largeTransaction], new Date('2024-09-17'), 'DR', false);
            const validation = nachaService.validateNACHAFile(nachaFile.content);
            expect(validation.isValid).toBe(true);
            const lines = nachaFile.content.split('\n');
            const entryRecord = lines.find(line => line.startsWith('6'));
            expect(entryRecord).toBeDefined();
            // Amount should contain the large amount (999999.99 = 99999999 cents)
            const amountField = entryRecord.substring(30, 40);
            expect(amountField).toContain('99999999'); // Check if amount is present, allowing for padding
        });
        test('should handle zero-dollar transactions', () => {
            const zeroTransaction = { ...mockTransaction, amount: 0.00 };
            const nachaFile = nachaService.generateNACHAFile([zeroTransaction], new Date('2024-09-17'), 'DR', false);
            const validation = nachaService.validateNACHAFile(nachaFile.content);
            expect(validation.isValid).toBe(true);
            const lines = nachaFile.content.split('\n');
            const entryRecord = lines.find(line => line.startsWith('6'));
            expect(entryRecord).toBeDefined();
            const amountField = entryRecord.substring(30, 40);
            expect(amountField).toContain('000000000'); // Should contain zeros, allowing for padding
        });
    });
    describe('Credit vs Debit File Types', () => {
        test('should generate valid credit file', () => {
            const nachaFile = nachaService.generateNACHAFile([mockTransaction], new Date('2024-09-17'), 'CR', false);
            const validation = nachaService.validateNACHAFile(nachaFile.content);
            expect(validation.isValid).toBe(true);
            expect(nachaFile.filename).toContain('CR');
            const lines = nachaFile.content.split('\n');
            const batchHeader = lines[1];
            expect(batchHeader.substring(1, 4)).toBe('220'); // Service Class Code for credits
        });
        test('should generate valid debit file', () => {
            const nachaFile = nachaService.generateNACHAFile([mockTransaction], new Date('2024-09-17'), 'DR', false);
            const validation = nachaService.validateNACHAFile(nachaFile.content);
            expect(validation.isValid).toBe(true);
            expect(nachaFile.filename).toContain('DR');
            const lines = nachaFile.content.split('\n');
            const batchHeader = lines[1];
            expect(batchHeader.substring(1, 4)).toMatch(/22[0-9]/); // Service Class Code for ACH
        });
    });
    describe('Content Retrieval', () => {
        test('should retrieve plain content from encrypted files', () => {
            const nachaFile = nachaService.generateSecureNACHAFile([mockTransaction], new Date('2024-09-17'), 'DR');
            const plainContent = nachaService.getNACHAFileContent(nachaFile.content);
            const validation = nachaService.validateNACHAFile(plainContent);
            expect(validation.isValid).toBe(true);
            expect(plainContent).not.toMatch(/^FILE:/); // Should not be encrypted format
        });
        test('should return unencrypted content as-is', () => {
            const nachaFile = nachaService.generateNACHAFile([mockTransaction], new Date('2024-09-17'), 'DR', false);
            const content = nachaService.getNACHAFileContent(nachaFile.content);
            expect(content).toBe(nachaFile.content);
        });
    });
    describe('Error Handling', () => {
        test('should throw error when encryption service required but not available', () => {
            const serviceWithoutEncryption = new nachaService_1.NACHAService(mockConfig);
            expect(() => {
                serviceWithoutEncryption.generateSecureNACHAFile([mockTransaction], new Date('2024-09-17'), 'DR');
            }).toThrow('Encryption service is required for secure NACHA file generation');
        });
        test('should handle malformed configuration gracefully', () => {
            const badConfig = { ...mockConfig, companyName: '' };
            const serviceWithBadConfig = new nachaService_1.NACHAService(badConfig, encryptionService);
            // Should still generate file but might have issues in validation
            const nachaFile = serviceWithBadConfig.generateNACHAFile([mockTransaction], new Date('2024-09-17'), 'DR', false);
            expect(nachaFile).toBeDefined();
            expect(nachaFile.content).toBeDefined();
        });
    });
});
//# sourceMappingURL=nachaService.test.js.map
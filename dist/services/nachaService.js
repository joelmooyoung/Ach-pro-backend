"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NACHAService = void 0;
const moment_1 = __importDefault(require("moment"));
class NACHAService {
    constructor(config, encryptionService) {
        this.fileSequenceNumber = 1;
        this.config = config;
        this.encryptionService = encryptionService;
    }
    generateNACHAFile(transactions, effectiveDate, fileType = 'DR', encrypt = true) {
        const filename = this.generateFilename(effectiveDate, fileType);
        const content = this.generateFileContent(transactions, effectiveDate, fileType);
        const transactionIds = transactions.map(tx => tx.id);
        const finalContent = encrypt && this.encryptionService
            ? this.encryptionService.encryptNACHAFile(content, transactionIds, effectiveDate)
            : content;
        const totalAmount = transactions.reduce((sum, tx) => sum + tx.amount, 0);
        return {
            id: this.generateId(),
            organizationId: 'default-org',
            filename,
            content: finalContent,
            effectiveDate,
            transactionCount: transactions.length,
            totalAmount,
            totalRecords: transactions.length,
            totalDebits: fileType === 'DR' ? transactions.length : 0,
            totalCredits: fileType === 'CR' ? transactions.length : 0,
            status: 'generated',
            generatedAt: new Date(),
            transmittedAt: undefined,
            filePath: `/nacha/${filename}`,
            transactionIds,
            createdBy: 'system',
            createdAt: new Date(),
            transmitted: false,
            encrypted: encrypt && !!this.encryptionService
        };
    }
    generateNACHAFileFromEntries(entries, effectiveDate, fileType) {
        const filteredEntries = entries.filter(entry => entry.entryType === fileType);
        const filename = this.generateFilename(effectiveDate, fileType);
        const content = this.generateFileContentFromEntries(filteredEntries, effectiveDate, fileType);
        const totalAmount = filteredEntries.reduce((sum, entry) => sum + entry.amount, 0);
        return {
            id: this.generateId(),
            organizationId: 'default-org',
            filename,
            content,
            effectiveDate,
            transactionCount: filteredEntries.length,
            totalAmount,
            totalRecords: filteredEntries.length,
            totalDebits: fileType === 'DR' ? filteredEntries.length : 0,
            totalCredits: fileType === 'CR' ? filteredEntries.length : 0,
            status: 'generated',
            generatedAt: new Date(),
            transmittedAt: undefined,
            filePath: `/nacha/${filename}`,
            transactionIds: filteredEntries.map(entry => entry.id),
            createdBy: 'system',
            createdAt: new Date(),
            transmitted: false
        };
    }
    generateSecureNACHAFile(transactions, effectiveDate, fileType = 'DR') {
        if (!this.encryptionService) {
            throw new Error('Encryption service is required for secure NACHA file generation');
        }
        return this.generateNACHAFile(transactions, effectiveDate, fileType, true);
    }
    generateFileContent(transactions, effectiveDate, fileType) {
        const lines = [];
        lines.push(this.generateFileHeader(effectiveDate));
        lines.push(this.generateBatchHeader(effectiveDate, fileType));
        transactions.forEach(transaction => {
            lines.push(this.generateEntryDetail(transaction, fileType));
        });
        lines.push(this.generateBatchControl(transactions, fileType));
        lines.push(this.generateFileControl(transactions));
        const recordCount = lines.length;
        const paddingNeeded = 10 - (recordCount % 10);
        if (paddingNeeded !== 10) {
            for (let i = 0; i < paddingNeeded; i++) {
                lines.push('9'.repeat(94));
            }
        }
        return lines.join('\n');
    }
    generateFileContentFromEntries(entries, effectiveDate, fileType) {
        const lines = [];
        lines.push(this.generateFileHeader(effectiveDate));
        lines.push(this.generateBatchHeader(effectiveDate, fileType));
        entries.forEach(entry => {
            lines.push(this.generateEntryDetailFromEntry(entry));
        });
        lines.push(this.generateBatchControlFromEntries(entries, fileType));
        lines.push(this.generateFileControlFromEntries(entries));
        const recordCount = lines.length;
        const paddingNeeded = 10 - (recordCount % 10);
        if (paddingNeeded !== 10) {
            for (let i = 0; i < paddingNeeded; i++) {
                lines.push('9'.repeat(94));
            }
        }
        return lines.join('\n');
    }
    generateFileHeader(effectiveDate) {
        const creationDate = (0, moment_1.default)().format('YYMMDD');
        const creationTime = (0, moment_1.default)().format('HHmm');
        return [
            '1',
            '01',
            this.padLeft(this.config.immediateDestination, 10, ' '),
            this.padLeft(this.config.immediateOrigin, 10, ' '),
            creationDate,
            creationTime,
            this.padLeft(this.fileSequenceNumber.toString(), 1, 'A'),
            '094',
            '10',
            '1',
            this.padRight(this.config.immediateDestination, 23, ' '),
            this.padRight(this.config.immediateOrigin, 23, ' '),
            this.padRight('', 8, ' ')
        ].join('');
    }
    generateBatchHeader(effectiveDate, fileType) {
        const serviceClassCode = fileType === 'DR' ? '225' : '220';
        const effectiveDateStr = (0, moment_1.default)(effectiveDate).format('YYMMDD');
        return [
            '5',
            serviceClassCode,
            this.padRight(this.config.companyName, 16, ' '),
            this.padRight(this.config.companyDiscretionaryData || '', 20, ' '),
            this.config.companyId,
            'CCD',
            this.padRight(`${fileType} PAYMENT`, 10, ' '),
            this.padRight('', 6, ' '),
            effectiveDateStr,
            this.padRight('', 3, ' '),
            '1',
            this.config.originatingDFI.substring(0, 8),
            '0000001'
        ].join('');
    }
    generateEntryDetail(transaction, fileType) {
        const transactionCode = fileType === 'DR' ? '27' : '22';
        const routingNumber = fileType === 'DR' ? (transaction.drRoutingNumber || transaction.routingNumber) : (transaction.crRoutingNumber || transaction.routingNumber);
        const accountNumber = fileType === 'DR' ? (transaction.drAccountNumber || transaction.accountNumber) : (transaction.crAccountNumber || transaction.accountNumber);
        const individualName = fileType === 'DR' ? (transaction.drName || transaction.individualName) : (transaction.crName || transaction.individualName);
        const individualId = fileType === 'DR' ? (transaction.drId || transaction.individualId) : (transaction.crId || transaction.individualId);
        const amount = Math.round(transaction.amount * 100);
        return [
            '6',
            transactionCode,
            routingNumber.substring(0, 8),
            routingNumber.substring(8, 9),
            this.padLeft(accountNumber, 17, ' '),
            this.padLeft(amount.toString(), 10, '0'),
            this.padLeft(individualId, 15, ' '),
            this.padRight(individualName, 22, ' '),
            this.padRight('', 2, ' '),
            '0',
            this.padLeft((this.getTraceNumber()).toString(), 15, '0')
        ].join('');
    }
    generateEntryDetailFromEntry(entry) {
        const transactionCode = entry.entryType === 'DR' ? '27' : '22';
        const amount = Math.round(entry.amount * 100);
        return [
            '6',
            transactionCode,
            entry.routingNumber.substring(0, 8),
            entry.routingNumber.substring(8, 9),
            this.padLeft(entry.accountNumber, 17, ' '),
            this.padLeft(amount.toString(), 10, '0'),
            this.padLeft(entry.accountId, 15, ' '),
            this.padRight(entry.accountName, 22, ' '),
            this.padRight('', 2, ' '),
            '0',
            this.padLeft((this.getTraceNumber()).toString(), 15, '0')
        ].join('');
    }
    generateBatchControl(transactions, fileType) {
        const serviceClassCode = fileType === 'DR' ? '225' : '220';
        const entryCount = transactions.length;
        const totalAmount = transactions.reduce((sum, tx) => sum + tx.amount, 0);
        const totalAmountCents = Math.round(totalAmount * 100);
        const entryHash = transactions.reduce((sum, tx) => {
            const routingNumber = fileType === 'DR' ? (tx.drRoutingNumber || tx.routingNumber) : (tx.crRoutingNumber || tx.routingNumber);
            return sum + parseInt(routingNumber.substring(0, 8));
        }, 0);
        return [
            '8',
            serviceClassCode,
            this.padLeft(entryCount.toString(), 6, '0'),
            this.padLeft((entryHash % 10000000000).toString(), 10, '0'),
            this.padLeft(totalAmountCents.toString(), 12, '0'),
            this.padLeft('0', 12, '0'),
            this.config.companyId,
            this.padRight('', 19, ' '),
            this.padRight('', 6, ' '),
            this.config.originatingDFI.substring(0, 8),
            '0000001'
        ].join('');
    }
    generateBatchControlFromEntries(entries, fileType) {
        const serviceClassCode = fileType === 'DR' ? '225' : '220';
        const entryCount = entries.length;
        const totalAmount = entries.reduce((sum, entry) => sum + entry.amount, 0);
        const totalAmountCents = Math.round(totalAmount * 100);
        const entryHash = entries.reduce((sum, entry) => {
            return sum + parseInt(entry.routingNumber.substring(0, 8));
        }, 0);
        return [
            '8',
            serviceClassCode,
            this.padLeft(entryCount.toString(), 6, '0'),
            this.padLeft((entryHash % 10000000000).toString(), 10, '0'),
            this.padLeft(totalAmountCents.toString(), 12, '0'),
            this.padLeft('0', 12, '0'),
            this.config.companyId,
            this.padRight('', 19, ' '),
            this.padRight('', 6, ' '),
            this.config.originatingDFI.substring(0, 8),
            '0000001'
        ].join('');
    }
    generateFileControl(transactions) {
        const batchCount = 1;
        const blockCount = Math.ceil((5 + transactions.length) / 10);
        const entryCount = transactions.length;
        const totalAmount = transactions.reduce((sum, tx) => sum + tx.amount, 0);
        const totalAmountCents = Math.round(totalAmount * 100);
        const entryHash = transactions.reduce((sum, tx) => {
            const drHash = parseInt((tx.drRoutingNumber || tx.routingNumber).substring(0, 8));
            const crHash = parseInt((tx.crRoutingNumber || tx.routingNumber).substring(0, 8));
            return sum + drHash + crHash;
        }, 0);
        return [
            '9',
            this.padLeft(batchCount.toString(), 6, '0'),
            this.padLeft(blockCount.toString(), 6, '0'),
            this.padLeft(entryCount.toString(), 8, '0'),
            this.padLeft((entryHash % 10000000000).toString(), 10, '0'),
            this.padLeft(totalAmountCents.toString(), 12, '0'),
            this.padLeft(totalAmountCents.toString(), 12, '0'),
            this.padRight('', 39, ' ')
        ].join('');
    }
    generateFileControlFromEntries(entries) {
        const batchCount = 1;
        const blockCount = Math.ceil((5 + entries.length) / 10);
        const entryCount = entries.length;
        const totalAmount = entries.reduce((sum, entry) => sum + entry.amount, 0);
        const totalAmountCents = Math.round(totalAmount * 100);
        const entryHash = entries.reduce((sum, entry) => {
            return sum + parseInt(entry.routingNumber.substring(0, 8));
        }, 0);
        return [
            '9',
            this.padLeft(batchCount.toString(), 6, '0'),
            this.padLeft(blockCount.toString(), 6, '0'),
            this.padLeft(entryCount.toString(), 8, '0'),
            this.padLeft((entryHash % 10000000000).toString(), 10, '0'),
            this.padLeft(totalAmountCents.toString(), 12, '0'),
            this.padLeft(totalAmountCents.toString(), 12, '0'),
            this.padRight('', 39, ' ')
        ].join('');
    }
    generateFilename(effectiveDate, fileType) {
        const dateStr = (0, moment_1.default)(effectiveDate).format('YYYYMMDD');
        const timeStr = (0, moment_1.default)().format('HHmmss');
        return `ACH_${fileType}_${dateStr}_${timeStr}.txt`;
    }
    generateId() {
        return `nacha_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    getTraceNumber() {
        return parseInt(this.config.originatingDFI.substring(0, 8)) * 10000000 +
            Math.floor(Math.random() * 10000000);
    }
    padLeft(str, length, padChar) {
        return str.padStart(length, padChar).substring(0, length);
    }
    padRight(str, length, padChar) {
        return str.padEnd(length, padChar).substring(0, length);
    }
    decryptNACHAFile(encryptedContent) {
        if (!this.encryptionService) {
            throw new Error('Encryption service is required for NACHA file decryption');
        }
        return this.encryptionService.decryptNACHAFile(encryptedContent);
    }
    getNACHAFileContent(content) {
        if (content.startsWith('FILE:') && this.encryptionService) {
            const decrypted = this.decryptNACHAFile(content);
            return decrypted.content;
        }
        return content;
    }
    validateNACHAFileComplete(content) {
        let actualContent = content;
        let isEncrypted = false;
        let metadata = {};
        let integrityValid = true;
        if (content.startsWith('FILE:')) {
            isEncrypted = true;
            if (!this.encryptionService) {
                return {
                    isValid: false,
                    errors: ['Encrypted file detected but no encryption service available'],
                    isEncrypted: true
                };
            }
            try {
                const decrypted = this.decryptNACHAFile(content);
                actualContent = decrypted.content;
                metadata = decrypted.metadata;
                integrityValid = decrypted.isValid;
                if (!integrityValid) {
                    return {
                        isValid: false,
                        errors: ['File integrity check failed - content may be corrupted'],
                        isEncrypted: true,
                        metadata,
                        integrityValid: false
                    };
                }
            }
            catch (error) {
                return {
                    isValid: false,
                    errors: [`Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
                    isEncrypted: true,
                    integrityValid: false
                };
            }
        }
        const validation = this.validateNACHAFile(actualContent);
        return {
            ...validation,
            isEncrypted,
            metadata,
            integrityValid
        };
    }
    validateNACHAFile(content) {
        const errors = [];
        const lines = content.split('\n');
        if (lines.length < 4) {
            errors.push('File must have at least 4 records (header, batch header, batch control, file control)');
        }
        if (lines.length > 0 && !lines[0].startsWith('1')) {
            errors.push('First record must be File Header (type 1)');
        }
        if (lines.length > 1 && !lines[1].startsWith('5')) {
            errors.push('Second record must be Batch Header (type 5)');
        }
        lines.forEach((line, index) => {
            if (line.length !== 94 && index < lines.length - 1) {
                errors.push(`Line ${index + 1} must be exactly 94 characters`);
            }
        });
        return {
            isValid: errors.length === 0,
            errors
        };
    }
    incrementSequenceNumber() {
        this.fileSequenceNumber++;
        if (this.fileSequenceNumber > 9) {
            this.fileSequenceNumber = 1;
        }
    }
}
exports.NACHAService = NACHAService;
//# sourceMappingURL=nachaService.js.map
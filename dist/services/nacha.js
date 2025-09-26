"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NACHAService = void 0;
const moment_1 = __importDefault(require("moment"));
const businessDay_1 = require("../utils/businessDay");
class NACHAService {
    static async generateNACHAFile(transactions, effectiveDate, companyInfo) {
        await businessDay_1.BusinessDayService.refreshHolidaysIfNeeded();
        const adjustedEffectiveDate = businessDay_1.BusinessDayService.isBusinessDay(effectiveDate)
            ? effectiveDate
            : businessDay_1.BusinessDayService.getNextBusinessDay(effectiveDate);
        const effectiveDateStr = (0, moment_1.default)(adjustedEffectiveDate).format('YYYY-MM-DD');
        const filteredTransactions = transactions.filter(t => (0, moment_1.default)(t.effectiveDate).format('YYYY-MM-DD') === effectiveDateStr);
        if (filteredTransactions.length === 0) {
            throw new Error('No transactions found for the specified effective date');
        }
        const totalDebits = filteredTransactions
            .filter(t => t.transactionType === 'debit')
            .reduce((sum, t) => sum + t.amount, 0);
        const totalCredits = filteredTransactions
            .filter(t => t.transactionType === 'credit')
            .reduce((sum, t) => sum + t.amount, 0);
        const fileContent = this.buildNACHAFileContent(filteredTransactions, adjustedEffectiveDate, companyInfo);
        const filename = `ACH_${(0, moment_1.default)(adjustedEffectiveDate).format('YYYYMMDD')}_${Date.now()}.txt`;
        const metadata = {
            filename,
            effectiveDate: adjustedEffectiveDate,
            totalRecords: filteredTransactions.length,
            totalDebits,
            totalCredits,
            status: 'generated',
            generatedAt: new Date(),
            transactionIds: filteredTransactions.map(t => t.id)
        };
        return { content: fileContent, filename, metadata };
    }
    static buildNACHAFileContent(transactions, effectiveDate, companyInfo) {
        const lines = [];
        lines.push(this.buildFileHeader(effectiveDate, companyInfo));
        lines.push(this.buildBatchHeader(effectiveDate, companyInfo));
        transactions.forEach(transaction => {
            lines.push(this.buildEntryDetail(transaction));
        });
        lines.push(this.buildBatchControl(transactions, companyInfo));
        lines.push(this.buildFileControl(transactions));
        while (lines.length % 10 !== 0) {
            lines.push('9'.repeat(this.RECORD_LENGTH));
        }
        return lines.join('\n');
    }
    static buildFileHeader(effectiveDate, companyInfo) {
        const now = new Date();
        const fileCreationDate = (0, moment_1.default)(now).format('YYMMDD');
        const fileCreationTime = (0, moment_1.default)(now).format('HHmm');
        const fileIdModifier = 'A';
        return [
            '1',
            '01',
            ' ' + companyInfo.routingNumber.padEnd(9),
            companyInfo.id.padEnd(10),
            fileCreationDate,
            fileCreationTime,
            fileIdModifier,
            '094',
            '10',
            '1',
            companyInfo.name.padEnd(23),
            companyInfo.name.padEnd(23),
            ' '.repeat(8)
        ].join('').substring(0, this.RECORD_LENGTH);
    }
    static buildBatchHeader(effectiveDate, companyInfo) {
        const serviceClassCode = '200';
        const batchNumber = '0000001';
        const effectiveDateStr = (0, moment_1.default)(effectiveDate).format('YYMMDD');
        return [
            '5',
            serviceClassCode,
            companyInfo.name.padEnd(16),
            ' '.repeat(20),
            companyInfo.id.padEnd(10),
            'PPD',
            companyInfo.description.padEnd(10),
            ' '.repeat(6),
            effectiveDateStr,
            ' '.repeat(3),
            '1',
            companyInfo.routingNumber.substring(0, 8),
            batchNumber
        ].join('').substring(0, this.RECORD_LENGTH);
    }
    static buildEntryDetail(transaction) {
        const transactionCode = transaction.transactionType === 'debit' ?
            (transaction.accountType === 'checking' ? '27' : '37') :
            (transaction.accountType === 'checking' ? '22' : '32');
        const receivingDFI = transaction.routingNumber.substring(0, 8);
        const checkDigit = transaction.routingNumber.substring(8, 9);
        const dfiAccountNumber = transaction.accountNumber.padEnd(17);
        const amount = Math.round(transaction.amount * 100).toString().padStart(10, '0');
        const individualName = transaction.individualName.padEnd(22);
        const traceNumber = receivingDFI + '0000001';
        return [
            '6',
            transactionCode,
            receivingDFI,
            checkDigit,
            dfiAccountNumber,
            amount,
            transaction.individualId.padEnd(15),
            individualName,
            '  ',
            '0',
            traceNumber
        ].join('').substring(0, this.RECORD_LENGTH);
    }
    static buildBatchControl(transactions, companyInfo) {
        const serviceClassCode = '200';
        const entryAddendaCount = transactions.length.toString().padStart(6, '0');
        const entryHash = this.calculateEntryHash(transactions);
        const totalDebits = transactions
            .filter(t => t.transactionType === 'debit')
            .reduce((sum, t) => sum + t.amount, 0);
        const totalCredits = transactions
            .filter(t => t.transactionType === 'credit')
            .reduce((sum, t) => sum + t.amount, 0);
        const totalDebitAmount = Math.round(totalDebits * 100).toString().padStart(12, '0');
        const totalCreditAmount = Math.round(totalCredits * 100).toString().padStart(12, '0');
        return [
            '8',
            serviceClassCode,
            entryAddendaCount,
            entryHash,
            totalDebitAmount,
            totalCreditAmount,
            companyInfo.id.padEnd(10),
            ' '.repeat(19),
            ' '.repeat(6),
            companyInfo.routingNumber.substring(0, 8),
            '0000001'
        ].join('').substring(0, this.RECORD_LENGTH);
    }
    static buildFileControl(transactions) {
        const batchCount = '000001';
        const blockCount = Math.ceil((transactions.length + 4) / 10).toString().padStart(6, '0');
        const entryAddendaCount = transactions.length.toString().padStart(8, '0');
        const entryHash = this.calculateEntryHash(transactions);
        const totalDebits = transactions
            .filter(t => t.transactionType === 'debit')
            .reduce((sum, t) => sum + t.amount, 0);
        const totalCredits = transactions
            .filter(t => t.transactionType === 'credit')
            .reduce((sum, t) => sum + t.amount, 0);
        const totalDebitAmount = Math.round(totalDebits * 100).toString().padStart(12, '0');
        const totalCreditAmount = Math.round(totalCredits * 100).toString().padStart(12, '0');
        return [
            '9',
            batchCount,
            blockCount,
            entryAddendaCount,
            entryHash,
            totalDebitAmount,
            totalCreditAmount,
            ' '.repeat(39)
        ].join('').substring(0, this.RECORD_LENGTH);
    }
    static calculateEntryHash(transactions) {
        const hash = transactions.reduce((sum, transaction) => {
            const routingNumber = parseInt(transaction.routingNumber.substring(0, 8));
            return sum + routingNumber;
        }, 0);
        return (hash % 10000000000).toString().padStart(10, '0');
    }
    static validateNACHAFile(content) {
        const errors = [];
        const lines = content.split('\n');
        if (lines.length % 10 !== 0) {
            errors.push('File must contain a multiple of 10 records');
        }
        lines.forEach((line, index) => {
            if (line.length !== this.RECORD_LENGTH) {
                errors.push(`Line ${index + 1}: Invalid record length (${line.length}, expected ${this.RECORD_LENGTH})`);
            }
        });
        if (!lines[0] || lines[0].charAt(0) !== '1') {
            errors.push('Missing or invalid file header record');
        }
        if (!lines[1] || lines[1].charAt(0) !== '5') {
            errors.push('Missing or invalid batch header record');
        }
        return {
            isValid: errors.length === 0,
            errors
        };
    }
}
exports.NACHAService = NACHAService;
NACHAService.RECORD_LENGTH = 94;
//# sourceMappingURL=nacha.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransactionEntryService = void 0;
const uuid_1 = require("uuid");
const types_1 = require("../types");
class TransactionEntryService {
    constructor(databaseService, encryptionService, businessDayService) {
        this.databaseService = databaseService;
        this.encryptionService = encryptionService;
        this.businessDayService = businessDayService;
    }
    async createSeparateTransaction(request, senderIp) {
        const parentTransactionId = (0, uuid_1.v4)();
        const drEffectiveDate = this.businessDayService.getACHEffectiveDate(request.drEffectiveDate);
        const crEffectiveDate = this.businessDayService.getACHEffectiveDate(request.crEffectiveDate);
        const debitEntry = {
            id: (0, uuid_1.v4)(),
            parentTransactionId,
            entryType: 'DR',
            routingNumber: request.drRoutingNumber,
            accountNumber: request.drAccountNumber,
            accountId: request.drId,
            accountName: request.drName,
            amount: request.amount,
            effectiveDate: drEffectiveDate,
            senderIp,
            senderDetails: request.senderDetails,
            createdAt: new Date(),
            updatedAt: new Date(),
            status: types_1.TransactionStatus.PENDING
        };
        const creditEntry = {
            id: (0, uuid_1.v4)(),
            parentTransactionId,
            entryType: 'CR',
            routingNumber: request.crRoutingNumber,
            accountNumber: request.crAccountNumber,
            accountId: request.crId,
            accountName: request.crName,
            amount: request.amount,
            effectiveDate: crEffectiveDate,
            senderIp,
            senderDetails: request.senderDetails,
            createdAt: new Date(),
            updatedAt: new Date(),
            status: types_1.TransactionStatus.PENDING
        };
        const { accountNumber: drAccountNumber, ...debitEntryRest } = debitEntry;
        const encryptedDebitEntry = {
            ...debitEntryRest,
            accountNumberEncrypted: this.encryptionService.encrypt(drAccountNumber)
        };
        const { accountNumber: crAccountNumber, ...creditEntryRest } = creditEntry;
        const encryptedCreditEntry = {
            ...creditEntryRest,
            accountNumberEncrypted: this.encryptionService.encrypt(crAccountNumber)
        };
        const savedDebitEntry = await this.databaseService.createTransactionEntry(encryptedDebitEntry);
        const savedCreditEntry = await this.databaseService.createTransactionEntry(encryptedCreditEntry);
        const transactionGroup = await this.databaseService.createTransactionGroup({
            drEntryId: savedDebitEntry.id,
            crEntryId: savedCreditEntry.id,
            senderIp,
            senderDetails: request.senderDetails
        });
        return transactionGroup;
    }
    async createTransactionFromLegacy(drRoutingNumber, drAccountNumber, drId, drName, crRoutingNumber, crAccountNumber, crId, crName, amount, effectiveDate, senderIp, senderDetails) {
        const request = {
            drRoutingNumber,
            drAccountNumber,
            drId,
            drName,
            drEffectiveDate: effectiveDate,
            crRoutingNumber,
            crAccountNumber,
            crId,
            crName,
            crEffectiveDate: effectiveDate,
            amount,
            senderDetails
        };
        return this.createSeparateTransaction(request, senderIp);
    }
    async getTransactionEntriesForNACHA(effectiveDate, entryType) {
        const result = await this.databaseService.getTransactionEntries(1, 1000, {
            effectiveDate,
            entryType,
            status: types_1.TransactionStatus.PENDING
        });
        if (!result.data) {
            return [];
        }
        const decryptedEntries = result.data.map(entry => {
            const accountNumber = this.encryptionService.decrypt(entry.accountNumberEncrypted);
            return {
                ...entry,
                accountNumber
            };
        });
        return decryptedEntries;
    }
    async updateTransactionEntryStatus(id, status) {
        await this.databaseService.updateTransactionEntryStatus(id, status);
    }
    async getTransactionEntriesForDisplay(page = 1, limit = 50, filters) {
        const result = await this.databaseService.getTransactionEntries(page, limit, filters);
        if (!result.data) {
            return result;
        }
        const entriesWithMaskedAccounts = result.data.map(entry => {
            try {
                const accountFull = this.encryptionService.decrypt(entry.accountNumberEncrypted);
                return {
                    ...entry,
                    accountNumber: '****' + accountFull.slice(-4),
                    accountNumberEncrypted: undefined
                };
            }
            catch (decryptError) {
                console.error('Decryption error for transaction entry', entry.id, decryptError);
                return {
                    ...entry,
                    accountNumber: '****ERROR',
                    accountNumberEncrypted: undefined
                };
            }
        });
        return {
            ...result,
            data: entriesWithMaskedAccounts
        };
    }
}
exports.TransactionEntryService = TransactionEntryService;
//# sourceMappingURL=transactionEntryService.js.map
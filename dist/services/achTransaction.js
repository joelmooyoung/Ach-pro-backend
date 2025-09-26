"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ACHTransactionService = void 0;
const uuid_1 = require("uuid");
const supabase_1 = require("../utils/supabase");
const encryption_1 = require("../utils/encryption");
const nacha_1 = require("./nacha");
const logger_1 = require("../utils/logger");
class ACHTransactionService {
    static async createTransaction(data) {
        try {
            const encryptedAccountNumber = encryption_1.EncryptionService.encrypt(data.accountNumber);
            const transactionData = {
                id: (0, uuid_1.v4)(),
                transaction_id: data.transactionId,
                routing_number: data.routingNumber,
                account_number_encrypted: encryptedAccountNumber,
                account_number_hash: encryption_1.EncryptionService.hashSensitiveData(data.accountNumber),
                account_type: data.accountType,
                transaction_type: data.transactionType,
                amount: data.amount,
                effective_date: data.effectiveDate.toISOString(),
                description: data.description,
                individual_id: data.individualId,
                individual_name: data.individualName,
                company_name: data.companyName,
                company_id: data.companyId,
                sender_ip: data.senderIp,
                timestamp: new Date().toISOString(),
                status: 'pending',
                created_by: data.createdBy,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };
            const { data: transaction, error } = await supabase_1.supabase
                .from('ach_transactions')
                .insert(transactionData)
                .select()
                .single();
            if (error)
                throw error;
            return this.mapDatabaseToTransaction(transaction);
        }
        catch (error) {
            logger_1.logger.error('Failed to create ACH transaction', error);
            throw error;
        }
    }
    static async getTransactions(filters) {
        try {
            const { page, limit, status, startDate, endDate } = filters;
            const offset = (page - 1) * limit;
            let query = supabase_1.supabase
                .from('ach_transactions')
                .select('*', { count: 'exact' });
            if (status) {
                query = query.eq('status', status);
            }
            if (startDate) {
                query = query.gte('created_at', startDate.toISOString());
            }
            if (endDate) {
                query = query.lte('created_at', endDate.toISOString());
            }
            const { data: transactions, error, count } = await query
                .order('created_at', { ascending: false })
                .range(offset, offset + limit - 1);
            if (error)
                throw error;
            const mappedTransactions = transactions.map(this.mapDatabaseToTransaction);
            return {
                success: true,
                data: mappedTransactions,
                pagination: {
                    page,
                    limit,
                    total: count || 0,
                    totalPages: Math.ceil((count || 0) / limit)
                }
            };
        }
        catch (error) {
            logger_1.logger.error('Failed to fetch ACH transactions', error);
            throw error;
        }
    }
    static async getTransactionById(id) {
        try {
            const { data: transaction, error } = await supabase_1.supabase
                .from('ach_transactions')
                .select('*')
                .eq('id', id)
                .single();
            if (error) {
                if (error.code === 'PGRST116')
                    return null;
                throw error;
            }
            return this.mapDatabaseToTransaction(transaction);
        }
        catch (error) {
            logger_1.logger.error('Failed to fetch ACH transaction', error);
            throw error;
        }
    }
    static async updateTransactionStatus(id, status, updatedBy) {
        try {
            const { data: transaction, error } = await supabase_1.supabase
                .from('ach_transactions')
                .update({
                status,
                updated_by: updatedBy,
                updated_at: new Date().toISOString(),
                ...(status === 'processed' && { processed_at: new Date().toISOString() })
            })
                .eq('id', id)
                .select()
                .single();
            if (error) {
                if (error.code === 'PGRST116')
                    return null;
                throw error;
            }
            return this.mapDatabaseToTransaction(transaction);
        }
        catch (error) {
            logger_1.logger.error('Failed to update ACH transaction status', error);
            throw error;
        }
    }
    static async generateNACHAFile(effectiveDate, createdBy) {
        try {
            const { data: transactions, error } = await supabase_1.supabase
                .from('ach_transactions')
                .select('*')
                .eq('status', 'pending')
                .eq('effective_date', effectiveDate.toISOString().split('T')[0]);
            if (error)
                throw error;
            if (transactions.length === 0) {
                throw new Error('No pending transactions found for the specified effective date');
            }
            const achTransactions = transactions.map(this.mapDatabaseToTransaction);
            const companyInfo = await this.getCompanyInfo();
            const { content, filename, metadata } = await nacha_1.NACHAService.generateNACHAFile(achTransactions, effectiveDate, companyInfo);
            const nachaFileData = {
                id: (0, uuid_1.v4)(),
                filename: metadata.filename,
                effective_date: metadata.effectiveDate?.toISOString(),
                total_records: metadata.totalRecords,
                total_debits: metadata.totalDebits,
                total_credits: metadata.totalCredits,
                status: metadata.status,
                generated_at: metadata.generatedAt?.toISOString(),
                file_content: content,
                transaction_ids: metadata.transactionIds,
                created_by: createdBy,
                created_at: new Date().toISOString()
            };
            const { data: nachaFile, error: fileError } = await supabase_1.supabase
                .from('nacha_files')
                .insert(nachaFileData)
                .select()
                .single();
            if (fileError)
                throw fileError;
            await supabase_1.supabase
                .from('ach_transactions')
                .update({
                status: 'processed',
                nacha_file_id: nachaFile.id,
                processed_at: new Date().toISOString(),
                updated_by: createdBy,
                updated_at: new Date().toISOString()
            })
                .in('id', metadata.transactionIds || []);
            return this.mapDatabaseToNACHAFile(nachaFile);
        }
        catch (error) {
            logger_1.logger.error('Failed to generate NACHA file', error);
            throw error;
        }
    }
    static async getNACHAFiles(options) {
        try {
            const { page, limit } = options;
            const offset = (page - 1) * limit;
            const { data: files, error, count } = await supabase_1.supabase
                .from('nacha_files')
                .select('*', { count: 'exact' })
                .order('generated_at', { ascending: false })
                .range(offset, offset + limit - 1);
            if (error)
                throw error;
            const mappedFiles = files.map(this.mapDatabaseToNACHAFile);
            return {
                success: true,
                data: mappedFiles,
                pagination: {
                    page,
                    limit,
                    total: count || 0,
                    totalPages: Math.ceil((count || 0) / limit)
                }
            };
        }
        catch (error) {
            logger_1.logger.error('Failed to fetch NACHA files', error);
            throw error;
        }
    }
    static async getNACHAFileContent(id) {
        try {
            const { data: file, error } = await supabase_1.supabase
                .from('nacha_files')
                .select('filename, file_content')
                .eq('id', id)
                .single();
            if (error) {
                if (error.code === 'PGRST116')
                    return null;
                throw error;
            }
            return {
                filename: file.filename,
                content: file.file_content
            };
        }
        catch (error) {
            logger_1.logger.error('Failed to fetch NACHA file content', error);
            throw error;
        }
    }
    static async getCompanyInfo() {
        return {
            name: 'ACH Processing Company',
            id: '1234567890',
            description: 'ACH Transfer',
            routingNumber: '123456789',
            accountNumber: '1234567890'
        };
    }
    static mapDatabaseToTransaction(dbTransaction) {
        return {
            id: dbTransaction.id,
            transactionId: dbTransaction.transaction_id,
            routingNumber: dbTransaction.routing_number,
            accountNumber: encryption_1.EncryptionService.decrypt(dbTransaction.account_number_encrypted),
            accountType: dbTransaction.account_type,
            transactionType: dbTransaction.transaction_type,
            amount: dbTransaction.amount,
            effectiveDate: new Date(dbTransaction.effective_date),
            description: dbTransaction.description,
            individualId: dbTransaction.individual_id,
            individualName: dbTransaction.individual_name,
            companyName: dbTransaction.company_name,
            companyId: dbTransaction.company_id,
            senderIp: dbTransaction.sender_ip,
            timestamp: new Date(dbTransaction.timestamp),
            status: dbTransaction.status,
            processedAt: dbTransaction.processed_at ? new Date(dbTransaction.processed_at) : undefined,
            nachaFileId: dbTransaction.nacha_file_id,
            createdBy: dbTransaction.created_by,
            updatedBy: dbTransaction.updated_by
        };
    }
    static mapDatabaseToNACHAFile(dbFile) {
        return {
            id: dbFile.id,
            organizationId: dbFile.organization_id || 'default-org',
            filename: dbFile.filename,
            content: dbFile.file_content || '',
            effectiveDate: new Date(dbFile.effective_date),
            transactionCount: dbFile.total_records || 0,
            totalAmount: dbFile.total_amount || 0,
            totalRecords: dbFile.total_records,
            totalDebits: dbFile.total_debits,
            totalCredits: dbFile.total_credits,
            status: dbFile.status,
            generatedAt: new Date(dbFile.generated_at),
            transmittedAt: dbFile.transmitted_at ? new Date(dbFile.transmitted_at) : undefined,
            filePath: dbFile.file_path || '',
            transactionIds: dbFile.transaction_ids || [],
            createdBy: dbFile.created_by,
            createdAt: new Date(dbFile.created_at),
            transmitted: dbFile.transmitted || false
        };
    }
}
exports.ACHTransactionService = ACHTransactionService;
//# sourceMappingURL=achTransaction.js.map
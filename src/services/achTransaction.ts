import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../utils/supabase';
import { EncryptionService } from '../utils/encryption';
import { ACHTransaction, NACHAFile, PaginatedResponse } from '../types';
import { NACHAService } from './nacha';
import { logger } from '../utils/logger';

interface CreateTransactionData {
  transactionId: string;
  routingNumber: string;
  accountNumber: string;
  accountType: 'checking' | 'savings';
  transactionType: 'debit' | 'credit';
  amount: number;
  effectiveDate: Date;
  description: string;
  individualId: string;
  individualName: string;
  companyName?: string;
  companyId?: string;
  senderIp: string;
  createdBy: string;
}

interface TransactionFilters {
  page: number;
  limit: number;
  status?: string;
  startDate?: Date;
  endDate?: Date;
}

export class ACHTransactionService {
  
  static async createTransaction(data: CreateTransactionData): Promise<ACHTransaction> {
    try {
      // Encrypt sensitive data
      const encryptedAccountNumber = EncryptionService.encrypt(data.accountNumber);
      
      const transactionData = {
        id: uuidv4(),
        transaction_id: data.transactionId,
        routing_number: data.routingNumber,
        account_number_encrypted: encryptedAccountNumber,
        account_number_hash: EncryptionService.hashSensitiveData(data.accountNumber),
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

      const { data: transaction, error } = await supabase
        .from('ach_transactions')
        .insert(transactionData)
        .select()
        .single();

      if (error) throw error;

      return this.mapDatabaseToTransaction(transaction);
    } catch (error) {
      logger.error('Failed to create ACH transaction', error);
      throw error;
    }
  }

  static async getTransactions(filters: TransactionFilters): Promise<PaginatedResponse<ACHTransaction>> {
    try {
      const { page, limit, status, startDate, endDate } = filters;
      const offset = (page - 1) * limit;

      let query = supabase
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

      if (error) throw error;

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
    } catch (error) {
      logger.error('Failed to fetch ACH transactions', error);
      throw error;
    }
  }

  static async getTransactionById(id: string): Promise<ACHTransaction | null> {
    try {
      const { data: transaction, error } = await supabase
        .from('ach_transactions')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw error;
      }

      return this.mapDatabaseToTransaction(transaction);
    } catch (error) {
      logger.error('Failed to fetch ACH transaction', error);
      throw error;
    }
  }

  static async updateTransactionStatus(
    id: string, 
    status: string, 
    updatedBy: string
  ): Promise<ACHTransaction | null> {
    try {
      const { data: transaction, error } = await supabase
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
        if (error.code === 'PGRST116') return null; // Not found
        throw error;
      }

      return this.mapDatabaseToTransaction(transaction);
    } catch (error) {
      logger.error('Failed to update ACH transaction status', error);
      throw error;
    }
  }

  static async generateNACHAFile(effectiveDate: Date, createdBy: string): Promise<NACHAFile> {
    try {
      // Get pending transactions for the effective date
      const { data: transactions, error } = await supabase
        .from('ach_transactions')
        .select('*')
        .eq('status', 'pending')
        .eq('effective_date', effectiveDate.toISOString().split('T')[0]);

      if (error) throw error;

      if (transactions.length === 0) {
        throw new Error('No pending transactions found for the specified effective date');
      }

      // Map to ACH transactions
      const achTransactions = transactions.map(this.mapDatabaseToTransaction);

      // Get company info from configuration
      const companyInfo = await this.getCompanyInfo();

      // Generate NACHA file
      const { content, filename, metadata } = await NACHAService.generateNACHAFile(
        achTransactions,
        effectiveDate,
        companyInfo
      );

      // Save NACHA file record
      const nachaFileData = {
        id: uuidv4(),
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

      const { data: nachaFile, error: fileError } = await supabase
        .from('nacha_files')
        .insert(nachaFileData)
        .select()
        .single();

      if (fileError) throw fileError;

      // Update transaction statuses
      await supabase
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
    } catch (error) {
      logger.error('Failed to generate NACHA file', error);
      throw error;
    }
  }

  static async getNACHAFiles(options: { page: number; limit: number }): Promise<PaginatedResponse<NACHAFile>> {
    try {
      const { page, limit } = options;
      const offset = (page - 1) * limit;

      const { data: files, error, count } = await supabase
        .from('nacha_files')
        .select('*', { count: 'exact' })
        .order('generated_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;

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
    } catch (error) {
      logger.error('Failed to fetch NACHA files', error);
      throw error;
    }
  }

  static async getNACHAFileContent(id: string): Promise<{ filename: string; content: string } | null> {
    try {
      const { data: file, error } = await supabase
        .from('nacha_files')
        .select('filename, file_content')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw error;
      }

      return {
        filename: file.filename,
        content: file.file_content
      };
    } catch (error) {
      logger.error('Failed to fetch NACHA file content', error);
      throw error;
    }
  }

  private static async getCompanyInfo() {
    // This would typically fetch from configuration
    return {
      name: 'ACH Processing Company',
      id: '1234567890',
      description: 'ACH Transfer',
      routingNumber: '123456789',
      accountNumber: '1234567890'
    };
  }

  private static mapDatabaseToTransaction(dbTransaction: any): ACHTransaction {
    return {
      id: dbTransaction.id,
      transactionId: dbTransaction.transaction_id,
      routingNumber: dbTransaction.routing_number,
      accountNumber: EncryptionService.decrypt(dbTransaction.account_number_encrypted),
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

  private static mapDatabaseToNACHAFile(dbFile: any): NACHAFile {
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
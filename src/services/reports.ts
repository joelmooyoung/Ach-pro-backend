import { supabase } from '../utils/supabase';
import { logger } from '../utils/logger';
import moment from 'moment';

interface DailySummary {
  date: string;
  totalTransactions: number;
  totalAmount: number;
  debitCount: number;
  creditCount: number;
  debitAmount: number;
  creditAmount: number;
  pendingCount: number;
  processedCount: number;
  failedCount: number;
}

interface MonthlySummary {
  year: number;
  month: number;
  totalTransactions: number;
  totalAmount: number;
  averageDailyTransactions: number;
  averageDailyAmount: number;
  businessDays: number;
  nachaFilesGenerated: number;
}

interface TransactionStatistics {
  totalTransactions: number;
  totalAmount: number;
  averageAmount: number;
  transactionsByType: {
    debit: { count: number; amount: number };
    credit: { count: number; amount: number };
  };
  transactionsByStatus: {
    pending: number;
    processed: number;
    failed: number;
    cancelled: number;
  };
  dailyBreakdown: Array<{
    date: string;
    count: number;
    amount: number;
  }>;
}

interface ErrorReport {
  totalErrors: number;
  errorsByType: { [key: string]: number };
  recentErrors: Array<{
    date: string;
    message: string;
    count: number;
  }>;
}

export class ReportService {
  
  static async getDailySummary(date: Date): Promise<DailySummary> {
    try {
      const dateStr = moment(date).format('YYYY-MM-DD');
      
      const { data: transactions, error } = await supabase
        .from('ach_transactions')
        .select('transaction_type, amount, status')
        .gte('created_at', `${dateStr}T00:00:00`)
        .lt('created_at', `${dateStr}T23:59:59`);

      if (error) throw error;

      const summary: DailySummary = {
        date: dateStr,
        totalTransactions: transactions.length,
        totalAmount: 0,
        debitCount: 0,
        creditCount: 0,
        debitAmount: 0,
        creditAmount: 0,
        pendingCount: 0,
        processedCount: 0,
        failedCount: 0
      };

      transactions.forEach(transaction => {
        summary.totalAmount += transaction.amount;
        
        if (transaction.transaction_type === 'debit') {
          summary.debitCount++;
          summary.debitAmount += transaction.amount;
        } else {
          summary.creditCount++;
          summary.creditAmount += transaction.amount;
        }

        switch (transaction.status) {
          case 'pending':
            summary.pendingCount++;
            break;
          case 'processed':
            summary.processedCount++;
            break;
          case 'failed':
            summary.failedCount++;
            break;
        }
      });

      return summary;
    } catch (error) {
      logger.error('Failed to generate daily summary', error);
      throw error;
    }
  }

  static async getMonthlySummary(year: number, month: number): Promise<MonthlySummary> {
    try {
      const startDate = moment({ year, month: month - 1, day: 1 });
      const endDate = startDate.clone().endOf('month');
      
      const { data: transactions, error } = await supabase
        .from('ach_transactions')
        .select('amount')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      if (error) throw error;

      const { data: nachaFiles, error: nachaError } = await supabase
        .from('nacha_files')
        .select('id')
        .gte('generated_at', startDate.toISOString())
        .lte('generated_at', endDate.toISOString());

      if (nachaError) throw nachaError;

      const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0);
      const daysInMonth = endDate.date();
      
      // Calculate business days (simplified - excludes weekends)
      let businessDays = 0;
      for (let day = 1; day <= daysInMonth; day++) {
        const date = moment({ year, month: month - 1, day });
        if (date.day() !== 0 && date.day() !== 6) {
          businessDays++;
        }
      }

      return {
        year,
        month,
        totalTransactions: transactions.length,
        totalAmount,
        averageDailyTransactions: transactions.length / daysInMonth,
        averageDailyAmount: totalAmount / daysInMonth,
        businessDays,
        nachaFilesGenerated: nachaFiles.length
      };
    } catch (error) {
      logger.error('Failed to generate monthly summary', error);
      throw error;
    }
  }

  static async getTransactionStatistics(startDate: Date, endDate: Date): Promise<TransactionStatistics> {
    try {
      const { data: transactions, error } = await supabase
        .from('ach_transactions')
        .select('transaction_type, amount, status, created_at')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at');

      if (error) throw error;

      const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0);
      
      const stats: TransactionStatistics = {
        totalTransactions: transactions.length,
        totalAmount,
        averageAmount: transactions.length > 0 ? totalAmount / transactions.length : 0,
        transactionsByType: {
          debit: { count: 0, amount: 0 },
          credit: { count: 0, amount: 0 }
        },
        transactionsByStatus: {
          pending: 0,
          processed: 0,
          failed: 0,
          cancelled: 0
        },
        dailyBreakdown: []
      };

      // Group by type and status
      transactions.forEach(transaction => {
        if (transaction.transaction_type === 'debit') {
          stats.transactionsByType.debit.count++;
          stats.transactionsByType.debit.amount += transaction.amount;
        } else {
          stats.transactionsByType.credit.count++;
          stats.transactionsByType.credit.amount += transaction.amount;
        }

        stats.transactionsByStatus[transaction.status as keyof typeof stats.transactionsByStatus]++;
      });

      // Daily breakdown
      const dailyGroups = transactions.reduce((groups, transaction) => {
        const date = moment(transaction.created_at).format('YYYY-MM-DD');
        if (!groups[date]) {
          groups[date] = { count: 0, amount: 0 };
        }
        groups[date].count++;
        groups[date].amount += transaction.amount;
        return groups;
      }, {} as { [key: string]: { count: number; amount: number } });

      stats.dailyBreakdown = Object.entries(dailyGroups).map(([date, data]) => ({
        date,
        count: data.count,
        amount: data.amount
      }));

      return stats;
    } catch (error) {
      logger.error('Failed to generate transaction statistics', error);
      throw error;
    }
  }

  static async getNACHAFileStatistics(days: number): Promise<any> {
    try {
      const startDate = moment().subtract(days, 'days');
      
      const { data: files, error } = await supabase
        .from('nacha_files')
        .select('*')
        .gte('generated_at', startDate.toISOString())
        .order('generated_at', { ascending: false });

      if (error) throw error;

      const totalFiles = files.length;
      const totalRecords = files.reduce((sum, f) => sum + f.total_records, 0);
      const totalDebits = files.reduce((sum, f) => sum + f.total_debits, 0);
      const totalCredits = files.reduce((sum, f) => sum + f.total_credits, 0);

      const statusBreakdown = files.reduce((counts, file) => {
        counts[file.status] = (counts[file.status] || 0) + 1;
        return counts;
      }, {} as { [key: string]: number });

      return {
        totalFiles,
        totalRecords,
        totalDebits,
        totalCredits,
        statusBreakdown,
        averageRecordsPerFile: totalFiles > 0 ? totalRecords / totalFiles : 0,
        files: files.slice(0, 10) // Recent 10 files
      };
    } catch (error) {
      logger.error('Failed to generate NACHA file statistics', error);
      throw error;
    }
  }

  static async getErrorReport(days: number): Promise<ErrorReport> {
    try {
      const startDate = moment().subtract(days, 'days');
      
      // This would typically come from a separate error log table
      // For now, we'll simulate with failed transactions
      const { data: failedTransactions, error } = await supabase
        .from('ach_transactions')
        .select('created_at, status')
        .eq('status', 'failed')
        .gte('created_at', startDate.toISOString());

      if (error) throw error;

      return {
        totalErrors: failedTransactions.length,
        errorsByType: {
          'Transaction Failed': failedTransactions.length
        },
        recentErrors: failedTransactions.slice(0, 10).map(t => ({
          date: moment(t.created_at).format('YYYY-MM-DD HH:mm'),
          message: 'Transaction processing failed',
          count: 1
        }))
      };
    } catch (error) {
      logger.error('Failed to generate error report', error);
      throw error;
    }
  }

  static async exportTransactionsToCSV(startDate: Date, endDate: Date): Promise<string> {
    try {
      const { data: transactions, error } = await supabase
        .from('ach_transactions')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at');

      if (error) throw error;

      const headers = [
        'Transaction ID',
        'Routing Number',
        'Account Type',
        'Transaction Type',
        'Amount',
        'Effective Date',
        'Description',
        'Individual Name',
        'Status',
        'Created At'
      ];

      const csvRows = [headers.join(',')];

      transactions.forEach(transaction => {
        const row = [
          transaction.transaction_id,
          transaction.routing_number,
          transaction.account_type,
          transaction.transaction_type,
          transaction.amount,
          transaction.effective_date,
          `"${transaction.description}"`,
          `"${transaction.individual_name}"`,
          transaction.status,
          transaction.created_at
        ];
        csvRows.push(row.join(','));
      });

      return csvRows.join('\n');
    } catch (error) {
      logger.error('Failed to export transactions to CSV', error);
      throw error;
    }
  }

  static async getUserActivityReport(days: number): Promise<any> {
    try {
      const startDate = moment().subtract(days, 'days');
      
      const { data: users, error } = await supabase
        .from('users')
        .select('id, first_name, last_name, last_login')
        .eq('is_active', true);

      if (error) throw error;

      // Get transaction counts by user
      const { data: transactionCounts, error: transactionError } = await supabase
        .from('ach_transactions')
        .select('created_by')
        .gte('created_at', startDate.toISOString());

      if (transactionError) throw transactionError;

      const activityCounts = transactionCounts.reduce((counts, transaction) => {
        counts[transaction.created_by] = (counts[transaction.created_by] || 0) + 1;
        return counts;
      }, {} as { [key: string]: number });

      return users.map(user => ({
        userId: user.id,
        name: `${user.first_name} ${user.last_name}`,
        lastLogin: user.last_login,
        transactionCount: activityCounts[user.id] || 0,
        isActive: !!user.last_login && moment(user.last_login).isAfter(startDate)
      }));
    } catch (error) {
      logger.error('Failed to generate user activity report', error);
      throw error;
    }
  }
}
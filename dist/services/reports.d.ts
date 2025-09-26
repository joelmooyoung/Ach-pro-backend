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
        debit: {
            count: number;
            amount: number;
        };
        credit: {
            count: number;
            amount: number;
        };
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
    errorsByType: {
        [key: string]: number;
    };
    recentErrors: Array<{
        date: string;
        message: string;
        count: number;
    }>;
}
export declare class ReportService {
    static getDailySummary(date: Date): Promise<DailySummary>;
    static getMonthlySummary(year: number, month: number): Promise<MonthlySummary>;
    static getTransactionStatistics(startDate: Date, endDate: Date): Promise<TransactionStatistics>;
    static getNACHAFileStatistics(days: number): Promise<any>;
    static getErrorReport(days: number): Promise<ErrorReport>;
    static exportTransactionsToCSV(startDate: Date, endDate: Date): Promise<string>;
    static getUserActivityReport(days: number): Promise<any>;
}
export {};
//# sourceMappingURL=reports.d.ts.map
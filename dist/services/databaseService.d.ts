import { EncryptedTransaction, EncryptedTransactionEntry, TransactionGroup, NACHAFile, FederalHoliday, SystemConfig, User, Organization, TransactionFilters, PaginatedResponse } from '../types';
export declare class DatabaseService {
    private supabase;
    constructor(supabaseUrl: string, supabaseKey: string);
    createOrganization(organization: Omit<Organization, 'id' | 'createdAt' | 'updatedAt'>): Promise<Organization>;
    getOrganization(id: string): Promise<Organization | null>;
    getOrganizationByKey(organizationKey: string): Promise<Organization | null>;
    getOrganizations(page?: number, limit?: number): Promise<PaginatedResponse<Organization>>;
    updateOrganization(id: string, updates: Partial<Omit<Organization, 'id' | 'createdAt' | 'updatedAt'>>): Promise<void>;
    createTransaction(transaction: EncryptedTransaction): Promise<EncryptedTransaction>;
    getTransaction(id: string): Promise<EncryptedTransaction | null>;
    getTransactions(page?: number, limit?: number, filters?: TransactionFilters): Promise<PaginatedResponse<EncryptedTransaction>>;
    updateTransactionStatus(id: string, status: string): Promise<void>;
    createTransactionEntry(entry: EncryptedTransactionEntry): Promise<EncryptedTransactionEntry>;
    createTransactionGroup(group: Omit<TransactionGroup, 'id' | 'createdAt' | 'updatedAt'>): Promise<TransactionGroup>;
    getTransactionEntry(id: string): Promise<EncryptedTransactionEntry | null>;
    getTransactionEntries(page?: number, limit?: number, filters?: {
        status?: string;
        effectiveDate?: Date;
        entryType?: 'DR' | 'CR';
    }): Promise<PaginatedResponse<EncryptedTransactionEntry>>;
    getTransactionGroup(id: string): Promise<TransactionGroup | null>;
    getTransactionGroups(page?: number, limit?: number): Promise<PaginatedResponse<TransactionGroup>>;
    updateTransactionEntryStatus(id: string, status: string): Promise<void>;
    createNACHAFile(nachaFile: Omit<NACHAFile, 'id' | 'createdAt'>): Promise<NACHAFile>;
    getNACHAFile(id: string): Promise<NACHAFile | null>;
    getNACHAFiles(page?: number, limit?: number): Promise<PaginatedResponse<NACHAFile>>;
    updateNACHAFileTransmissionStatus(id: string, transmitted: boolean): Promise<void>;
    createFederalHoliday(holiday: Omit<FederalHoliday, 'id'>): Promise<FederalHoliday>;
    getFederalHolidays(year?: number): Promise<FederalHoliday[]>;
    updateFederalHoliday(id: string, updates: Partial<FederalHoliday>): Promise<void>;
    deleteFederalHoliday(id: string): Promise<void>;
    getSystemConfig(key: string): Promise<SystemConfig | null>;
    setSystemConfig(key: string, value: string, description?: string): Promise<SystemConfig>;
    getAllSystemConfig(): Promise<SystemConfig[]>;
    createUser(user: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User>;
    getUserByEmail(email: string): Promise<User | null>;
    getUserById(id: string): Promise<User | null>;
    updateUser(id: string, updates: Partial<User>): Promise<void>;
}
//# sourceMappingURL=databaseService.d.ts.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseService = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
class DatabaseService {
    constructor(supabaseUrl, supabaseKey) {
        this.supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseKey);
    }
    async createOrganization(organization) {
        const { data, error } = await this.supabase
            .from('organizations')
            .insert({
            organization_key: organization.organizationKey,
            name: organization.name,
            description: organization.description,
            active: organization.active
        })
            .select()
            .single();
        if (error) {
            throw new Error(`Failed to create organization: ${error.message}`);
        }
        return {
            id: data.id,
            organizationKey: data.organization_key,
            name: data.name,
            description: data.description,
            active: data.active,
            createdAt: new Date(data.created_at),
            updatedAt: new Date(data.updated_at)
        };
    }
    async getOrganization(id) {
        const { data, error } = await this.supabase
            .from('organizations')
            .select('*')
            .eq('id', id)
            .single();
        if (error) {
            if (error.code === 'PGRST116') {
                return null;
            }
            throw new Error(`Failed to get organization: ${error.message}`);
        }
        return {
            id: data.id,
            organizationKey: data.organization_key,
            name: data.name,
            description: data.description,
            active: data.active,
            createdAt: new Date(data.created_at),
            updatedAt: new Date(data.updated_at)
        };
    }
    async getOrganizationByKey(organizationKey) {
        const { data, error } = await this.supabase
            .from('organizations')
            .select('*')
            .eq('organization_key', organizationKey)
            .single();
        if (error) {
            if (error.code === 'PGRST116') {
                return null;
            }
            throw new Error(`Failed to get organization: ${error.message}`);
        }
        return {
            id: data.id,
            organizationKey: data.organization_key,
            name: data.name,
            description: data.description,
            active: data.active,
            createdAt: new Date(data.created_at),
            updatedAt: new Date(data.updated_at)
        };
    }
    async getOrganizations(page = 1, limit = 50) {
        const offset = (page - 1) * limit;
        const { data, error, count } = await this.supabase
            .from('organizations')
            .select('*', { count: 'exact' })
            .order('name')
            .range(offset, offset + limit - 1);
        if (error) {
            throw new Error(`Failed to get organizations: ${error.message}`);
        }
        const organizations = data?.map(org => ({
            id: org.id,
            organizationKey: org.organization_key,
            name: org.name,
            description: org.description,
            active: org.active,
            createdAt: new Date(org.created_at),
            updatedAt: new Date(org.updated_at)
        })) || [];
        const totalPages = Math.ceil((count || 0) / limit);
        return {
            success: true,
            data: organizations,
            pagination: {
                page,
                limit,
                total: count || 0,
                totalPages
            }
        };
    }
    async updateOrganization(id, updates) {
        const updateData = {};
        if (updates.organizationKey)
            updateData.organization_key = updates.organizationKey;
        if (updates.name)
            updateData.name = updates.name;
        if (updates.description !== undefined)
            updateData.description = updates.description;
        if (updates.active !== undefined)
            updateData.active = updates.active;
        const { error } = await this.supabase
            .from('organizations')
            .update(updateData)
            .eq('id', id);
        if (error) {
            throw new Error(`Failed to update organization: ${error.message}`);
        }
    }
    async createTransaction(transaction) {
        const { data, error } = await this.supabase
            .from('ach_transactions')
            .insert({
            id: transaction.id,
            organization_id: transaction.organizationId,
            trace_number: transaction.traceNumber,
            dr_routing_number: transaction.drRoutingNumber,
            dr_account_number_encrypted: transaction.drAccountNumberEncrypted,
            dr_id: transaction.drId,
            dr_name: transaction.drName,
            cr_routing_number: transaction.crRoutingNumber,
            cr_account_number_encrypted: transaction.crAccountNumberEncrypted,
            cr_id: transaction.crId,
            cr_name: transaction.crName,
            amount: transaction.amount,
            effective_date: transaction.effectiveDate.toISOString().split('T')[0],
            sender_ip: transaction.senderIp,
            sender_details: transaction.senderDetails,
            status: transaction.status
        })
            .select()
            .single();
        if (error) {
            throw new Error(`Failed to create transaction: ${error.message}`);
        }
        return {
            id: data.id,
            transactionId: data.transaction_id || data.id,
            routingNumber: data.dr_routing_number || data.routing_number,
            accountNumberEncrypted: data.dr_account_number_encrypted || data.account_number_encrypted,
            accountType: data.account_type || 'checking',
            transactionType: data.transaction_type || 'debit',
            amount: data.amount,
            effectiveDate: new Date(data.effective_date),
            description: data.description || '',
            individualId: data.dr_id || data.individual_id,
            individualName: data.dr_name || data.individual_name,
            companyName: data.cr_name || data.company_name,
            companyId: data.cr_id || data.company_id,
            senderIp: data.sender_ip,
            timestamp: new Date(data.created_at),
            status: data.status,
            processedAt: data.processed_at ? new Date(data.processed_at) : undefined,
            nachaFileId: data.nacha_file_id,
            createdBy: data.created_by,
            updatedBy: data.updated_by,
            drRoutingNumber: data.dr_routing_number,
            drAccountNumberEncrypted: data.dr_account_number_encrypted,
            drId: data.dr_id,
            drName: data.dr_name,
            crRoutingNumber: data.cr_routing_number,
            crAccountNumberEncrypted: data.cr_account_number_encrypted,
            crId: data.cr_id,
            crName: data.cr_name,
            senderDetails: data.sender_details,
            organizationId: data.organization_id,
            traceNumber: data.trace_number,
            createdAt: new Date(data.created_at),
            updatedAt: new Date(data.updated_at)
        };
    }
    async getTransaction(id) {
        const { data, error } = await this.supabase
            .from('ach_transactions')
            .select('*')
            .eq('id', id)
            .single();
        if (error) {
            if (error.code === 'PGRST116') {
                return null;
            }
            throw new Error(`Failed to get transaction: ${error.message}`);
        }
        return {
            id: data.id,
            transactionId: data.transaction_id || data.id,
            routingNumber: data.dr_routing_number || data.routing_number,
            accountNumberEncrypted: data.dr_account_number_encrypted || data.account_number_encrypted,
            accountType: data.account_type || 'checking',
            transactionType: data.transaction_type || 'debit',
            amount: data.amount,
            effectiveDate: new Date(data.effective_date),
            description: data.description || '',
            individualId: data.dr_id || data.individual_id,
            individualName: data.dr_name || data.individual_name,
            companyName: data.cr_name || data.company_name,
            companyId: data.cr_id || data.company_id,
            senderIp: data.sender_ip,
            timestamp: new Date(data.created_at),
            status: data.status,
            processedAt: data.processed_at ? new Date(data.processed_at) : undefined,
            nachaFileId: data.nacha_file_id,
            createdBy: data.created_by,
            updatedBy: data.updated_by,
            drRoutingNumber: data.dr_routing_number,
            drAccountNumberEncrypted: data.dr_account_number_encrypted,
            drId: data.dr_id,
            drName: data.dr_name,
            crRoutingNumber: data.cr_routing_number,
            crAccountNumberEncrypted: data.cr_account_number_encrypted,
            crId: data.cr_id,
            crName: data.cr_name,
            senderDetails: data.sender_details,
            organizationId: data.organization_id,
            traceNumber: data.trace_number,
            createdAt: new Date(data.created_at),
            updatedAt: new Date(data.updated_at)
        };
    }
    async getTransactions(page = 1, limit = 50, filters) {
        let query = this.supabase
            .from('ach_transactions')
            .select('*', { count: 'exact' });
        if (filters?.status) {
            query = query.eq('status', filters.status);
        }
        if (filters?.effectiveDate) {
            query = query.eq('effective_date', filters.effectiveDate.toISOString().split('T')[0]);
        }
        if (filters?.organizationId) {
            query = query.eq('organization_id', filters.organizationId);
        }
        if (filters?.amountMin !== undefined) {
            query = query.gte('amount', filters.amountMin);
        }
        if (filters?.amountMax !== undefined) {
            query = query.lte('amount', filters.amountMax);
        }
        if (filters?.traceNumber) {
            query = query.eq('trace_number', filters.traceNumber);
        }
        if (filters?.drId) {
            query = query.ilike('dr_id', `%${filters.drId}%`);
        }
        if (filters?.crId) {
            query = query.ilike('cr_id', `%${filters.crId}%`);
        }
        if (filters?.dateFrom) {
            query = query.gte('created_at', filters.dateFrom.toISOString());
        }
        if (filters?.dateTo) {
            query = query.lte('created_at', filters.dateTo.toISOString());
        }
        const offset = (page - 1) * limit;
        query = query.range(offset, offset + limit - 1).order('created_at', { ascending: false });
        const { data, error, count } = await query;
        if (error) {
            throw new Error(`Failed to get transactions: ${error.message}`);
        }
        const transactions = data?.map(tx => ({
            id: tx.id,
            transactionId: tx.transaction_id || tx.id,
            routingNumber: tx.dr_routing_number || tx.routing_number,
            accountNumberEncrypted: tx.dr_account_number_encrypted || tx.account_number_encrypted,
            accountType: tx.account_type || 'checking',
            transactionType: tx.transaction_type || 'debit',
            amount: tx.amount,
            effectiveDate: new Date(tx.effective_date),
            description: tx.description || '',
            individualId: tx.dr_id || tx.individual_id,
            individualName: tx.dr_name || tx.individual_name,
            companyName: tx.cr_name || tx.company_name,
            companyId: tx.cr_id || tx.company_id,
            senderIp: tx.sender_ip,
            timestamp: new Date(tx.created_at),
            status: tx.status,
            processedAt: tx.processed_at ? new Date(tx.processed_at) : undefined,
            nachaFileId: tx.nacha_file_id,
            createdBy: tx.created_by,
            updatedBy: tx.updated_by,
            drRoutingNumber: tx.dr_routing_number,
            drAccountNumberEncrypted: tx.dr_account_number_encrypted,
            drId: tx.dr_id,
            drName: tx.dr_name,
            crRoutingNumber: tx.cr_routing_number,
            crAccountNumberEncrypted: tx.cr_account_number_encrypted,
            crId: tx.cr_id,
            crName: tx.cr_name,
            senderDetails: tx.sender_details,
            organizationId: tx.organization_id,
            traceNumber: tx.trace_number,
            createdAt: new Date(tx.created_at),
            updatedAt: new Date(tx.updated_at)
        })) || [];
        const totalPages = Math.ceil((count || 0) / limit);
        return {
            success: true,
            data: transactions,
            pagination: {
                page,
                limit,
                total: count || 0,
                totalPages
            }
        };
    }
    async updateTransactionStatus(id, status) {
        const { error } = await this.supabase
            .from('ach_transactions')
            .update({ status, updatedAt: new Date().toISOString() })
            .eq('id', id);
        if (error) {
            throw new Error(`Failed to update transaction status: ${error.message}`);
        }
    }
    async createTransactionEntry(entry) {
        const { data, error } = await this.supabase
            .from('transaction_entries')
            .insert([entry])
            .select()
            .single();
        if (error) {
            throw new Error(`Failed to create transaction entry: ${error.message}`);
        }
        return data;
    }
    async createTransactionGroup(group) {
        const groupData = {
            ...group,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        const { data, error } = await this.supabase
            .from('transaction_groups')
            .insert([groupData])
            .select()
            .single();
        if (error) {
            throw new Error(`Failed to create transaction group: ${error.message}`);
        }
        return data;
    }
    async getTransactionEntry(id) {
        const { data, error } = await this.supabase
            .from('transaction_entries')
            .select('*')
            .eq('id', id)
            .single();
        if (error) {
            if (error.code === 'PGRST116') {
                return null;
            }
            throw new Error(`Failed to get transaction entry: ${error.message}`);
        }
        return data;
    }
    async getTransactionEntries(page = 1, limit = 50, filters) {
        let query = this.supabase
            .from('transaction_entries')
            .select('*', { count: 'exact' });
        if (filters?.status) {
            query = query.eq('status', filters.status);
        }
        if (filters?.effectiveDate) {
            query = query.eq('effectiveDate', filters.effectiveDate.toISOString().slice(0, 10));
        }
        if (filters?.entryType) {
            query = query.eq('entryType', filters.entryType);
        }
        const offset = (page - 1) * limit;
        query = query.range(offset, offset + limit - 1);
        const { data, error, count } = await query;
        if (error) {
            throw new Error(`Failed to get transaction entries: ${error.message}`);
        }
        const totalPages = Math.ceil((count || 0) / limit);
        return {
            success: true,
            data: data || [],
            pagination: {
                page,
                limit,
                total: count || 0,
                totalPages
            }
        };
    }
    async getTransactionGroup(id) {
        const { data, error } = await this.supabase
            .from('transaction_groups')
            .select(`
        *,
        drEntry:transaction_entries!dr_entry_id(*),
        crEntry:transaction_entries!cr_entry_id(*)
      `)
            .eq('id', id)
            .single();
        if (error) {
            if (error.code === 'PGRST116') {
                return null;
            }
            throw new Error(`Failed to get transaction group: ${error.message}`);
        }
        return data;
    }
    async getTransactionGroups(page = 1, limit = 50) {
        const offset = (page - 1) * limit;
        const { data, error, count } = await this.supabase
            .from('transaction_groups')
            .select(`
        *,
        drEntry:transaction_entries!dr_entry_id(*),
        crEntry:transaction_entries!cr_entry_id(*)
      `, { count: 'exact' })
            .order('createdAt', { ascending: false })
            .range(offset, offset + limit - 1);
        if (error) {
            throw new Error(`Failed to get transaction groups: ${error.message}`);
        }
        const totalPages = Math.ceil((count || 0) / limit);
        return {
            success: true,
            data: data || [],
            pagination: {
                page,
                limit,
                total: count || 0,
                totalPages
            }
        };
    }
    async updateTransactionEntryStatus(id, status) {
        const { error } = await this.supabase
            .from('transaction_entries')
            .update({ status, updatedAt: new Date().toISOString() })
            .eq('id', id);
        if (error) {
            throw new Error(`Failed to update transaction entry status: ${error.message}`);
        }
    }
    async createNACHAFile(nachaFile) {
        const fileData = {
            ...nachaFile,
            createdAt: new Date().toISOString()
        };
        const { data, error } = await this.supabase
            .from('nacha_files')
            .insert([fileData])
            .select()
            .single();
        if (error) {
            throw new Error(`Failed to create NACHA file: ${error.message}`);
        }
        return data;
    }
    async getNACHAFile(id) {
        const { data, error } = await this.supabase
            .from('nacha_files')
            .select('*')
            .eq('id', id)
            .single();
        if (error) {
            if (error.code === 'PGRST116') {
                return null;
            }
            throw new Error(`Failed to get NACHA file: ${error.message}`);
        }
        return data;
    }
    async getNACHAFiles(page = 1, limit = 50) {
        const offset = (page - 1) * limit;
        const { data, error, count } = await this.supabase
            .from('nacha_files')
            .select('*', { count: 'exact' })
            .order('createdAt', { ascending: false })
            .range(offset, offset + limit - 1);
        if (error) {
            throw new Error(`Failed to get NACHA files: ${error.message}`);
        }
        const totalPages = Math.ceil((count || 0) / limit);
        return {
            success: true,
            data: data || [],
            pagination: {
                page,
                limit,
                total: count || 0,
                totalPages
            }
        };
    }
    async updateNACHAFileTransmissionStatus(id, transmitted) {
        const updateData = { transmitted };
        if (transmitted) {
            updateData.transmittedAt = new Date().toISOString();
        }
        const { error } = await this.supabase
            .from('nacha_files')
            .update(updateData)
            .eq('id', id);
        if (error) {
            throw new Error(`Failed to update NACHA file transmission status: ${error.message}`);
        }
    }
    async createFederalHoliday(holiday) {
        const { data, error } = await this.supabase
            .from('federal_holidays')
            .insert([holiday])
            .select()
            .single();
        if (error) {
            throw new Error(`Failed to create federal holiday: ${error.message}`);
        }
        return data;
    }
    async getFederalHolidays(year) {
        let query = this.supabase
            .from('federal_holidays')
            .select('*')
            .order('date', { ascending: true });
        if (year) {
            query = query.eq('year', year);
        }
        const { data, error } = await query;
        if (error) {
            throw new Error(`Failed to get federal holidays: ${error.message}`);
        }
        return data || [];
    }
    async updateFederalHoliday(id, updates) {
        const { error } = await this.supabase
            .from('federal_holidays')
            .update(updates)
            .eq('id', id);
        if (error) {
            throw new Error(`Failed to update federal holiday: ${error.message}`);
        }
    }
    async deleteFederalHoliday(id) {
        const { error } = await this.supabase
            .from('federal_holidays')
            .delete()
            .eq('id', id);
        if (error) {
            throw new Error(`Failed to delete federal holiday: ${error.message}`);
        }
    }
    async getSystemConfig(key) {
        const { data, error } = await this.supabase
            .from('system_config')
            .select('*')
            .eq('key', key)
            .single();
        if (error) {
            if (error.code === 'PGRST116') {
                return null;
            }
            throw new Error(`Failed to get system config: ${error.message}`);
        }
        return data;
    }
    async setSystemConfig(key, value, description) {
        const configData = {
            key,
            value,
            description,
            updatedAt: new Date().toISOString()
        };
        const { data, error } = await this.supabase
            .from('system_config')
            .upsert([configData], { onConflict: 'key' })
            .select()
            .single();
        if (error) {
            throw new Error(`Failed to set system config: ${error.message}`);
        }
        return data;
    }
    async getAllSystemConfig() {
        const { data, error } = await this.supabase
            .from('system_config')
            .select('*')
            .order('key', { ascending: true });
        if (error) {
            throw new Error(`Failed to get all system config: ${error.message}`);
        }
        return data || [];
    }
    async createUser(user) {
        const userData = {
            ...user,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        const { data, error } = await this.supabase
            .from('users')
            .insert([userData])
            .select()
            .single();
        if (error) {
            throw new Error(`Failed to create user: ${error.message}`);
        }
        return data;
    }
    async getUserByEmail(email) {
        const { data, error } = await this.supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .single();
        if (error) {
            if (error.code === 'PGRST116') {
                return null;
            }
            throw new Error(`Failed to get user by email: ${error.message}`);
        }
        return data;
    }
    async getUserById(id) {
        const { data, error } = await this.supabase
            .from('users')
            .select('*')
            .eq('id', id)
            .single();
        if (error) {
            if (error.code === 'PGRST116') {
                return null;
            }
            throw new Error(`Failed to get user by ID: ${error.message}`);
        }
        return data;
    }
    async updateUser(id, updates) {
        const updateData = {
            ...updates,
            updatedAt: new Date().toISOString()
        };
        const { error } = await this.supabase
            .from('users')
            .update(updateData)
            .eq('id', id);
        if (error) {
            throw new Error(`Failed to update user: ${error.message}`);
        }
    }
}
exports.DatabaseService = DatabaseService;
//# sourceMappingURL=databaseService.js.map
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigService = void 0;
const uuid_1 = require("uuid");
const supabase_1 = require("../utils/supabase");
const encryption_1 = require("../utils/encryption");
const logger_1 = require("../utils/logger");
const ssh2_sftp_client_1 = __importDefault(require("ssh2-sftp-client"));
class ConfigService {
    static async getAllConfigs() {
        try {
            const { data: configs, error } = await supabase_1.supabase
                .from('system_configs')
                .select('*')
                .order('key');
            if (error)
                throw error;
            return configs.map(this.mapDatabaseToConfig);
        }
        catch (error) {
            logger_1.logger.error('Failed to fetch all configurations', error);
            throw error;
        }
    }
    static async getConfig(key) {
        try {
            const { data: config, error } = await supabase_1.supabase
                .from('system_configs')
                .select('*')
                .eq('key', key)
                .single();
            if (error) {
                if (error.code === 'PGRST116')
                    return null;
                throw error;
            }
            return this.mapDatabaseToConfig(config);
        }
        catch (error) {
            logger_1.logger.error('Failed to fetch configuration', error);
            throw error;
        }
    }
    static async setConfig(key, value, updatedBy, description, isEncrypted = false) {
        try {
            const processedValue = isEncrypted ? encryption_1.EncryptionService.encrypt(JSON.stringify(value)) : value;
            const configData = {
                id: (0, uuid_1.v4)(),
                key,
                value: processedValue,
                description,
                is_encrypted: isEncrypted,
                updated_by: updatedBy,
                updated_at: new Date().toISOString()
            };
            const { data: config, error } = await supabase_1.supabase
                .from('system_configs')
                .upsert(configData, { onConflict: 'key' })
                .select()
                .single();
            if (error)
                throw error;
            return this.mapDatabaseToConfig(config);
        }
        catch (error) {
            logger_1.logger.error('Failed to set configuration', error);
            throw error;
        }
    }
    static async deleteConfig(key) {
        try {
            const { error } = await supabase_1.supabase
                .from('system_configs')
                .delete()
                .eq('key', key);
            if (error)
                throw error;
            return true;
        }
        catch (error) {
            logger_1.logger.error('Failed to delete configuration', error);
            return false;
        }
    }
    static async getFederalHolidays() {
        try {
            const { data: holidays, error } = await supabase_1.supabase
                .from('federal_holidays')
                .select('*')
                .eq('is_active', true)
                .order('date');
            if (error)
                throw error;
            return holidays.map(holiday => ({
                id: holiday.id,
                name: holiday.name,
                date: new Date(holiday.date),
                year: new Date(holiday.date).getFullYear(),
                recurring: holiday.is_recurring,
                isRecurring: holiday.is_recurring,
                createdAt: new Date(holiday.created_at)
            }));
        }
        catch (error) {
            logger_1.logger.error('Failed to fetch federal holidays', error);
            throw error;
        }
    }
    static async addFederalHoliday(holidayData) {
        try {
            const { data: holiday, error } = await supabase_1.supabase
                .from('federal_holidays')
                .insert({
                id: (0, uuid_1.v4)(),
                name: holidayData.name,
                date: holidayData.date.toISOString(),
                is_recurring: holidayData.isRecurring,
                is_active: true,
                created_at: new Date().toISOString()
            })
                .select()
                .single();
            if (error)
                throw error;
            return {
                id: holiday.id,
                name: holiday.name,
                date: new Date(holiday.date),
                year: new Date(holiday.date).getFullYear(),
                recurring: holiday.is_recurring,
                isRecurring: holiday.is_recurring,
                createdAt: new Date(holiday.created_at)
            };
        }
        catch (error) {
            logger_1.logger.error('Failed to add federal holiday', error);
            throw error;
        }
    }
    static async deleteFederalHoliday(id) {
        try {
            const { error } = await supabase_1.supabase
                .from('federal_holidays')
                .update({ is_active: false })
                .eq('id', id);
            if (error)
                throw error;
            return true;
        }
        catch (error) {
            logger_1.logger.error('Failed to delete federal holiday', error);
            return false;
        }
    }
    static async getSFTPConfig() {
        try {
            const config = await this.getConfig('sftp_settings');
            if (!config)
                return null;
            const sftpData = config.isEncrypted
                ? JSON.parse(encryption_1.EncryptionService.decrypt(config.value))
                : config.value;
            return sftpData;
        }
        catch (error) {
            logger_1.logger.error('Failed to fetch SFTP configuration', error);
            throw error;
        }
    }
    static async setSFTPConfig(sftpConfig, updatedBy) {
        try {
            await this.setConfig('sftp_settings', sftpConfig, updatedBy, 'SFTP connection settings', true);
            return sftpConfig;
        }
        catch (error) {
            logger_1.logger.error('Failed to set SFTP configuration', error);
            throw error;
        }
    }
    static async testSFTPConnection() {
        try {
            const sftpConfig = await this.getSFTPConfig();
            if (!sftpConfig) {
                return { success: false, message: 'SFTP configuration not found' };
            }
            const sftp = new ssh2_sftp_client_1.default();
            const connectConfig = {
                host: sftpConfig.host,
                port: sftpConfig.port,
                username: sftpConfig.username
            };
            if (sftpConfig.password) {
                connectConfig.password = sftpConfig.password;
            }
            else if (sftpConfig.privateKey) {
                connectConfig.privateKey = sftpConfig.privateKey;
            }
            await sftp.connect(connectConfig);
            await sftp.list(sftpConfig.remotePath);
            await sftp.end();
            return { success: true, message: 'SFTP connection successful' };
        }
        catch (error) {
            logger_1.logger.error('SFTP connection test failed', error);
            return { success: false, message: error.message };
        }
    }
    static mapDatabaseToConfig(dbConfig) {
        let value = dbConfig.value;
        if (dbConfig.is_encrypted) {
            try {
                const decrypted = encryption_1.EncryptionService.decrypt(value);
                value = JSON.parse(decrypted);
            }
            catch (error) {
                logger_1.logger.error('Failed to decrypt configuration value', error);
                value = null;
            }
        }
        return {
            id: dbConfig.id,
            key: dbConfig.key,
            value,
            description: dbConfig.description,
            isEncrypted: dbConfig.is_encrypted,
            updatedBy: dbConfig.updated_by,
            updatedAt: new Date(dbConfig.updated_at)
        };
    }
}
exports.ConfigService = ConfigService;
//# sourceMappingURL=config.js.map
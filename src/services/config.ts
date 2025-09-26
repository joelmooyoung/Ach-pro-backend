import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../utils/supabase';
import { EncryptionService } from '../utils/encryption';
import { SystemConfig, FederalHoliday, SFTPConfig } from '../types';
import { logger } from '../utils/logger';
import SftpClient from 'ssh2-sftp-client';

export class ConfigService {
  
  static async getAllConfigs(): Promise<SystemConfig[]> {
    try {
      const { data: configs, error } = await supabase
        .from('system_configs')
        .select('*')
        .order('key');

      if (error) throw error;

      return configs.map(this.mapDatabaseToConfig);
    } catch (error) {
      logger.error('Failed to fetch all configurations', error);
      throw error;
    }
  }

  static async getConfig(key: string): Promise<SystemConfig | null> {
    try {
      const { data: config, error } = await supabase
        .from('system_configs')
        .select('*')
        .eq('key', key)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw error;
      }

      return this.mapDatabaseToConfig(config);
    } catch (error) {
      logger.error('Failed to fetch configuration', error);
      throw error;
    }
  }

  static async setConfig(
    key: string,
    value: any,
    updatedBy: string,
    description?: string,
    isEncrypted: boolean = false
  ): Promise<SystemConfig> {
    try {
      const processedValue = isEncrypted ? EncryptionService.encrypt(JSON.stringify(value)) : value;

      const configData = {
        id: uuidv4(),
        key,
        value: processedValue,
        description,
        is_encrypted: isEncrypted,
        updated_by: updatedBy,
        updated_at: new Date().toISOString()
      };

      const { data: config, error } = await supabase
        .from('system_configs')
        .upsert(configData, { onConflict: 'key' })
        .select()
        .single();

      if (error) throw error;

      return this.mapDatabaseToConfig(config);
    } catch (error) {
      logger.error('Failed to set configuration', error);
      throw error;
    }
  }

  static async deleteConfig(key: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('system_configs')
        .delete()
        .eq('key', key);

      if (error) throw error;

      return true;
    } catch (error) {
      logger.error('Failed to delete configuration', error);
      return false;
    }
  }

  static async getFederalHolidays(): Promise<FederalHoliday[]> {
    try {
      const { data: holidays, error } = await supabase
        .from('federal_holidays')
        .select('*')
        .eq('is_active', true)
        .order('date');

      if (error) throw error;

      return holidays.map(holiday => ({
        id: holiday.id,
        name: holiday.name,
        date: new Date(holiday.date),
        year: new Date(holiday.date).getFullYear(),
        recurring: holiday.is_recurring,
        isRecurring: holiday.is_recurring,
        createdAt: new Date(holiday.created_at)
      }));
    } catch (error) {
      logger.error('Failed to fetch federal holidays', error);
      throw error;
    }
  }

  static async addFederalHoliday(holidayData: {
    name: string;
    date: Date;
    isRecurring: boolean;
  }): Promise<FederalHoliday> {
    try {
      const { data: holiday, error } = await supabase
        .from('federal_holidays')
        .insert({
          id: uuidv4(),
          name: holidayData.name,
          date: holidayData.date.toISOString(),
          is_recurring: holidayData.isRecurring,
          is_active: true,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      return {
        id: holiday.id,
        name: holiday.name,
        date: new Date(holiday.date),
        year: new Date(holiday.date).getFullYear(),
        recurring: holiday.is_recurring,
        isRecurring: holiday.is_recurring,
        createdAt: new Date(holiday.created_at)
      };
    } catch (error) {
      logger.error('Failed to add federal holiday', error);
      throw error;
    }
  }

  static async deleteFederalHoliday(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('federal_holidays')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;

      return true;
    } catch (error) {
      logger.error('Failed to delete federal holiday', error);
      return false;
    }
  }

  static async getSFTPConfig(): Promise<SFTPConfig | null> {
    try {
      const config = await this.getConfig('sftp_settings');
      if (!config) return null;

      const sftpData = config.isEncrypted 
        ? JSON.parse(EncryptionService.decrypt(config.value as string))
        : config.value;

      return sftpData as SFTPConfig;
    } catch (error) {
      logger.error('Failed to fetch SFTP configuration', error);
      throw error;
    }
  }

  static async setSFTPConfig(sftpConfig: SFTPConfig, updatedBy: string): Promise<SFTPConfig> {
    try {
      await this.setConfig('sftp_settings', sftpConfig, updatedBy, 'SFTP connection settings', true);
      return sftpConfig;
    } catch (error) {
      logger.error('Failed to set SFTP configuration', error);
      throw error;
    }
  }

  static async testSFTPConnection(): Promise<{ success: boolean; message: string }> {
    try {
      const sftpConfig = await this.getSFTPConfig();
      if (!sftpConfig) {
        return { success: false, message: 'SFTP configuration not found' };
      }

      const sftp = new SftpClient();
      
      const connectConfig: any = {
        host: sftpConfig.host,
        port: sftpConfig.port,
        username: sftpConfig.username
      };

      if (sftpConfig.password) {
        connectConfig.password = sftpConfig.password;
      } else if (sftpConfig.privateKey) {
        connectConfig.privateKey = sftpConfig.privateKey;
      }

      await sftp.connect(connectConfig);
      
      // Test listing directory
      await sftp.list(sftpConfig.remotePath);
      
      await sftp.end();

      return { success: true, message: 'SFTP connection successful' };
    } catch (error: any) {
      logger.error('SFTP connection test failed', error);
      return { success: false, message: error.message };
    }
  }

  private static mapDatabaseToConfig(dbConfig: any): SystemConfig {
    let value = dbConfig.value;
    
    if (dbConfig.is_encrypted) {
      try {
        const decrypted = EncryptionService.decrypt(value);
        value = JSON.parse(decrypted);
      } catch (error) {
        logger.error('Failed to decrypt configuration value', error);
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
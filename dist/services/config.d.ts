import { SystemConfig, FederalHoliday, SFTPConfig } from '../types';
export declare class ConfigService {
    static getAllConfigs(): Promise<SystemConfig[]>;
    static getConfig(key: string): Promise<SystemConfig | null>;
    static setConfig(key: string, value: any, updatedBy: string, description?: string, isEncrypted?: boolean): Promise<SystemConfig>;
    static deleteConfig(key: string): Promise<boolean>;
    static getFederalHolidays(): Promise<FederalHoliday[]>;
    static addFederalHoliday(holidayData: {
        name: string;
        date: Date;
        isRecurring: boolean;
    }): Promise<FederalHoliday>;
    static deleteFederalHoliday(id: string): Promise<boolean>;
    static getSFTPConfig(): Promise<SFTPConfig | null>;
    static setSFTPConfig(sftpConfig: SFTPConfig, updatedBy: string): Promise<SFTPConfig>;
    static testSFTPConnection(): Promise<{
        success: boolean;
        message: string;
    }>;
    private static mapDatabaseToConfig;
}
//# sourceMappingURL=config.d.ts.map
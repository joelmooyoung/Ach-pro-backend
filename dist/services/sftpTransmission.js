"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SFTPTransmissionService = void 0;
const ssh2_sftp_client_1 = __importDefault(require("ssh2-sftp-client"));
const config_1 = require("./config");
const logger_1 = require("../utils/logger");
const supabase_1 = require("../utils/supabase");
class SFTPTransmissionService {
    static async transmitNACHAFile(nachaFileId) {
        try {
            const sftpConfig = await config_1.ConfigService.getSFTPConfig();
            if (!sftpConfig || !sftpConfig.enabled) {
                throw new Error('SFTP is not configured or disabled');
            }
            const { data: nachaFile, error } = await supabase_1.supabase
                .from('nacha_files')
                .select('filename, file_content')
                .eq('id', nachaFileId)
                .single();
            if (error || !nachaFile) {
                throw new Error('NACHA file not found');
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
            const remoteFilePath = `${sftpConfig.remotePath}/${nachaFile.filename}`;
            const fileBuffer = Buffer.from(nachaFile.file_content, 'utf8');
            await sftp.put(fileBuffer, remoteFilePath);
            await sftp.end();
            await supabase_1.supabase
                .from('nacha_files')
                .update({
                status: 'transmitted',
                transmitted_at: new Date().toISOString()
            })
                .eq('id', nachaFileId);
            logger_1.logger.info('NACHA file transmitted successfully', {
                nachaFileId,
                filename: nachaFile.filename,
                remoteFilePath
            });
            return {
                success: true,
                message: `File ${nachaFile.filename} transmitted successfully`
            };
        }
        catch (error) {
            logger_1.logger.error('SFTP transmission failed', {
                nachaFileId,
                error: error.message
            });
            await supabase_1.supabase
                .from('nacha_files')
                .update({ status: 'failed' })
                .eq('id', nachaFileId);
            return {
                success: false,
                message: `Transmission failed: ${error.message}`
            };
        }
    }
    static async scheduleTransmission(nachaFileId, scheduledTime) {
        if (scheduledTime && scheduledTime > new Date()) {
            logger_1.logger.info('NACHA file scheduled for transmission', {
                nachaFileId,
                scheduledTime
            });
            setTimeout(async () => {
                await this.transmitNACHAFile(nachaFileId);
            }, scheduledTime.getTime() - Date.now());
        }
        else {
            await this.transmitNACHAFile(nachaFileId);
        }
    }
    static async retryFailedTransmissions() {
        try {
            const { data: failedFiles, error } = await supabase_1.supabase
                .from('nacha_files')
                .select('id, filename')
                .eq('status', 'failed');
            if (error)
                throw error;
            for (const file of failedFiles) {
                logger_1.logger.info('Retrying failed transmission', { fileId: file.id, filename: file.filename });
                await this.transmitNACHAFile(file.id);
            }
        }
        catch (error) {
            logger_1.logger.error('Failed to retry transmissions', error);
        }
    }
}
exports.SFTPTransmissionService = SFTPTransmissionService;
//# sourceMappingURL=sftpTransmission.js.map
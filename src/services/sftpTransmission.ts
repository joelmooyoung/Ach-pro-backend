import SftpClient from 'ssh2-sftp-client';
import { ConfigService } from './config';
import { logger } from '../utils/logger';
import { supabase } from '../utils/supabase';

export class SFTPTransmissionService {
  
  static async transmitNACHAFile(nachaFileId: string): Promise<{ success: boolean; message: string }> {
    try {
      // Get SFTP configuration
      const sftpConfig = await ConfigService.getSFTPConfig();
      if (!sftpConfig || !sftpConfig.enabled) {
        throw new Error('SFTP is not configured or disabled');
      }

      // Get NACHA file content
      const { data: nachaFile, error } = await supabase
        .from('nacha_files')
        .select('filename, file_content')
        .eq('id', nachaFileId)
        .single();

      if (error || !nachaFile) {
        throw new Error('NACHA file not found');
      }

      // Set up SFTP connection
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

      // Connect and transmit file
      await sftp.connect(connectConfig);
      
      const remoteFilePath = `${sftpConfig.remotePath}/${nachaFile.filename}`;
      const fileBuffer = Buffer.from(nachaFile.file_content, 'utf8');
      
      await sftp.put(fileBuffer, remoteFilePath);
      await sftp.end();

      // Update file status to transmitted
      await supabase
        .from('nacha_files')
        .update({
          status: 'transmitted',
          transmitted_at: new Date().toISOString()
        })
        .eq('id', nachaFileId);

      logger.info('NACHA file transmitted successfully', {
        nachaFileId,
        filename: nachaFile.filename,
        remoteFilePath
      });

      return {
        success: true,
        message: `File ${nachaFile.filename} transmitted successfully`
      };

    } catch (error: any) {
      logger.error('SFTP transmission failed', {
        nachaFileId,
        error: error.message
      });

      // Update file status to failed
      await supabase
        .from('nacha_files')
        .update({ status: 'failed' })
        .eq('id', nachaFileId);

      return {
        success: false,
        message: `Transmission failed: ${error.message}`
      };
    }
  }

  static async scheduleTransmission(nachaFileId: string, scheduledTime?: Date): Promise<void> {
    // This would integrate with a job queue system like Bull or similar
    // For now, we'll implement immediate transmission
    if (scheduledTime && scheduledTime > new Date()) {
      logger.info('NACHA file scheduled for transmission', {
        nachaFileId,
        scheduledTime
      });
      // In a real implementation, this would use a job scheduler
      setTimeout(async () => {
        await this.transmitNACHAFile(nachaFileId);
      }, scheduledTime.getTime() - Date.now());
    } else {
      await this.transmitNACHAFile(nachaFileId);
    }
  }

  static async retryFailedTransmissions(): Promise<void> {
    try {
      const { data: failedFiles, error } = await supabase
        .from('nacha_files')
        .select('id, filename')
        .eq('status', 'failed');

      if (error) throw error;

      for (const file of failedFiles) {
        logger.info('Retrying failed transmission', { fileId: file.id, filename: file.filename });
        await this.transmitNACHAFile(file.id);
      }
    } catch (error) {
      logger.error('Failed to retry transmissions', error);
    }
  }
}
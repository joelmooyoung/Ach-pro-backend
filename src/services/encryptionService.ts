import crypto from 'crypto';

export class EncryptionService {
  private readonly algorithm = 'aes-256-cbc';
  private readonly key: Buffer;

  constructor(encryptionKey: string) {
    // Ensure the key is 32 bytes for AES-256
    this.key = crypto.scryptSync(encryptionKey, 'salt', 32);
  }

  /**
   * Encrypt sensitive data using AES-256-CBC
   */
  encrypt(text: string): string {
    try {
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
      
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      // Combine IV and encrypted data
      return iv.toString('hex') + ':' + encrypted;
    } catch (error) {
      throw new Error(`Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Decrypt sensitive data using AES-256-CBC
   */
  decrypt(encryptedText: string): string {
    try {
      const [ivHex, encrypted] = encryptedText.split(':');
      
      if (!ivHex || !encrypted) {
        throw new Error('Invalid encrypted data format');
      }
      
      const iv = Buffer.from(ivHex, 'hex');
      const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      throw new Error(`Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Hash sensitive data for comparison (one-way)
   */
  hash(text: string): string {
    return crypto.createHash('sha256').update(text).digest('hex');
  }

  /**
   * Generate a secure random token
   */
  generateToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Encrypt file content with additional metadata
   */
  encryptFileContent(content: string, metadata?: Record<string, any>): string {
    try {
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
      
      // Create file object with content and metadata
      const fileData = {
        content,
        metadata: metadata || {},
        timestamp: new Date().toISOString(),
        version: '1.0'
      };
      
      const fileJson = JSON.stringify(fileData);
      let encrypted = cipher.update(fileJson, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      // Combine IV and encrypted data with file marker
      return `FILE:${iv.toString('hex')}:${encrypted}`;
    } catch (error) {
      throw new Error(`File encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Decrypt file content and return content with metadata
   */
  decryptFileContent(encryptedFileData: string): { content: string; metadata: Record<string, any>; timestamp: string; version: string } {
    try {
      if (!encryptedFileData.startsWith('FILE:')) {
        throw new Error('Invalid encrypted file format');
      }

      const [, ivHex, encrypted] = encryptedFileData.split(':');
      
      if (!ivHex || !encrypted) {
        throw new Error('Invalid encrypted file data format');
      }
      
      const iv = Buffer.from(ivHex, 'hex');
      const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      const fileData = JSON.parse(decrypted);
      
      if (!fileData.content) {
        throw new Error('Invalid file data structure');
      }
      
      return {
        content: fileData.content,
        metadata: fileData.metadata || {},
        timestamp: fileData.timestamp,
        version: fileData.version
      };
    } catch (error) {
      throw new Error(`File decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Encrypt NACHA file content with transaction metadata
   */
  encryptNACHAFile(nachaContent: string, transactionIds: string[], effectiveDate: Date): string {
    const metadata = {
      type: 'NACHA',
      transactionIds,
      effectiveDate: effectiveDate.toISOString(),
      recordCount: nachaContent.split('\n').length,
      checksum: this.hash(nachaContent)
    };
    
    return this.encryptFileContent(nachaContent, metadata);
  }

  /**
   * Decrypt NACHA file and validate integrity
   */
  decryptNACHAFile(encryptedNACHAData: string): { content: string; metadata: any; isValid: boolean } {
    const decrypted = this.decryptFileContent(encryptedNACHAData);
    
    // Validate checksum
    const expectedChecksum = this.hash(decrypted.content);
    const isValid = decrypted.metadata.checksum === expectedChecksum;
    
    return {
      content: decrypted.content,
      metadata: decrypted.metadata,
      isValid
    };
  }
}
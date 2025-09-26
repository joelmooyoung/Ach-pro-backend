import { NACHAService } from './src/services/nachaService';
import { EncryptionService } from './src/services/encryptionService';
import { ACHTransaction, TransactionStatus } from './src/types';

// Debug test to see what's actually generated
const mockConfig = {
  immediateDestination: '123456789',
  immediateOrigin: '987654321',
  companyName: 'TEST COMPANY',
  companyId: '1234567890',
  originatingDFI: '987654321'
};

const mockTransaction: ACHTransaction = {
  id: 'tx-123',
  drRoutingNumber: '123456789',
  drAccountNumber: '1234567890',
  drId: 'DR001',
  drName: 'John Doe',
  crRoutingNumber: '987654321',
  crAccountNumber: '0987654321',
  crId: 'CR001',
  crName: 'Jane Smith',
  amount: 100.00,
  effectiveDate: new Date('2024-09-17'),
  createdAt: new Date(),
  updatedAt: new Date(),
  status: TransactionStatus.PENDING
};

const encryptionService = new EncryptionService('test-key');
const nachaService = new NACHAService(mockConfig, encryptionService);

try {
  const nachaFile = nachaService.generateNACHAFile([mockTransaction], new Date('2024-09-17'), 'DR', false);
  console.log('Generated NACHA file content:');
  console.log(nachaFile.content);

  const lines = nachaFile.content.split('\n');
  console.log('\nLine analysis:');
  lines.forEach((line, index) => {
    if (line.trim()) {
      console.log(`Line ${index + 1} (${line.length} chars): ${line.substring(0, 20)}...`);
      if (index === 0) {
        console.log(`  File Header breakdown:`);
        console.log(`  - Record Type: '${line.substring(0, 1)}'`);
        console.log(`  - Priority Code: '${line.substring(1, 3)}'`);
        console.log(`  - Immediate Dest: '${line.substring(3, 13)}'`);
        console.log(`  - Immediate Origin: '${line.substring(13, 23)}'`);
      }
      if (index === 1) {
        console.log(`  Batch Header breakdown:`);
        console.log(`  - Record Type: '${line.substring(0, 1)}'`);
        console.log(`  - Service Class: '${line.substring(1, 4)}'`);
        console.log(`  - Company Name: '${line.substring(4, 20)}'`);
      }
      if (line.startsWith('6')) {
        console.log(`  Entry Detail breakdown:`);
        console.log(`  - Record Type: '${line.substring(0, 1)}'`);
        console.log(`  - Transaction Code: '${line.substring(1, 3)}'`);
        console.log(`  - Amount: '${line.substring(30, 40)}'`);
      }
    }
  });
} catch (error) {
  console.error('Error:', error);
}
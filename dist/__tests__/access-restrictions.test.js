"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
// Set up test environment variables
process.env.JWT_SECRET = 'test-secret';
process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
process.env.ENCRYPTION_KEY = 'test-encryption-key-32-chars-long';
process.env.ACH_IMMEDIATE_DESTINATION = '123456789';
process.env.ACH_IMMEDIATE_ORIGIN = '987654321';
process.env.ACH_COMPANY_NAME = 'Test Company';
process.env.ACH_COMPANY_ID = 'TEST123';
// Import app after setting environment variables
const index_1 = __importDefault(require("../index"));
// Helper function to create JWT tokens for testing
const createTestToken = (userId, email, role) => {
    return jsonwebtoken_1.default.sign({ userId, email, role }, process.env.JWT_SECRET, { expiresIn: '1h' });
};
describe('API Access Restrictions', () => {
    describe('Organization Role Access Tests', () => {
        const organizationToken = createTestToken('org-1', 'org@test.com', types_1.UserRole.ORGANIZATION);
        const adminToken = createTestToken('admin-1', 'admin@test.com', types_1.UserRole.ADMIN);
        const operatorToken = createTestToken('operator-1', 'operator@test.com', types_1.UserRole.OPERATOR);
        describe('Transaction API Access', () => {
            it('should deny organizations access to view all transactions', async () => {
                const response = await (0, supertest_1.default)(index_1.default)
                    .get('/api/transactions')
                    .set('Authorization', `Bearer ${organizationToken}`);
                expect(response.status).toBe(403);
                expect(response.body.success).toBe(false);
                expect(response.body.error).toBe('Insufficient permissions.');
            });
            it('should deny organizations access to view specific transactions', async () => {
                const response = await (0, supertest_1.default)(index_1.default)
                    .get('/api/transactions/test-id')
                    .set('Authorization', `Bearer ${organizationToken}`);
                expect(response.status).toBe(403);
                expect(response.body.success).toBe(false);
                expect(response.body.error).toBe('Insufficient permissions.');
            });
            it('should deny organizations access to transaction statistics', async () => {
                const response = await (0, supertest_1.default)(index_1.default)
                    .get('/api/transactions/stats/summary')
                    .set('Authorization', `Bearer ${organizationToken}`);
                expect(response.status).toBe(403);
                expect(response.body.success).toBe(false);
                expect(response.body.error).toBe('Insufficient permissions.');
            });
            it('should deny organizations access to update transaction status', async () => {
                const response = await (0, supertest_1.default)(index_1.default)
                    .patch('/api/transactions/test-id/status')
                    .set('Authorization', `Bearer ${organizationToken}`)
                    .send({ status: 'processed' });
                expect(response.status).toBe(403);
                expect(response.body.success).toBe(false);
                expect(response.body.error).toBe('Insufficient permissions.');
            });
            it('should allow admin users access to transaction endpoints', async () => {
                // Test viewing all transactions
                const listResponse = await (0, supertest_1.default)(index_1.default)
                    .get('/api/transactions')
                    .set('Authorization', `Bearer ${adminToken}`);
                // Should not get 403 (may get 500 due to missing database connection, but that's OK for access control testing)
                expect(listResponse.status).not.toBe(403);
            });
            it('should allow operator users access to transaction endpoints', async () => {
                // Test viewing all transactions
                const listResponse = await (0, supertest_1.default)(index_1.default)
                    .get('/api/transactions')
                    .set('Authorization', `Bearer ${operatorToken}`);
                // Should not get 403 (may get 500 due to missing database connection, but that's OK for access control testing)
                expect(listResponse.status).not.toBe(403);
            });
        });
        describe('NACHA API Access', () => {
            it('should deny organizations access to NACHA file generation', async () => {
                const response = await (0, supertest_1.default)(index_1.default)
                    .post('/api/nacha/generate')
                    .set('Authorization', `Bearer ${organizationToken}`)
                    .send({
                    effectiveDate: new Date().toISOString(),
                    fileType: 'DR'
                });
                expect(response.status).toBe(403);
                expect(response.body.success).toBe(false);
                expect(response.body.error).toBe('Insufficient permissions.');
            });
            it('should deny organizations access to NACHA files list', async () => {
                const response = await (0, supertest_1.default)(index_1.default)
                    .get('/api/nacha/files')
                    .set('Authorization', `Bearer ${organizationToken}`);
                expect(response.status).toBe(403);
                expect(response.body.success).toBe(false);
                expect(response.body.error).toBe('Insufficient permissions.');
            });
            it('should deny organizations access to NACHA file download', async () => {
                const response = await (0, supertest_1.default)(index_1.default)
                    .get('/api/nacha/files/test-id/download')
                    .set('Authorization', `Bearer ${organizationToken}`);
                expect(response.status).toBe(403);
                expect(response.body.success).toBe(false);
                expect(response.body.error).toBe('Insufficient permissions.');
            });
            it('should allow admin users access to NACHA APIs', async () => {
                const response = await (0, supertest_1.default)(index_1.default)
                    .get('/api/nacha/files')
                    .set('Authorization', `Bearer ${adminToken}`);
                // Should not get 403 (may get 500 due to missing database connection, but that's OK for access control testing)
                expect(response.status).not.toBe(403);
            });
        });
        describe('Holidays API Access', () => {
            it('should deny organizations access to federal holidays', async () => {
                const response = await (0, supertest_1.default)(index_1.default)
                    .get('/api/holidays')
                    .set('Authorization', `Bearer ${organizationToken}`);
                expect(response.status).toBe(403);
                expect(response.body.success).toBe(false);
                expect(response.body.error).toBe('Insufficient permissions.');
            });
            it('should deny organizations access to business day calculations', async () => {
                const response = await (0, supertest_1.default)(index_1.default)
                    .get('/api/holidays/business-day/check/2024-01-01')
                    .set('Authorization', `Bearer ${organizationToken}`);
                expect(response.status).toBe(403);
                expect(response.body.success).toBe(false);
                expect(response.body.error).toBe('Insufficient permissions.');
            });
            it('should allow admin users access to holidays APIs', async () => {
                const response = await (0, supertest_1.default)(index_1.default)
                    .get('/api/holidays')
                    .set('Authorization', `Bearer ${adminToken}`);
                // Should not get 403 (may get 500 due to missing database connection, but that's OK for access control testing)
                expect(response.status).not.toBe(403);
            });
        });
        describe('Config API Access', () => {
            it('should deny organizations access to system config', async () => {
                const response = await (0, supertest_1.default)(index_1.default)
                    .get('/api/config')
                    .set('Authorization', `Bearer ${organizationToken}`);
                expect(response.status).toBe(403);
                expect(response.body.success).toBe(false);
                expect(response.body.error).toBe('Insufficient permissions.');
            });
            it('should deny organizations access to SFTP settings', async () => {
                const response = await (0, supertest_1.default)(index_1.default)
                    .get('/api/config/sftp/settings')
                    .set('Authorization', `Bearer ${organizationToken}`);
                expect(response.status).toBe(403);
                expect(response.body.success).toBe(false);
                expect(response.body.error).toBe('Insufficient permissions.');
            });
            it('should allow admin users access to config APIs', async () => {
                const response = await (0, supertest_1.default)(index_1.default)
                    .get('/api/config')
                    .set('Authorization', `Bearer ${adminToken}`);
                // Should not get 403 (may get 500 due to missing database connection, but that's OK for access control testing)
                expect(response.status).not.toBe(403);
            });
        });
        describe('Auth API Access', () => {
            it('should allow organizations to access their profile', async () => {
                const response = await (0, supertest_1.default)(index_1.default)
                    .get('/api/auth/profile')
                    .set('Authorization', `Bearer ${organizationToken}`);
                // Should not get 403 (may get 500 due to missing database connection, but that's OK for access control testing)
                expect(response.status).not.toBe(403);
            });
        });
        describe('No Token Access', () => {
            it('should deny access without authentication token', async () => {
                const response = await (0, supertest_1.default)(index_1.default)
                    .get('/api/transactions');
                expect(response.status).toBe(401);
                expect(response.body.success).toBe(false);
                expect(response.body.error).toBe('Access denied. No token provided.');
            });
        });
        describe('Invalid Token Access', () => {
            it('should deny access with invalid token', async () => {
                const response = await (0, supertest_1.default)(index_1.default)
                    .get('/api/transactions')
                    .set('Authorization', 'Bearer invalid-token');
                expect(response.status).toBe(401);
                expect(response.body.success).toBe(false);
                expect(response.body.error).toBe('Invalid token.');
            });
        });
    });
});
//# sourceMappingURL=access-restrictions.test.js.map
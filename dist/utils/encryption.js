"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EncryptionService = void 0;
const crypto_js_1 = __importDefault(require("crypto-js"));
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
if (!ENCRYPTION_KEY) {
    throw new Error('ENCRYPTION_KEY environment variable is required');
}
class EncryptionService {
    static encrypt(text) {
        try {
            const encrypted = crypto_js_1.default.AES.encrypt(text, this.key).toString();
            return encrypted;
        }
        catch (error) {
            throw new Error('Encryption failed');
        }
    }
    static decrypt(encryptedText) {
        try {
            const decrypted = crypto_js_1.default.AES.decrypt(encryptedText, this.key);
            return decrypted.toString(crypto_js_1.default.enc.Utf8);
        }
        catch (error) {
            throw new Error('Decryption failed');
        }
    }
    static hashSensitiveData(data) {
        return crypto_js_1.default.SHA256(data).toString();
    }
}
exports.EncryptionService = EncryptionService;
EncryptionService.key = ENCRYPTION_KEY;
//# sourceMappingURL=encryption.js.map
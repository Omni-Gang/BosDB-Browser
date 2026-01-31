"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CredentialEncryption = void 0;
exports.getEncryptionInstance = getEncryptionInstance;
exports.encryptCredentials = encryptCredentials;
exports.decryptCredentials = decryptCredentials;
const crypto_1 = __importDefault(require("crypto"));
const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const TAG_LENGTH = 16;
const SALT = 'bosdb-salt-v1'; // In production, use a secure random salt
/**
 * Credential encryption service using AES-256-GCM
 * Provides authenticated encryption for sensitive database credentials
 */
class CredentialEncryption {
    constructor(masterKey) {
        // In production, this should come from environment variable or secret manager
        const keySource = masterKey || process.env.ENCRYPTION_MASTER_KEY;
        if (!keySource) {
            throw new Error('Encryption master key not configured. Set ENCRYPTION_MASTER_KEY environment variable.');
        }
        // Derive encryption key from master key using scrypt
        this.key = crypto_1.default.scryptSync(keySource, SALT, KEY_LENGTH);
    }
    /**
     * Encrypt credentials data
     * @param data Credentials object to encrypt
     * @returns Base64-encoded encrypted string
     */
    encrypt(data) {
        const iv = crypto_1.default.randomBytes(IV_LENGTH);
        const cipher = crypto_1.default.createCipheriv(ALGORITHM, this.key, iv);
        const plaintext = JSON.stringify(data);
        let encrypted = cipher.update(plaintext, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        const tag = cipher.getAuthTag();
        // Combine IV + encrypted data + auth tag
        const combined = Buffer.concat([iv, Buffer.from(encrypted, 'hex'), tag]);
        return combined.toString('base64');
    }
    /**
     * Decrypt credentials data
     * @param encryptedData Base64-encoded encrypted string
     * @returns Decrypted credentials object
     */
    decrypt(encryptedData) {
        try {
            const buffer = Buffer.from(encryptedData, 'base64');
            const iv = buffer.subarray(0, IV_LENGTH);
            const tag = buffer.subarray(buffer.length - TAG_LENGTH);
            const encrypted = buffer.subarray(IV_LENGTH, buffer.length - TAG_LENGTH);
            const decipher = crypto_1.default.createDecipheriv(ALGORITHM, this.key, iv);
            decipher.setAuthTag(tag);
            let decrypted = decipher.update(encrypted);
            decrypted = Buffer.concat([decrypted, decipher.final()]);
            return JSON.parse(decrypted.toString('utf8'));
        }
        catch (error) {
            throw new Error(`Decryption failed: ${error.message}`);
        }
    }
    /**
     * Hash a password or sensitive string (one-way)
     * @param value Value to hash
     * @returns Hex-encoded hash
     */
    hash(value) {
        return crypto_1.default.createHash('sha256').update(value).digest('hex');
    }
    /**
     * Generate a secure random token
     * @param length Token length in bytes (default: 32)
     * @returns Hex-encoded random token
     */
    static generateToken(length = 32) {
        return crypto_1.default.randomBytes(length).toString('hex');
    }
}
exports.CredentialEncryption = CredentialEncryption;
/**
 * Helper functions for credential encryption
 */
let encryptionInstance = null;
function getEncryptionInstance() {
    if (!encryptionInstance) {
        encryptionInstance = new CredentialEncryption();
    }
    return encryptionInstance;
}
function encryptCredentials(credentials) {
    return getEncryptionInstance().encrypt(credentials);
}
function decryptCredentials(encryptedData) {
    return getEncryptionInstance().decrypt(encryptedData);
}
//# sourceMappingURL=encryption.js.map
/**
 * Credential encryption service using AES-256-GCM
 * Provides authenticated encryption for sensitive database credentials
 */
export declare class CredentialEncryption {
    private key;
    constructor(masterKey?: string);
    /**
     * Encrypt credentials data
     * @param data Credentials object to encrypt
     * @returns Base64-encoded encrypted string
     */
    encrypt(data: any): string;
    /**
     * Decrypt credentials data
     * @param encryptedData Base64-encoded encrypted string
     * @returns Decrypted credentials object
     */
    decrypt(encryptedData: string): any;
    /**
     * Hash a password or sensitive string (one-way)
     * @param value Value to hash
     * @returns Hex-encoded hash
     */
    hash(value: string): string;
    /**
     * Generate a secure random token
     * @param length Token length in bytes (default: 32)
     * @returns Hex-encoded random token
     */
    static generateToken(length?: number): string;
}
export declare function getEncryptionInstance(): CredentialEncryption;
export declare function encryptCredentials(credentials: any): string;
export declare function decryptCredentials(encryptedData: string): any;
//# sourceMappingURL=encryption.d.ts.map
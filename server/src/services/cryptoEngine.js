import crypto from 'node:crypto';
import { config } from '../config/env.js';

// Ensure 32-byte master key buffer from hex string
function getMasterKeyBuffer() {
    let keyHex = config.masterEncryptionKey;
    if (!keyHex || keyHex.length < 64) {
        // Fallback for development if not configured
        keyHex = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
    }
    return Buffer.from(keyHex.substring(0, 64), 'hex');
}

/**
 * Envelope Encryption Engine
 * Architecture:
 *  - Each document has a unique, random 256-bit Data Encryption Key (DEK).
 *  - The file payload is encrypted with the DEK using AES-256-GCM.
 *  - The DEK itself is encrypted (wrapped) with the server's Master Key using AES-256-GCM.
 *  - Stored in DB: encrypted_data_key, encryption_iv, and GCM auth tags.
 */
export const cryptoEngine = {
    /**
     * Encrypt a file buffer using envelope encryption
     * @param {Buffer} fileBuffer Raw file bytes
     * @returns {{ ciphertext: Buffer, encryptedDataKey: string, encryptionIv: string }}
     */
    encryptFile(fileBuffer) {
        const masterKey = getMasterKeyBuffer();

        // 1. Generate unique per-file Data Encryption Key (DEK, 32 bytes)
        const dek = crypto.randomBytes(32);

        // 2. Encrypt file payload with DEK using AES-256-GCM
        const fileIv = crypto.randomBytes(12); // Standard 96-bit IV for GCM
        const fileCipher = crypto.createCipheriv('aes-256-gcm', dek, fileIv);
        const encryptedFile = Buffer.concat([fileCipher.update(fileBuffer), fileCipher.final()]);
        const fileTag = fileCipher.getAuthTag();

        // Combined payload: fileIv (12 bytes) + fileTag (16 bytes) + encryptedFile
        const payloadWithHeader = Buffer.concat([fileIv, fileTag, encryptedFile]);

        // 3. Wrap DEK with Master Key using AES-256-GCM
        const keyIv = crypto.randomBytes(12);
        const keyCipher = crypto.createCipheriv('aes-256-gcm', masterKey, keyIv);
        const wrappedDek = Buffer.concat([keyCipher.update(dek), keyCipher.final()]);
        const keyTag = keyCipher.getAuthTag();

        // Pack wrapped key: keyIv (12) + keyTag (16) + wrappedDek (32)
        const packedWrappedKey = Buffer.concat([keyIv, keyTag, wrappedDek]).toString('base64');

        return {
            ciphertext: payloadWithHeader,
            encryptedDataKey: packedWrappedKey,
            encryptionIv: fileIv.toString('hex')
        };
    },

    /**
     * Decrypt an encrypted file buffer using wrapped DEK
     * @param {Buffer} packedCiphertext Combined IV + Tag + Encrypted payload
     * @param {string} packedWrappedKey Base64 encoded wrapped DEK
     * @returns {Buffer} Decrypted raw file buffer
     */
    decryptFile(packedCiphertext, packedWrappedKey) {
        const masterKey = getMasterKeyBuffer();

        // 1. Unwrap DEK with Master Key
        const wrappedBuffer = Buffer.from(packedWrappedKey, 'base64');
        const keyIv = wrappedBuffer.subarray(0, 12);
        const keyTag = wrappedBuffer.subarray(12, 28);
        const wrappedDek = wrappedBuffer.subarray(28);

        const keyDecipher = crypto.createDecipheriv('aes-256-gcm', masterKey, keyIv);
        keyDecipher.setAuthTag(keyTag);
        const dek = Buffer.concat([keyDecipher.update(wrappedDek), keyDecipher.final()]);

        // 2. Decrypt file payload with unwrapped DEK
        const fileIv = packedCiphertext.subarray(0, 12);
        const fileTag = packedCiphertext.subarray(12, 28);
        const encryptedFile = packedCiphertext.subarray(28);

        const fileDecipher = crypto.createDecipheriv('aes-256-gcm', dek, fileIv);
        fileDecipher.setAuthTag(fileTag);
        const decryptedFile = Buffer.concat([fileDecipher.update(encryptedFile), fileDecipher.final()]);

        return decryptedFile;
    }
};

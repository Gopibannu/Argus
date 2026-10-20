import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from '../config/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LOCAL_STORAGE_DIR = path.resolve(__dirname, '../../../data/storage');

// Ensure local private storage folder exists
if (!fs.existsSync(LOCAL_STORAGE_DIR)) {
    fs.mkdirSync(LOCAL_STORAGE_DIR, { recursive: true });
}

export const storageService = {
    /**
     * Save an encrypted file blob
     * Files are ALWAYS encrypted before reaching this layer
     * @param {string} storageKey UUID key
     * @param {Buffer} encryptedBuffer Encrypted ciphertext
     */
    async saveEncryptedFile(storageKey, encryptedBuffer) {
        // If Supabase Storage is configured in production:
        if (config.supabaseUrl && config.supabaseServiceRoleKey) {
            try {
                const endpoint = `${config.supabaseUrl}/storage/v1/object/${config.supabaseStorageBucket}/${storageKey}`;
                const res = await fetch(endpoint, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${config.supabaseServiceRoleKey}`,
                        'Content-Type': 'application/octet-stream',
                        'x-upsert': 'true'
                    },
                    body: encryptedBuffer
                });

                if (res.ok) {
                    return storageKey;
                }
                console.warn(`[Supabase Storage] Upload failed (${res.status}), falling back to secure local store.`);
            } catch (err) {
                console.warn('[Supabase Storage] Network error, falling back to secure local store:', err.message);
            }
        }

        // Secure private local store fallback
        const filePath = path.join(LOCAL_STORAGE_DIR, storageKey);
        fs.writeFileSync(filePath, encryptedBuffer);
        return storageKey;
    },

    /**
     * Retrieve an encrypted file blob
     * @param {string} storageKey UUID key
     * @returns {Promise<Buffer>} Encrypted ciphertext
     */
    async getEncryptedFile(storageKey) {
        if (config.supabaseUrl && config.supabaseServiceRoleKey) {
            try {
                const endpoint = `${config.supabaseUrl}/storage/v1/object/${config.supabaseStorageBucket}/${storageKey}`;
                const res = await fetch(endpoint, {
                    headers: {
                        'Authorization': `Bearer ${config.supabaseServiceRoleKey}`
                    }
                });

                if (res.ok) {
                    const arrayBuf = await res.arrayBuffer();
                    return Buffer.from(arrayBuf);
                }
            } catch (err) {
                console.warn('[Supabase Storage] Fetch error, checking local store:', err.message);
            }
        }

        // Local store fallback
        const filePath = path.join(LOCAL_STORAGE_DIR, storageKey);
        if (!fs.existsSync(filePath)) {
            const err = new Error('Physical storage payload not found.');
            err.status = 404;
            throw err;
        }
        return fs.readFileSync(filePath);
    },

    /**
     * Delete an encrypted file blob
     * @param {string} storageKey UUID key
     */
    async deleteEncryptedFile(storageKey) {
        if (config.supabaseUrl && config.supabaseServiceRoleKey) {
            try {
                const endpoint = `${config.supabaseUrl}/storage/v1/object/${config.supabaseStorageBucket}/${storageKey}`;
                await fetch(endpoint, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${config.supabaseServiceRoleKey}` }
                });
            } catch (err) {
                console.warn('[Supabase Storage] Delete error:', err.message);
            }
        }

        const filePath = path.join(LOCAL_STORAGE_DIR, storageKey);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    }
};

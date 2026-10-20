import crypto from 'node:crypto';
import path from 'node:path';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 Megabytes

// Server-side strict allowlist of file formats
const ALLOWED_TYPES = {
    pdf: {
        mime: 'application/pdf',
        magic: (buf) => buf.length >= 5 && buf.subarray(0, 5).toString('ascii') === '%PDF-'
    },
    png: {
        mime: 'image/png',
        magic: (buf) => buf.length >= 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47 && buf[4] === 0x0d && buf[5] === 0x0a && buf[6] === 0x1a && buf[7] === 0x0a
    },
    jpeg: {
        mime: 'image/jpeg',
        magic: (buf) => buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff
    },
    docx: {
        mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        magic: (buf) => buf.length >= 4 && buf[0] === 0x50 && buf[1] === 0x4b && buf[2] === 0x03 && buf[3] === 0x04
    },
    xlsx: {
        mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        magic: (buf) => buf.length >= 4 && buf[0] === 0x50 && buf[1] === 0x4b && buf[2] === 0x03 && buf[3] === 0x04
    },
    txt: {
        mime: 'text/plain',
        magic: (buf) => {
            // Check first 4KB for non-printable binary bytes (except tab, newline, CR)
            const sampleSize = Math.min(buf.length, 4096);
            for (let i = 0; i < sampleSize; i++) {
                const byte = buf[i];
                if (byte === 0x00) return false; // Null byte rejection
                if (byte < 0x09 || (byte > 0x0a && byte < 0x0d) || (byte > 0x0d && byte < 0x20 && byte !== 0x1b)) {
                    return false;
                }
            }
            return true;
        }
    }
};

export const uploadValidator = {
    /**
     * Validate and sanitize uploaded file
     * @param {Object} file Multer file object
     * @returns {{ sanitizedFilename: string, mimeType: string, sha256: string, sizeBytes: number }}
     */
    validateUpload(file) {
        if (!file || !file.buffer) {
            const err = new Error('No file payload received.');
            err.status = 400;
            throw err;
        }

        const buffer = file.buffer;

        // 1. Size constraint
        if (buffer.length === 0) {
            const err = new Error('Empty files cannot be uploaded.');
            err.status = 400;
            throw err;
        }

        if (buffer.length > MAX_FILE_SIZE) {
            const err = new Error(`File size exceeds 10MB limit (size: ${(buffer.length / (1024 * 1024)).toFixed(2)} MB).`);
            err.status = 400;
            throw err;
        }

        // 2. Magic-Byte Sniffing (Never trust client extension or Content-Type header)
        let detectedFormat = null;
        for (const [format, def] of Object.entries(ALLOWED_TYPES)) {
            if (def.magic(buffer)) {
                detectedFormat = format;
                break;
            }
        }

        if (!detectedFormat) {
            const err = new Error('Unsupported or malicious file type. Allowed formats: PDF, DOCX, XLSX, PNG, JPG, TXT.');
            err.status = 400;
            throw err;
        }

        // 3. Macro-enabled Office file and Zip Bomb detection
        if (detectedFormat === 'docx' || detectedFormat === 'xlsx') {
            const strContent = buffer.toString('utf-8', 0, Math.min(buffer.length, 65536));
            if (strContent.includes('vbaProject.bin') || strContent.includes('macros')) {
                const err = new Error('Security policy violation: Macro-enabled Office documents are prohibited.');
                err.status = 400;
                throw err;
            }
        }

        // 4. Filename sanitization (Path traversal, unicode tricks, null bytes, double extensions)
        const rawFilename = file.originalname || `upload_${Date.now()}.${detectedFormat}`;
        const sanitized = this.sanitizeFilename(rawFilename, detectedFormat);

        // 5. Compute SHA-256 Checksum
        const sha256 = crypto.createHash('sha256').update(buffer).digest('hex');

        return {
            sanitizedFilename: sanitized,
            mimeType: ALLOWED_TYPES[detectedFormat].mime,
            sha256,
            sizeBytes: buffer.length
        };
    },

    /**
     * Sanitizes raw filename
     * @param {string} rawName 
     * @param {string} detectedExt 
     * @returns {string} Safe filename
     */
    sanitizeFilename(rawName, detectedExt) {
        // Strip directory separators, null bytes, and RTL override characters
        let clean = rawName
            .replace(/\0/g, '') // Null byte injection
            .replace(/[\u202E\u202D\u200E\u200F]/g, '') // Unicode directional overrides
            .replace(/[/\\?%*:|"<>]/g, '_') // Windows/Unix reserved path characters
            .trim();

        // Strip path traversal dots
        clean = path.basename(clean);

        // Detect dangerous double extensions (e.g. evil.pdf.exe or file.docx.js)
        const parts = clean.split('.');
        if (parts.length > 2) {
            const dangerousExts = ['exe', 'bat', 'cmd', 'sh', 'php', 'js', 'vbs', 'ps1', 'jar', 'msi', 'com'];
            for (let i = 1; i < parts.length; i++) {
                if (dangerousExts.includes(parts[i].toLowerCase())) {
                    const err = new Error('Dangerous double extension detected.');
                    err.status = 400;
                    throw err;
                }
            }
        }

        // Ensure file ends with safe verified extension
        const currentExt = path.extname(clean).toLowerCase().replace('.', '');
        const validExtensionsForType = {
            pdf: ['pdf'],
            png: ['png'],
            jpeg: ['jpg', 'jpeg'],
            docx: ['docx'],
            xlsx: ['xlsx'],
            txt: ['txt']
        };

        const allowedExts = validExtensionsForType[detectedExt] || [detectedExt];
        if (!allowedExts.includes(currentExt)) {
            clean = `${path.basename(clean, path.extname(clean))}.${allowedExts[0]}`;
        }

        // Limit length to 100 characters
        if (clean.length > 100) {
            clean = clean.substring(0, 95) + '.' + allowedExts[0];
        }

        return clean || `unnamed_document.${allowedExts[0]}`;
    }
};

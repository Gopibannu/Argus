import dotenv from 'dotenv';
dotenv.config();

export const config = {
    port: parseInt(process.env.PORT || '5000', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
    databaseUrl: process.env.DATABASE_URL || '',
    sessionSecret: process.env.SESSION_SECRET || 'default_dev_session_secret_change_in_prod_1234567890',
    masterEncryptionKey: process.env.MASTER_ENCRYPTION_KEY || '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
    supabaseUrl: process.env.SUPABASE_URL || '',
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    supabaseStorageBucket: process.env.SUPABASE_STORAGE_BUCKET || 'documents',
    geminiApiKey: process.env.GEMINI_API_KEY || '',
    isProduction: process.env.NODE_ENV === 'production',
    isTest: process.env.NODE_ENV === 'test'
};

// Fail fast in production if critical secrets are default or missing
if (config.isProduction) {
    const missing = [];
    if (!config.databaseUrl) missing.push('DATABASE_URL');
    if (!process.env.SESSION_SECRET) missing.push('SESSION_SECRET');
    if (!process.env.MASTER_ENCRYPTION_KEY || process.env.MASTER_ENCRYPTION_KEY.length < 64) {
        missing.push('MASTER_ENCRYPTION_KEY (must be 64 hex characters)');
    }
    if (missing.length > 0) {
        console.error(`❌ [Config Error] Missing or invalid production environment variables: ${missing.join(', ')}`);
        process.exit(1);
    }
}

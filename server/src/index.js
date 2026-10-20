import { createApp } from './app.js';
import { config } from './config/env.js';

const app = createApp();

const server = app.listen(config.port, () => {
    console.log(`🛡️  [Argus Security Core] Server listening on port ${config.port} (env: ${config.nodeEnv})`);
    console.log(`📡 [Health Check] Available at http://localhost:${config.port}/api/health`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    server.close(() => {
        console.log('HTTP server closed');
    });
});

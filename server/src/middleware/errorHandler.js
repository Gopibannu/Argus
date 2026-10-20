export function errorHandler(err, req, res, next) {
    const status = err.status || 500;

    // Only log 500 crashes as internal server errors
    if (status >= 500) {
        console.error(`❌ [Internal Error 500] ${req.method} ${req.url}:`, {
            message: err.message,
            code: err.code,
            stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
        });
    } else if (process.env.NODE_ENV === 'development') {
        // Subtle debug log for 4xx client rejections
        console.log(`🛡️  [Security Rejection ${status}] ${req.method} ${req.url}: ${err.message}`);
    }

    if (res.headersSent) {
        return next(err);
    }

    // Never leak stack trace or internal error objects in production
    const response = {
        error: status === 500 ? 'An internal server error occurred.' : err.message
    };

    res.status(status).json(response);
}

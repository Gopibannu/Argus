export function errorHandler(err, req, res, next) {
    const status = err.status || 500;

    // Log 500 crashes so deployment logs immediately show root cause
    if (status >= 500) {
        console.error(`❌ [Internal Error 500] ${req.method} ${req.url}:`, err.message, err.stack);
    } else {
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

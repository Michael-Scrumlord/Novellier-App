export const asyncHandler = (fn) => (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next);

// Sanitizing error middleware.
//
// Goals:
//   - Never leak stack traces or internal error messages on 5xx responses in
//     production. Developers still get full detail in NODE_ENV=development.
//   - Preserve developer-meaningful 4xx messages (validation errors, "not
//     found", etc.) so the client can render them.
//   - Always log the full error server-side for diagnostics.
export const errorMiddleware = (err, _req, res, _next) => {
    console.error('Unhandled error:', err);
    const status = err.statusCode || 500;
    const isProd = process.env.NODE_ENV === 'production';

    let safeMessage;
    if (status < 500) {
        // 4xx errors usually carry actionable information for the client
        // (validation messages, "not found", etc.). Pass them through.
        safeMessage = err.message || 'Bad request';
    } else if (isProd) {
        safeMessage = 'Internal server error';
    } else {
        // Dev: surface the original message but never the stack.
        safeMessage = err.message || 'Internal server error';
    }

    res.status(status).json({ error: safeMessage });
};

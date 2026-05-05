export const asyncHandler = (fn) => (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next);

export const errorMiddleware = (err, _req, res, _next) => {
    console.error('Unhandled error:', err);
    const status = err.statusCode || 500;
    res.status(status).json({ error: err.message || 'Internal server error' });
};
import jwt from 'jsonwebtoken';

export const createAuthMiddleware = ({ jwtSecret } = {}) => {
    const secret = jwtSecret;

    return (req, res, next) => {
        const header = req.headers.authorization || '';
        const token = header.startsWith('Bearer ') ? header.slice(7) : null;

        if (!token) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        try {
            req.user = jwt.verify(token, secret);
            return next();
        } catch (error) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
    };
};

export const requireRole = (...roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        return next();
    };
};

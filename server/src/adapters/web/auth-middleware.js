import jwt from 'jsonwebtoken';

export const createAuthMiddleware = ({ jwtSecret, tokenBlocklist } = {}) => {
    const secret = jwtSecret;

    return async (req, res, next) => {
        const header = req.headers.authorization || '';
        const token = header.startsWith('Bearer ') ? header.slice(7) : null;

        if (!token) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        let decoded;
        try {
            decoded = jwt.verify(token, secret);
        } catch (_error) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        // Reject revoked tokens. The blocklist is keyed by `jti` so it survives
        // server restarts (MongoTokenBlocklist) and works across multiple
        // server instances if you scale out.
        if (tokenBlocklist && decoded?.jti) {
            try {
                if (await tokenBlocklist.has(decoded.jti)) {
                    return res.status(401).json({ error: 'Unauthorized' });
                }
            } catch (error) {
                // Fail-closed: if we can't check the blocklist (db down), do not
                // accept the token. Better to log users out briefly than to honor
                // a revoked credential.
                console.warn('[auth-middleware] Blocklist check failed:', error.message);
                return res.status(503).json({ error: 'Authentication service unavailable' });
            }
        }

        req.user = decoded;
        return next();
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

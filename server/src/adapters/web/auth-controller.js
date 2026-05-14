import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { LoginSchema, validate } from './validation.js';

export default class AuthController {
    constructor({ userService, jwtSecret, jwtExpiration = '24h', tokenBlocklist }) {
        if (!userService) {
            throw new Error('AuthController requires userService');
        }

        this.userService = userService;
        this.jwtSecret = jwtSecret;
        this.jwtExpiration = jwtExpiration;
        this.tokenBlocklist = tokenBlocklist;
    }

    async login(req, res) {
        const data = validate(LoginSchema, req.body, res);
        if (!data) return;
        const { username, password } = data;

        const user = await this.userService.verifyPassword(username, password);
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Issue a unique jti so the token can be revoked via the persistent
        // blocklist without invalidating every other user's session.
        const jti = crypto.randomUUID();
        const token = jwt.sign(
            { sub: user.id, username: user.username, role: user.role, jti },
            this.jwtSecret,
            { expiresIn: this.jwtExpiration }
        );

        // Lightweight audit log — username/id only, no token material.
        console.log(`[auth] login user=${user.username} id=${user.id} role=${user.role}`);

        return res.json({
            token,
            user: {
                id: user.id,
                username: user.username,
                firstName: user.firstName || '',
                lastName: user.lastName || '',
                email: user.email || '',
                profilePicture: user.profilePicture || null,
                uuid: user.uuid,
                role: user.role,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt,
            },
        });
    }

    async logout(req, res) {
        const header = req.headers.authorization || '';
        const token = header.startsWith('Bearer ') ? header.slice(7) : null;

        // Best-effort revocation: decode the token to extract jti + exp without
        // verifying the signature. We don't reject malformed tokens at logout —
        // we just won't record anything. Signature is irrelevant; we only need
        // the identifiers to record the revocation.
        if (token && this.tokenBlocklist) {
            try {
                const decoded = jwt.decode(token);
                if (decoded?.jti) {
                    // exp is seconds-since-epoch; convert to Date for the TTL index.
                    const expiresAt = decoded.exp
                        ? new Date(decoded.exp * 1000)
                        : new Date(Date.now() + 24 * 60 * 60 * 1000);
                    await this.tokenBlocklist.add(decoded.jti, expiresAt);
                }
            } catch (error) {
                console.warn('[auth-controller] Failed to record token revocation:', error.message);
                // Don't fail the logout — client should still discard the token locally.
            }
        }
        return res.json({ status: 'ok' });
    }
}

import jwt from 'jsonwebtoken';

export default class AuthController {
    constructor({ userService, jwtSecret }) {
        if (!userService) {
        throw new Error('AuthController requires userService');
        }

        this.userService = userService;
        this.jwtSecret = jwtSecret;
    }

    async login(req, res) {
        const { username, password } = req.body || {};

        if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
        }

        const user = await this.userService.verifyPassword(username, password);
        if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign(
        { sub: user.id, username: user.username, role: user.role },
        this.jwtSecret,
        { expiresIn: '2h' }
        );

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
            updatedAt: user.updatedAt
        }
        });
    }

    async logout(_req, res) {
        return res.json({ status: 'ok' });
    }
}

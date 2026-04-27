// UserController handles HTTP requests related to user management in the admin interface.
// It defines methods for listing users, retrieving a single user, creating a new user, updating an existing user, and deleting a user.
// Each method interacts with the userService to perform the necessary operations and sends back an appropriate JSON response.

export default class UserController {
    constructor({ userService }) {
        if (!userService) {
            throw new Error('UserController requires userService');
        }

        this.userService = userService;
    }

    async listUsers(_req, res) {
        const users = await this.userService.listUsers();
        return res.json({ users });
    }

    async getUser(req, res) {
        const user = await this.userService.getUserById(req.params.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        return res.json({ user });
    }

    async createUser(req, res) {
        const { username, password, role, firstName, lastName, email, profilePicture, uuid } =
            req.body || {};
        const user = await this.userService.createUser({
            username,
            password,
            role,
            firstName,
            lastName,
            email,
            profilePicture,
            uuid,
        });
        return res.status(201).json({ user });
    }

    async updateUser(req, res) {
        const user = await this.userService.updateUser(req.params.id, req.body || {});
        return res.json({ user });
    }

    async deleteUser(req, res) {
        await this.userService.deleteUser(req.params.id);
        return res.json({ status: 'deleted' });
    }
}

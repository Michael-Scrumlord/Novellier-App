import bcrypt from 'bcryptjs';

// Bcrypt cost factor. 12 (~250 ms per hash on modern CPUs) is the conservative
// default for 2026. Login frequency is low enough that the extra latency is
// invisible to users, and combined with the per-IP login rate limiter this
// makes online brute force economically infeasible.
const BCRYPT_COST = Number(process.env.BCRYPT_COST) || 12;

// This services handles user related operations such as creation, deletion, updating, and authentication.
// It relies on a userRepository for data persistence and retrieval.

export class UserService {
    constructor({ userRepository }) {
        if (!userRepository) {
            throw new Error('UserService requires userRepository');
        }

        this.userRepository = userRepository;
    }

    async createUser({
        username,
        password,
        role = 'user',
        firstName = '',
        lastName = '',
        email = '',
        profilePicture = null,
        uuid,
    }) {
        if (!username || !password) {
            throw new Error('username and password are required');
        }

        const hashedPassword = await bcrypt.hash(password, BCRYPT_COST);

        return this.userRepository.createUser({
            username,
            password: hashedPassword,
            role,
            firstName,
            lastName,
            email,
            profilePicture,
            uuid,
        });
    }

    async deleteUser(id) {
        if (!id) {
            throw new Error('id is required');
        }

        return this.userRepository.deleteUser(id);
    }

    async updateUser(id, updates) {
        if (!id) {
            throw new Error('id is required');
        }

        const processedUpdates = { ...updates };
        if (processedUpdates.password) {
            processedUpdates.password = await bcrypt.hash(processedUpdates.password, BCRYPT_COST);
        }

        return this.userRepository.updateUser(id, processedUpdates);
    }

    async getUserById(id) {
        if (!id) {
            throw new Error('id is required');
        }

        return this.userRepository.getUserById(id);
    }

    async getUserByUsername(username) {
        if (!username) {
            throw new Error('username is required');
        }

        return this.userRepository.getUserByUsername(username);
    }

    async verifyPassword(username, password) {
        if (!username || !password) {
            return null;
        }
        const user = await this.userRepository.getUserByUsernameWithPassword(username);
        if (!user) {
            return null;
        }

        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
            return null;
        }

        const { password: _pw, ...userWithoutPassword } = user;
        return userWithoutPassword;
    }
    async listUsers() {
        return this.userRepository.listUsers();
    }
}

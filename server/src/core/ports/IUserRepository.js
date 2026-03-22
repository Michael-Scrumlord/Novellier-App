/*
    This might require an explanation.
    Javascript doesn't directly support interfaces like other languages, but I can create a class 
    that throws "Not implemented" errors for each method. This serves as a contract that any concrete 
    implementation of IUserRepository must implement these methods. 
    
    If a method is called that hasn't been implemented, it will throw an error, making it clear that the implementation is incomplete.

    Reference: https://www.geeksforgeeks.org/javascript/implementing-interfaces-in-javascript/
*/

export class IUserRepository {
    async createUser(user) {
        throw new Error('Not implemented');
    }

    async deleteUser(id) {
        throw new Error('Not implemented');
    }

    async getUserById(id) {
        throw new Error('Not implemented');
    }

    async getUserByUsername(username) {
        throw new Error('Not implemented');
    }
    async getUserByUsernameWithPassword(username) {
        throw new Error('Not implemented');
    }

    async listUsers() {
        throw new Error('Not implemented');
    }

    async updateUser(id, updates) {
        throw new Error('Not implemented');
    }
}
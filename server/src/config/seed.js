import MongoUserRepository from "../adapters/persistence/mongo-user-repo.js";

export const seedDefaultAdmin = async () => {
    const userRepo = new MongoUserRepository();

    const adminUsername = process.env.ADMIN_USER || 'admin';
    const adminPassword = process.env.ADMIN_PASS || 'admin';
/*
    const existingAdmin = await userRepo.collection.findOne({ username: adminUsername });
    if (existingAdmin) {
        console.log('Admin user already exists.');
        return;
    }
*/

    const existingAdmin = await userRepo.getUserByUsername(adminUsername);
    if (existingAdmin) {
        console.log('Admin user already exists.');
        return;
    }

    await userRepo.createUser({
        username: adminUsername,
        password: adminPassword,
        role: 'admin',
        firstName: 'Admin',
        lastName: 'User',
        email: 'administrator@email.com',
        profilePicture: null
    });
}
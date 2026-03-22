export const seedDefaultAdmin = async (userService) => {
    const adminUsername = process.env.ADMIN_USER || 'admin';
    const adminPassword = process.env.ADMIN_PASS || 'admin';

    const existingAdmin = await userService.getUserByUsername(adminUsername);
    if (existingAdmin) {
        console.log(`Admin user '${adminUsername}' already exists.`);
        return;
    }

    await userService.createUser({
        username: adminUsername,
        password: adminPassword,
        role: 'admin',
        firstName: 'Admin',
        lastName: 'User',
        email: 'administrator@email.com',
        profilePicture: null
    });

    console.log(`Created default admin user: ${adminUsername}`);
};

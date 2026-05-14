// Seeds the database with a default admin user on first boot.
// No-ops silently if the admin account already exists.
//
// SECURITY: ADMIN_PASS must be set to a strong (>=16 char) value before first boot.
// The server refuses to seed an admin with an empty/weak password — previously this
// fell back to 'admin', which is unsafe for any internet-exposed deployment.
const MIN_ADMIN_PASS_LENGTH = 16;

export const seedDefaultAdmin = async (userService) => {
    const adminUsername = process.env.ADMIN_USER || 'admin';
    const adminPassword = process.env.ADMIN_PASS;

    const existingAdmin = await userService.getUserByUsername(adminUsername);
    if (existingAdmin) {
        console.log(`Admin user '${adminUsername}' already exists.`);
        return;
    }

    if (!adminPassword || adminPassword.length < MIN_ADMIN_PASS_LENGTH) {
        throw new Error(
            `ADMIN_PASS is required and must be at least ${MIN_ADMIN_PASS_LENGTH} characters ` +
                `to seed the initial admin user. Generate one with: openssl rand -base64 24`
        );
    }

    await userService.createUser({
        username: adminUsername,
        password: adminPassword,
        role: 'admin',
        firstName: 'Admin',
        lastName: 'User',
        email: 'administrator@email.com',
        profilePicture: null,
    });

    console.log(`Created default admin user: ${adminUsername}`);
};

/*
 * Runs once on first Mongo container boot (when the data volume is empty).
 * Creates an app-scoped user with readWrite on the novellier database only,
 * so the application never needs to connect as root.
 *
 * Reads MONGO_APP_USERNAME / MONGO_APP_PASSWORD from the container environment.
 * If either is missing the script is a no-op and the app falls back to whatever
 * MONGO_URL points at (likely the root user). That's a fail-soft to avoid
 * blocking first boot; switch to the scoped user in .env once this has run.
 *
 * To re-run after the first boot you must drop the volume:
 *   docker compose down
 *   docker volume rm novellier-app_novellier-mongo-data
 *   docker compose up --build
 */

(function () {
    const username = process.env.MONGO_APP_USERNAME || 'novellier_app';
    const password = process.env.MONGO_APP_PASSWORD;
    const dbName = process.env.MONGO_DB || 'novellier';

    if (!password) {
        print(
            '[mongo-init] MONGO_APP_PASSWORD not set; skipping app-user creation. ' +
                'Set MONGO_APP_PASSWORD in .env and recreate the mongo volume to apply.'
        );
        return;
    }

    db = db.getSiblingDB(dbName);

    // createUser throws if the user already exists; that's the desired
    // outcome on re-init (we never want to silently overwrite credentials).
    try {
        db.createUser({
            user: username,
            pwd: password,
            roles: [{ role: 'readWrite', db: dbName }],
        });
        print(`[mongo-init] Created app-scoped user '${username}' with readWrite on '${dbName}'.`);
    } catch (err) {
        print(`[mongo-init] Skipped user creation (likely already exists): ${err.message}`);
    }
})();

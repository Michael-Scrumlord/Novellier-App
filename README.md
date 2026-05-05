# Novellier - AI Assisted Writing Platform

## Novellier is a Containerized application and Docker is the preferred method to run this container.

### To Run:

1. Download the source code, including the `/client`, `/server`, `/ollama`, and `docker-compose.yml` file.

2. From a terminal, cd into the `/Novellier-App` folder and run the container using docker compose:

#### For Prod:

#: `docker-compose --profile prod up --build`

#### For Dev:

#: `docker-compose --profile dev up --build`

#### For Both:

You don't need both.

The compose file will begin the services in the correct order and a development LLM will be downloaded to your computer.

3. Open your browser to http://localhost:3001 to view the frontend.
   If you're using Dev, open the browser to http://localhost:5173.

4. Login with Default Credentials.

When the container is started up, Novellier seeds the user database with a default user. That default user can be used to create and manage additional application users or other administrators. 
To access the default user, enter these credentials. 

```
U: admin
P: admin
```

[!CAUTION]
In a real deployment, this admin user is just a temporary convenience. Once the access is delegated to the correct users, the recommendation is to delete this default admin account. 

## Testing

From the `/server` folder:

1. #: `npm install`
2. #: `npm run test:integration`

Optional test commands:

1. #: `npm test`
2. #: `npm run test:all`
3. #: `npm run test:coverage`

Current integration test coverage:

- Infrastructure:
    - `docker-compose.yml` includes core services (`server`, `client`, `mongodb`, `chromadb`, `ollama`, `portainer`)
    - basic network/persistence config is present (`novellier-network`, bridge driver, Mongo and Ollama volume mappings)
    - `.env.example` includes core variables (`MONGO_URL`, `MONGO_DB`, `CHROMA_URL`, `OLLAMA_URL`, `JWT_SECRET`)
- Mongo persistence:
    - `mongo-user-repo.js` ensures the user repo can be instantiated and is seeded with `seedDefaultAdmin`
    - `mongo-story-repo.js` exports `getCollection`
    - test database responds to `ping`

Manual smoke checks:

- `docker-compose up --build` starts all services
- `docker-compose logs` is accessible

## Database

### Administration

The MongoDB instance is accessible using the Express server: http://localhost:8001

### Removing the Mongo Data

> [!CAUTION]
> This of course destroys the data and reinitializes from scratch. Use at your own risk!.

_In fact, better to not use this at all unless something has gone horrendously awry and you don't need to retain any story, user, or other data._

#### Commands

- #: `docker compose down`
    - Spins down the containers
- #: `docker volume rm novellier-app_novellier-mongo-data novellier-mongo-data`
    - Removes the local Mongo Database.

### Troubleshooting

If you find that docker dependencies aren't working properly and you've confirmed that both the 'npm install' is running like normal and the package.json has your required dependencies, then it might be time to nuke your volumes.

Run this command for dev:

- #: `docker compose --profile dev down -v`
- #: `docker compose --profile dev up --build`

Try it out! It should work.
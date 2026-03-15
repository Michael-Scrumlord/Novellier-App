# Novellier - AI Assisted Writing Platform

## Novellier is a Containerized application and Docker is the preferred method to run this container.

### To Run:
1. Download the source code, including the /client, /server, /ollama, and docker-compose.yml file.

2. From a terminal, cd into the /Novellier-App folder and run the container using docker compose:

#### For Prod:

#: docker-compose --profile prod up --build

#### For Dev:

#: docker-compose --profile dev up --build

#### For Both:

#: docker compose --profile 

The compose file will begin the services in the correct order and a development LLM will be downloaded to your computer.

3. Open your browser to http://localhost:3001 to view the frontend.
If you're using Dev, open the browser to http://localhost:5173.

4. Login with Default Credentials.

The logon credentials for testing are:

U: admin
P: admin

[!CAUTION]
This is a development model so it should run on most hardware but be ready to switch to a more powerful machine or a VM if the model doesn't run. 

## Testing

From the `server` folder:

1. npm install
2. npm run test:integration

Optional test commands:

1. npm test
2. npm run test:all
3. npm run test:coverage

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

Screenshots
![](/client/public/Novellier-Demo.png)
![](/client/public/Docker.jpeg)

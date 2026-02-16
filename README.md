# Novellier - AI Assisted Writing Platform

## To Run: 

### Novellier is a Containerized application and Docker is the preferred method to run this container.

1. Download the source code, including the /client, /server, /ollama, and docker-compose.yml file.

2. From a terminal, cd into the /Novellier_v0.2 folder and run the container using docker compose:

#: docker-compose up --build

The compose file will begin the services in the correct order and a development LLM will be downloaded to your computer.

3. Open your browser to http://localhost:3001 to view the frontend.

4. Login with Default Credentials.

The logon credentials for testing are:

U: admin
P: admin

[!CAUTION]
This is a development model so it should run on most hardware but be ready to switch to a more powerful machine or a VM if the model doesn't run. 

Screenshots

(/client/public/Novellier-Demo.png)
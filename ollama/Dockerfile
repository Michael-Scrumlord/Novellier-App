# User Dockerfile to pull the phi3 model, why not
FROM ollama/ollama:latest

RUN apt-get update && apt-get install -y curl

COPY pull-model.sh /pull-model.sh
RUN chmod +x /pull-model.sh

ENTRYPOINT ["/pull-model.sh"]
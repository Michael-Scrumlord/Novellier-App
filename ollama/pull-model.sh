#!/bin/bash
# This script is merely for pulling a demo model without making the user do it manually.

ollama serve &
OLLAMA_PID=$!

echo "Waiting for Ollama server to start..."
while ! ollama list > /dev/null 2>&1; do
  sleep 1
done

# Pulling Phi3 by default
# TODO: Make this more flexible later on.
echo "Pulling phi3 model..."
ollama pull phi3

echo "phi3 model pulled successfully. Ollama server is running."
wait $OLLAMA_PID
const VectorRepo = require('../repositories/vector-repo');
const axios = require('axios');

const OLLAMA_ENDPOINT = `${process.env.OLLAMA_URL}/api/generate`;

exports.generateResponse = async (currentText) => {
    // Search ChromaDB for relevant past context
    // The context will be used to inform the AI's suggestion

    // For testing purposes, a stub will be used. Probably Mary Shelley's Frankenstein, since it's public domain. 
    const context = await VectorRepo.searchContext(currentText);

    // This prompt is the combination of the current text and the retrieved context.
    const prompt = `You are an accomplished writer and editor and your job is solely to provide expert feedback to budding novelists.
     You have been given the following manuscript to provide feedback on. 
     Context from previous chapters, if any: ${context}\n\n
     Current Story: ${currentText}\n\n
     Task: Based on the context, suggest an improvement to make the story more complete, compelling, or coherent. Limit your response to 200 words.`;

    // Assumes the model is phi3
    // TODO: Factor the model out so that I can easily switch between different models and providers in the future
    const response = await axios.post(OLLAMA_ENDPOINT, {
        model: "phi3",
        prompt: prompt,
        stream: false // TODO: Handle response streaming for better UI
    });

    console.log("AI Service response:", response.data);

    return response.data.response;
};
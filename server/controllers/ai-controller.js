const AI_Service = require('../services/ai-service');

exports.getSuggestion = async (req, res) => {
    const { storyText } = req.body;
    try {
        // If this succeeds, it means the AI service is reachable and working
        const suggestion = await AI_Service.generateResponse(storyText);
        res.json({ suggestion });
        console.log("The AI service is working correctly.");
    } catch (error) {
        // Something has gone awry with the AI services
        // Double check communication with ChromaDB and Ollama
        res.status(500).json({ error: "AI Service Error" });
        console.error("Error in AI Service:", error);
    }
};
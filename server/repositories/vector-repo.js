const axios = require('axios');

const CHROMA_URL = process.env.CHROMA_URL || 'http://localhost:8000';

exports.searchContext = async (text) => {
    try {
        const collectionName = 'project_store';
        
        // see if the collection exists
        await axios.get(`${CHROMA_URL}/api/v1/collections/${collectionName}`).catch(() => {
            // TODO: If the collection doesn't exist, create it
        });
        
        // POST to /query endpoint to retrieve context based on the input text
        const response = await axios.post(`${CHROMA_URL}/api/v1/collections/${collectionName}/query`, {
            query_texts: [text],
            n_results: 2
        });
        
        if (response.data && response.data.documents && response.data.documents.length > 0 && response.data.documents[0].length > 0) {
            return response.data.documents[0].join(" ");
        }
        return "No historical context has been found.";
    } catch (e) {
        console.error("ChromaDB error:", e.message);
        // Return default context instead of erroring out
        return "No previous context found.";
    }
};
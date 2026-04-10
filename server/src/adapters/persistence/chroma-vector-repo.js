import { IVectorRepository } from '../../core/ports/IVectorRepository.js';
import { richTextToPlainText } from '../../utils/rich-text-to-plain-text.js';

export default class ChromaVectorRepository extends IVectorRepository {
  constructor({ baseUrl = process.env.ChromaURL || 'http://chromadb:8000', collectionName = 'project_store', ollamaUrl = process.env.OllamaURL || 'http://ollama:11434', embeddingModel = 'nomic-embed-text', ragConfig } = {}) {
    super();
    this.baseUrl = baseUrl;
    this.collectionName = collectionName;
    this.ollamaUrl = ollamaUrl;
    this.collectionId = null;
    this.embeddingModel = embeddingModel;
    this.ragConfig = ragConfig || { contextChunks: 3, maxContextTokens: 1000, batchSize: 5 };
  }

    async _post(url, body, options = {}) {
        const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: options.signal
        });
        
        if (!res.ok) {
        let errorDetail = res.statusText;
        try {
            const errData = await res.json();
            errorDetail = JSON.stringify(errData);
        } catch (e) { /* Catch the error and ignore */ }
        throw new Error(`ChromaDB Error ${res.status}: ${errorDetail}`);
        }
        
        return res.json();
    }

    async _get(url) {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        return res.json();
    }

    async getCollectionId() {
        if (this.collectionId) return this.collectionId;

        const collection = await this._post(`${this.baseUrl}/api/v1/collections`, {
        name: this.collectionName,
        get_or_create: true,
        metadata: { description: 'Story context storage' }
        });

        if (!collection?.id) throw new Error(`Failed to get or create collection ${this.collectionName}`);
        
        this.collectionId = collection.id;
        return this.collectionId;
    }

    async searchContext(text, options = {}) {
        try {
        const collectionId = await this.getCollectionId();
        const collectionUrl = `${this.baseUrl}/api/v1/collections/${collectionId}`;

        const normalizedQuery = richTextToPlainText(text);
        if (!normalizedQuery) {
            return options.storyId
                ? 'No previous context found for this story.'
                : 'No historical context has been found.';
        }

        const embedding = await this.generateEmbedding(normalizedQuery);
        const nResults = options.limit || this.ragConfig.contextChunks;

        const queryPayload = {
            query_embeddings: [embedding],
            n_results: nResults,
            include: ['documents', 'metadatas', 'distances']
        };

        if (options.storyId) {
            queryPayload.where = { storyId: options.storyId };
        }

        const data = await this._post(`${collectionUrl}/query`, queryPayload);

        const documents = data?.documents;
        const metadatas = data?.metadatas;

        if (Array.isArray(documents) && documents.length > 0 && documents[0].length > 0) {
            const contextParts = [];
            const docList = documents[0];
            const metaList = metadatas?.[0] || [];

            for (let i = 0; i < docList.length; i++) {
            const doc = docList[i];
            const meta = metaList[i];

            const clippedDoc = this.clipToTokenLimit(doc, this.ragConfig.maxContextTokens / nResults);

            if (meta?.sectionTitle) {
                contextParts.push(`[From: ${meta.sectionTitle}${meta.beatKey ? ` (${meta.beatKey})` : ''}]\n${clippedDoc}`);
            } else if (meta?.beatKey) {
                contextParts.push(`[From: ${meta.beatKey}]\n${clippedDoc}`);
            } else {
                contextParts.push(clippedDoc);
            }
            }

            return contextParts.join('\n\n');
        }

        return options.storyId 
            ? 'No previous context found for this story.'
            : 'No historical context has been found.';
        } catch (error) {
        console.error('[RAG] ChromaDB search error:', error.message);
        return '';
        }
    }

    clipToTokenLimit(text, maxTokens) {
        const maxChars = maxTokens * 4;
        if (text.length <= maxChars) return text;
        return text.slice(0, maxChars) + '...';
    }
    async generateEmbedding(text) {
        const normalizedText = richTextToPlainText(text);
        if (!normalizedText) {
            throw new Error('No text available for embedding');
        }

        const data = await this._post(
        `${this.ollamaUrl}/api/embeddings`,
        {
            model: this.embeddingModel,
            prompt: normalizedText
        },
        { signal: AbortSignal.timeout(30000) }
        );

        if (!data?.embedding) {
        throw new Error('No embedding returned from Ollama');
        }

        return data.embedding;
    }

    async warmupEmbeddingModel() {
        try {
        console.log('[RAG] Warming up embedding model...');
        const testText = 'This is a test for embedding warmup';
        await this.generateEmbedding(testText);
        console.log('[RAG] Embedding model warmup successful');
        } catch (error) {
        console.error('[RAG] Embedding model warmup failed:', error.message);
        }
    }

    async addContext(id, text, metadata = {}) {
        try {
        const collectionId = await this.getCollectionId();
        const collectionUrl = `${this.baseUrl}/api/v1/collections/${collectionId}`;
        const normalizedText = richTextToPlainText(text);

        if (!normalizedText) {
            return false;
        }

        const embedding = await this.generateEmbedding(normalizedText);

        await this._post(`${collectionUrl}/upsert`, {
            ids: [id],
            documents: [normalizedText],
            embeddings: [embedding],
            metadatas: [{
            storyId: metadata.storyId || 'unknown',
            timestamp: metadata.timestamp || new Date().toISOString(),
            ...metadata
            }]
        });

        return true;
        } catch (error) {
        console.error('[RAG] ChromaDB add error:', error.message);
        return false;
        }
    }
    async deleteStoryContext(storyId) {
        try {
        const collectionId = await this.getCollectionId();
        const collectionUrl = `${this.baseUrl}/api/v1/collections/${collectionId}`;

        await this._post(`${collectionUrl}/delete`, {
            where: { storyId }
        });
        
        console.log(`[RAG] Deleted context chunks for story ${storyId}`);
        return true;
        } catch (error) {
        console.error('[RAG] ChromaDB delete error:', error.message);
        return false;
        }
    }
}
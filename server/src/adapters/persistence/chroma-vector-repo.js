import { richTextToPlainText } from '../../core/domain/RichText.js';
import { formatRetrievalContext } from '../../core/domain/RetrievalContextFormatter.js';

export default class ChromaVectorRepository {
    constructor({
        baseUrl = 'http://chromadb:8000',
        collectionName = 'project_store',
        ollamaUrl = 'http://ollama:11434',
        embeddingModel = 'nomic-embed-text',
        ragConfig,
        runtimeModels,
    } = {}) {
        this.baseUrl = baseUrl;
        this.collectionName = collectionName;
        this.ollamaUrl = ollamaUrl;
        this.collectionId = null;
        this.embeddingModel = embeddingModel;
        this.ragConfig = ragConfig || { contextChunks: 3, maxContextTokens: 1000, batchSize: 5 };
        this.runtimeModels = runtimeModels || null;
    }

    setOllamaUrl(url) {
        const trimmed = typeof url === 'string' ? url.trim() : '';
        if (!trimmed) throw new Error('Ollama URL cannot be empty');
        this.ollamaUrl = trimmed.replace(/\/+$/, '');
    }

    getOllamaUrl() {
        return this.ollamaUrl;
    }

    async _post(url, body, options = {}) {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
            signal: options.signal,
        });

        if (!res.ok) {
            let errorDetail = res.statusText;
            try {
                const errData = await res.json();
                errorDetail = JSON.stringify(errData);
            } catch (e) {
            }
            throw new Error(`ChromaDB Error ${res.status}: ${errorDetail}`);
        }

        return res.json();
    }

    async getCollectionId() {
        if (this.collectionId) return this.collectionId;

        const collection = await this._post(`${this.baseUrl}/api/v1/collections`, {
            name: this.collectionName,
            get_or_create: true,
            metadata: { description: 'Story context storage' },
        });

        if (!collection?.id)
            throw new Error(`Failed to get or create collection ${this.collectionName}`);

        this.collectionId = collection.id;
        return this.collectionId;
    }

    async searchContext(text, options = {}) {
        try {
            const collectionId = await this.getCollectionId();
            const collectionUrl = `${this.baseUrl}/api/v1/collections/${collectionId}`;

            const normalizedQuery = richTextToPlainText(text);
            if (!normalizedQuery) return '';

            const embedding = await this.generateEmbedding(normalizedQuery);
            const nResults = options.limit || this.ragConfig.contextChunks;

            const queryPayload = {
                query_embeddings: [embedding],
                n_results: nResults,
                include: ['documents', 'metadatas', 'distances'],
            };

            if (options.storyId) {
                queryPayload.where = { storyId: options.storyId };
            }

            const data = await this._post(`${collectionUrl}/query`, queryPayload);

            const documents = data?.documents;
            const metadatas = data?.metadatas;

            if (Array.isArray(documents) && documents.length > 0 && documents[0].length > 0) {
                const docList = documents[0];
                const metaList = metadatas?.[0] || [];

                const docs = docList.map((doc, i) => ({
                    text: this.clipToTokenLimit(doc, this.ragConfig.maxContextTokens / nResults),
                    metadata: metaList[i],
                }));

                return formatRetrievalContext(docs);
            }

            return '';
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
                model: this.runtimeModels?.embedding || this.embeddingModel,
                prompt: normalizedText,
            },
            { signal: AbortSignal.timeout(30000) }
        );

        if (!data?.embedding) {
            throw new Error('No embedding returned from Ollama');
        }

        return data.embedding;
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
                metadatas: [
                    {
                        storyId: metadata.storyId || 'unknown',
                        timestamp: metadata.timestamp || new Date().toISOString(),
                        ...metadata,
                    },
                ],
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
                where: { storyId },
            });

            console.log(`[RAG] Deleted context chunks for story ${storyId}`);
            return true;
        } catch (error) {
            console.error('[RAG] ChromaDB delete error:', error.message);
            return false;
        }
    }
}
import { richTextToPlainText } from '../../core/domain/RichText.js';
import { formatRetrievalContext } from '../../core/domain/RetrievalContextFormatter.js';
import { IVectorRepository } from '../../core/ports/IVectorRepository.js';

const MAX_EMBED_BATCH = 64;

export default class ChromaVectorRepository extends IVectorRepository {
    constructor({
        baseUrl = 'http://chromadb:8000',
        collectionName = 'project_store',
        ollamaUrl = 'http://ollama:11434',
        embeddingModel = 'nomic-embed-text',
        ragConfig,
        runtimeModels,
        ollamaGate = null,
    } = {}) {
        super();
        this.baseUrl = baseUrl;
        this.collectionName = collectionName;
        this.ollamaUrl = ollamaUrl;
        this.collectionId = null;
        this.embeddingModel = embeddingModel;
        this.ragConfig = ragConfig || { contextChunks: 3, maxContextTokens: 1000 };
        this.runtimeModels = runtimeModels || null;
        this.ollamaGate = ollamaGate;
    }

    // IVectorRepository.updateTransport — accepts { baseUrl } pointing at the embedding host
    // (Ollama). Used by OllamaEndpointService when the operator changes the transport URL.
    updateTransport({ baseUrl } = {}) {
        const trimmed = typeof baseUrl === 'string' ? baseUrl.trim() : '';
        if (!trimmed) throw new Error('Embedding host URL cannot be empty');
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

            const normalizedQuery = options.alreadyNormalized ? text : richTextToPlainText(text);
            if (!normalizedQuery) return '';

            const embedding = await this.generateEmbedding(normalizedQuery, { alreadyNormalized: true });
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

    async generateEmbedding(text, { alreadyNormalized = false } = {}) {
        const normalizedText = alreadyNormalized ? text : richTextToPlainText(text);
        if (!normalizedText) {
            throw new Error('No text available for embedding');
        }

        const [embedding] = await this._generateEmbeddingsBatch([normalizedText]);
        if (!embedding) {
            throw new Error('No embedding returned from Ollama');
        }
        return embedding;
    }

    // Batch embedding via Ollama /api/embed. Inputs MUST already be plain text.
    // Splits into MAX_EMBED_BATCH-sized requests dispatched in parallel to avoid
    // single oversized payloads while preserving result ordering.
    async _generateEmbeddingsBatch(plainTexts, { signal } = {}) {
        if (!Array.isArray(plainTexts) || plainTexts.length === 0) return [];

        const groups = [];
        for (let i = 0; i < plainTexts.length; i += MAX_EMBED_BATCH) {
            groups.push(plainTexts.slice(i, i + MAX_EMBED_BATCH));
        }

        const flat = [];
        for (const group of groups) {
            const post = () => this._post(
                `${this.ollamaUrl}/api/embed`,
                {
                    model: this.runtimeModels?.embedding || this.embeddingModel,
                    input: group,
                },
                { signal: signal || AbortSignal.timeout(60000) }
            );
            const data = this.ollamaGate
                ? await this.ollamaGate.withPermit(signal, post)
                : await post();
            const embeddings = Array.isArray(data?.embeddings) ? data.embeddings : null;
            if (!embeddings || embeddings.length !== group.length) {
                throw new Error(
                    `Ollama /api/embed returned ${embeddings?.length ?? 0} embeddings for ${group.length} inputs`
                );
            }
            flat.push(...embeddings);
        }

        return flat;
    }

    // Batch upsert. items: [{ id, text, metadata, alreadyNormalized? }].
    // Issues a single batched embedding call (chunked internally to MAX_EMBED_BATCH)
    // and a single Chroma upsert. Returns true if any items were upserted.
    async addContextBatch(items) {
        try {
            if (!Array.isArray(items) || items.length === 0) return false;

            const prepared = items
                .map((item) => {
                    const text = item?.alreadyNormalized
                        ? item.text
                        : richTextToPlainText(item?.text || '');
                    return { id: item?.id, text, metadata: item?.metadata || {} };
                })
                .filter((p) => p.id && p.text);

            if (prepared.length === 0) return false;

            const collectionId = await this.getCollectionId();
            const collectionUrl = `${this.baseUrl}/api/v1/collections/${collectionId}`;

            const embeddings = await this._generateEmbeddingsBatch(prepared.map((p) => p.text));

            await this._post(`${collectionUrl}/upsert`, {
                ids: prepared.map((p) => p.id),
                documents: prepared.map((p) => p.text),
                embeddings,
                metadatas: prepared.map((p) => ({
                    storyId: p.metadata.storyId || 'unknown',
                    timestamp: p.metadata.timestamp || new Date().toISOString(),
                    ...p.metadata,
                })),
            });

            return true;
        } catch (error) {
            console.error('[RAG] ChromaDB batch add error:', error.message);
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

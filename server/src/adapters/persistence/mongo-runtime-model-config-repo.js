// MongoDB adapter for persisted runtime configuration (active model roles, Ollama endpoint, and LLM params).
// Uses a key/value document structure with upsert so records are created on first write.
const RUNTIME_MODELS_KEY = 'runtime_models';
const OLLAMA_ENDPOINT_KEY = 'ollama_endpoint';
const LLM_MODEL_PARAMS_KEY = 'llm_model_params';

function toModelString(value) {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    return trimmed || null;
}

function sanitizeRuntimeModels(models = {}) {
    return {
        suggestion: toModelString(models.suggestion),
        summary: toModelString(models.summary),
        embedding: toModelString(models.embedding),
    };
}

function sanitizeEndpoint(endpoint = {}) {
    return { url: toModelString(endpoint.url) };
}

export default class MongoRuntimeModelConfigRepository {
    constructor({ db, collectionName = 'app_config' } = {}) {
        this.db = db;
        this.collectionName = collectionName;
        this._indexed = false;
    }

    async getCollection() {
        const collection = this.db.collection(this.collectionName);
        if (!this._indexed) {
            await collection.createIndex({ key: 1 }, { unique: true });
            this._indexed = true;
        }
        return collection;
    }

    async getRuntimeModels() {
        const collection = await this.getCollection();
        const record = await collection.findOne({ key: RUNTIME_MODELS_KEY });
        if (!record?.value || typeof record.value !== 'object') return null;
        return sanitizeRuntimeModels(record.value);
    }

    async saveRuntimeModels(runtimeModels) {
        const collection = await this.getCollection();
        const value = sanitizeRuntimeModels(runtimeModels);
        const now = new Date();

        await collection.updateOne(
            { key: RUNTIME_MODELS_KEY },
            {
                $set: { value, updatedAt: now },
                $setOnInsert: { key: RUNTIME_MODELS_KEY, createdAt: now },
            },
            { upsert: true }
        );

        return value;
    }

    async getOllamaEndpoint() {
        const collection = await this.getCollection();
        const record = await collection.findOne({ key: OLLAMA_ENDPOINT_KEY });
        if (!record?.value || typeof record.value !== 'object') return null;
        return sanitizeEndpoint(record.value);
    }

    async saveOllamaEndpoint(endpoint) {
        const collection = await this.getCollection();
        const value = sanitizeEndpoint(endpoint);
        const now = new Date();

        await collection.updateOne(
            { key: OLLAMA_ENDPOINT_KEY },
            {
                $set: { value, updatedAt: now },
                $setOnInsert: { key: OLLAMA_ENDPOINT_KEY, createdAt: now },
            },
            { upsert: true }
        );

        return value;
    }

    async getLlmModelParams() {
        const collection = await this.getCollection();
        const record = await collection.findOne({ key: LLM_MODEL_PARAMS_KEY });
        if (!record?.value || typeof record.value !== 'object') return null;
        return record.value;
    }

    async saveLlmModelParams(params) {
        const collection = await this.getCollection();
        const value = params && typeof params === 'object' ? params : null;
        const now = new Date();

        await collection.updateOne(
            { key: LLM_MODEL_PARAMS_KEY },
            {
                $set: { value, updatedAt: now },
                $setOnInsert: { key: LLM_MODEL_PARAMS_KEY, createdAt: now },
            },
            { upsert: true }
        );

        return value;
    }
}
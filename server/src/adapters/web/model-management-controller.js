// HTTP adapter for AI model lifecycle operations. Routes through the cohesive aiService
// adapter for all model lifecycle calls (pull/remove/status); modelManager is not injected.
import {
    LlmParamsSchema,
    ModelIdSchema,
    OllamaEndpointSchema,
    SetActiveModelSchema,
    validate,
} from './validation.js';

export default class ModelManagementController {
    constructor({ aiService, modelManagementService, ollamaEndpointService, llmParamsService }) {
        if (!aiService) throw new Error('ModelManagementController requires aiService');
        if (!modelManagementService) throw new Error('ModelManagementController requires modelManagementService');
        this.aiService = aiService;
        this.modelManagementService = modelManagementService;
        this.ollamaEndpointService = ollamaEndpointService || null;
        this.llmParamsService = llmParamsService || null;
    }

    async warmup(req, res) {
        try {
            const model = req.query.model || req.body?.model;
            const result = await this.aiService.warmupModel(model);
            return res.json(result);
        } catch (error) {
            console.error('[ModelManagementController] Warmup Error:', error.message);
            return res.status(500).json({ error: 'Failed to warm up model' });
        }
    }

    async keepAlive(req, res) {
        try {
            const model = req.query.model || req.body?.model;
            const result = await this.aiService.keepAlive(model);
            return res.json(result);
        } catch (error) {
            console.error('[ModelManagementController] KeepAlive Error:', error.message);
            return res.status(500).json({ error: 'Failed to keep model alive' });
        }
    }

    async ensureModel(req, res) {
        try {
            const data = validate(ModelIdSchema, req.body, res);
            if (!data) return;
            const { model } = data;
            const result = await this.aiService.ensureModelAvailable(model);
            return res.json({ status: result?.status || 'ready', model });
        } catch (error) {
            console.error('[ModelManagementController] EnsureModel Error:', error.message);
            return res.status(500).json({ error: 'Failed to ensure model availability' });
        }
    }

    async pullModel(req, res) {
        try {
            const data = validate(ModelIdSchema, req.body, res);
            if (!data) return;
            const { model } = data;

            // Pull runs asynchronously; clients observe progress via /pull-progress polling.
            this.aiService.pullModel(model).catch((error) => {
                console.error('[ModelManagementController] PullModel Error:', error.message);
            });

            return res.status(202).json({ status: 'pulling', model });
        } catch (error) {
            console.error('[ModelManagementController] PullModel Error:', error.message);
            return res.status(500).json({ error: 'Failed to start model pull' });
        }
    }

    async removeModel(req, res) {
        try {
            const data = validate(ModelIdSchema, req.body, res);
            if (!data) return;
            const { model } = data;

            if (this.modelManagementService.isModelActive(model)) {
                return res.status(409).json({
                    error: 'Cannot remove an active model. Switch active model first.',
                });
            }

            await this.aiService.removeModel(model);
            return res.json({ status: 'removed', model });
        } catch (error) {
            console.error('[ModelManagementController] RemoveModel Error:', error.message);
            return res.status(500).json({ error: 'Failed to remove model' });
        }
    }

    async getPullProgress(req, res) {
        try {
            const model = req.query.model;
            const { progress } = await this.aiService.listModels();
            const result = model
                ? progress?.[model] || { model, status: 'idle', completed: null, total: null, percent: 0 }
                : progress || {};
            return res.json({ progress: result });
        } catch (error) {
            console.error('[ModelManagementController] PullProgress Error:', error.message);
            return res.status(500).json({ error: 'Failed to load pull progress' });
        }
    }

    async getAdminModelConfig(_req, res) {
        return res.json({ active: this.modelManagementService.getActiveModels() });
    }

    async getOllamaEndpoint(_req, res) {
        if (!this.ollamaEndpointService) {
            return res.status(501).json({ error: 'Ollama endpoint service not configured' });
        }
        return res.json(await this.ollamaEndpointService.getEndpoint());
    }

    async setOllamaEndpoint(req, res) {
        if (!this.ollamaEndpointService) {
            return res.status(501).json({ error: 'Ollama endpoint service not configured' });
        }
        // SSRF guard: reject URLs that point at private/link-local/metadata
        // addresses. The in-cluster `ollama` hostname is explicitly allowed.
        const data = validate(OllamaEndpointSchema, req.body, res);
        if (!data) return;

        try {
            const result = await this.ollamaEndpointService.setEndpoint(data.url);
            return res.json({ status: 'ok', ...result });
        } catch (error) {
            return res.status(400).json({ error: error.message });
        }
    }

    async testOllamaEndpoint(req, res) {
        if (!this.ollamaEndpointService) {
            return res.status(501).json({ error: 'Ollama endpoint service not configured' });
        }
        // Same SSRF guard as setOllamaEndpoint — a "test connection" feature
        // is just as much of an SSRF vector as the real "set endpoint" call.
        const data = validate(OllamaEndpointSchema, req.body, res);
        if (!data) return;
        const result = await this.ollamaEndpointService.testConnection(data.url);
        return res.json(result);
    }

    async getLlmParams(_req, res) {
        if (!this.llmParamsService) return res.status(501).json({ error: 'LLM params service not configured' });
        return res.json(this.llmParamsService.getParams());
    }

    async setLlmParams(req, res) {
        if (!this.llmParamsService) return res.status(501).json({ error: 'LLM params service not configured' });
        const data = validate(LlmParamsSchema, req.body, res);
        if (!data) return;
        try {
            const result = await this.llmParamsService.setParams(data);
            return res.json({ status: 'ok', ...result });
        } catch (error) {
            return res.status(400).json({ error: error.message });
        }
    }

    async resetLlmParams(_req, res) {
        if (!this.llmParamsService) return res.status(501).json({ error: 'LLM params service not configured' });
        try {
            const result = await this.llmParamsService.resetParams();
            return res.json({ status: 'ok', ...result });
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }

    async setActiveModel(req, res) {
        const data = validate(SetActiveModelSchema, req.body, res);
        if (!data) return;
        const { target, model } = data;

        try {
            const active = await this.modelManagementService.setActiveModel(target, model);
            return res.json({ status: 'ok', target, model: active[target], active });
        } catch (error) {
            return res.status(400).json({ error: error.message });
        }
    }
}

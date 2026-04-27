// HTTP adapter for AI model catalog and status queries.
// Delegates to OllamaModelCatalogService for rich catalog data,
// with fallback to AIModelManagementService if unavailable.

export default class ModelCatalogController {
    constructor({ modelCatalogService, modelManagementService }) {
        if (!modelCatalogService) throw new Error('ModelCatalogController requires modelCatalogService');
        if (!modelManagementService) throw new Error('ModelCatalogController requires modelManagementService');
        this.modelCatalogService = modelCatalogService;
        this.modelManagementService = modelManagementService;
    }

    async listModels(_req, res) {
        try {
            const catalog = await this.modelCatalogService.getCatalog('');
            const optionByValue = new Map();

            for (const entry of catalog.models || []) {
                for (const installedTag of entry.installedTags || []) {
                    const value = String(installedTag?.name || '').trim();
                    if (!value || optionByValue.has(value)) continue;
                    optionByValue.set(value, { value, label: value });
                }
            }

            return res.json({
                modelGroups: [
                    {
                        label: 'Local Models (Ollama)',
                        options: [...optionByValue.values()].sort((a, b) =>
                            a.value.localeCompare(b.value)
                        ),
                    },
                ],
            });
        } catch (error) {
            console.warn('[ModelCatalogController] Falling back to management catalog:', error.message);
        }

        const catalog = await this.modelManagementService.getModelCatalog();
        const sorted = [...catalog].sort((a, b) => {
            if (a.downloaded !== b.downloaded) return a.downloaded ? -1 : 1;
            if (a.recommendedConstrained !== b.recommendedConstrained)
                return a.recommendedConstrained ? -1 : 1;
            return a.model.localeCompare(b.model);
        });

        return res.json({
            modelGroups: [
                {
                    label: 'Local Models (Ollama)',
                    options: sorted
                        .filter((entry) => entry.downloaded)
                        .map((entry) => ({ value: entry.model, label: entry.displayName })),
                },
            ],
        });
    }

    async getAdminModelStatus(_req, res) {
        try {
            const catalog = await this.modelManagementService.getModelCatalog();
            const activeModels = this.modelManagementService.getActiveModels();

            const models = await Promise.all(
                catalog.map(async (entry) => {
                    const pull = (await this.modelManagementService.getPullProgress(entry.model)) || null;
                    return {
                        model: entry.model,
                        displayName: entry.displayName,
                        downloaded: entry.downloaded,
                        sizeBytes: entry.sizeBytes,
                        recommendedConstrained: entry.recommendedConstrained,
                        pullStatus: pull?.status || 'idle',
                        completedBytes: pull?.completed || null,
                        totalBytes: pull?.total || null,
                        percent: pull?.percent || 0,
                        isActiveSuggestion: activeModels.suggestion === entry.model,
                        isActiveSummary: activeModels.summary === entry.model,
                        isActiveEmbedding: activeModels.embedding === entry.model,
                    };
                })
            );

            return res.json({ active: activeModels, models });
        } catch (error) {
            console.error('[ModelCatalogController] ModelStatus Error:', error.message);
            return res.status(500).json({ error: 'Failed to load model status' });
        }
    }

    async getAdminModelCatalog(req, res) {
        try {
            const query = req.query.query || req.query.q || '';
            const catalog = await this.modelCatalogService.getCatalog(query);
            return res.json(catalog);
        } catch (error) {
            console.error('[ModelCatalogController] Catalog Error:', error.message);
            return res.status(500).json({ error: 'Failed to load model catalog' });
        }
    }

    async getAdminModelDetails(req, res) {
        try {
            const model = req.query.model || req.body?.model;
            if (!model) return res.status(400).json({ error: 'model is required' });

            const details = await this.modelCatalogService.getModelDetails(model);
            return res.json({ details });
        } catch (error) {
            console.error('[ModelCatalogController] ModelDetails Error:', error.message);
            return res.status(500).json({ error: 'Failed to load model details' });
        }
    }
}

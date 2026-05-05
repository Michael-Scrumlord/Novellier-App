// Server entry point — connects to MongoDB, auto-configures AI models, seeds the database, and starts Express.
// Model roles are hydrated from persisted config on boot so the app is usable without manual setup.
import express from 'express';
import cors from 'cors';
import { seedDefaultAdmin } from './config/seed.js';
import { createRoutes } from './adapters/web/routes.js';
import { errorMiddleware } from './adapters/web/error-handling.js';
import { buildDependencies } from './config/di.js';
import { pickSmallestModel } from './config/runtime-config.js';

const PORT = process.env.PORT || 5000;

async function start() {
    const deps = buildDependencies();
    await deps.mongoClient.connect();

    if (deps.ollamaEndpointService?.hydrate) {
        await deps.ollamaEndpointService.hydrate();
    }

    if (deps.llmParamsService?.hydrate) {
        await deps.llmParamsService.hydrate();
    }

    if (deps.jobQueueCheckpointStore?.load) {
        const previous = await deps.jobQueueCheckpointStore.load();
        if (previous && (previous.running > 0 || previous.pending.length > 0)) {
            console.warn(
                `[AIJobQueue] Recovered checkpoint from prior process: running=${previous.running}, pending=${previous.pending.length}. Closures lost; queue starting empty.`
            );
        }
        await deps.jobQueueCheckpointStore.save({ running: 0, pending: [] });
    }

    if (deps.modelManagementService?.hydrateRuntimeModels) {
        let active = await deps.modelManagementService.hydrateRuntimeModels();

        const embeddingModel = (process.env.EMBEDDING_MODEL || 'nomic-embed-text').toLowerCase();
        const isEmbeddingModel = (name) => {
            if (!name) return false;
            const lower = name.toLowerCase();
            return lower === embeddingModel || lower.includes('embed');
        };

        // Guard against embedding models landing in generative roles (e.g. from a prior
        // misconfiguration). Treat them as unconfigured so auto-detection replaces them.
        const needsSuggestion = !active.suggestion || isEmbeddingModel(active.suggestion);
        const needsSummary = !active.summary || isEmbeddingModel(active.summary);

        if (needsSuggestion || needsSummary) {
            try {
                const installed = await deps.modelManager.listInstalledModels();
                const generativeNames = installed
                    .map((m) => m.name)
                    .filter(Boolean)
                    .filter((name) => !isEmbeddingModel(name));

                if (generativeNames.length > 0) {
                    // Prefer LLM_MODEL if installed, otherwise pick the smallest by parameter count.
                    const preferred = process.env.LLM_MODEL
                        ? generativeNames.find((n) => n.toLowerCase().startsWith(process.env.LLM_MODEL.toLowerCase()))
                        : null;
                    const defaultModel = preferred || pickSmallestModel(generativeNames, generativeNames[0]);

                    if (needsSuggestion) await deps.modelManagementService.setActiveModel('suggestion', defaultModel);
                    if (needsSummary) await deps.modelManagementService.setActiveModel('summary', defaultModel);
                    active = deps.modelManagementService.getActiveModels();
                    console.log('[ModelConfig] Auto-configured default model:', defaultModel);
                } else if (process.env.LLM_MODEL) {
                    // No generative models installed — pull in the background so the app self-heals on first boot.
                    console.log('[ModelConfig] Pulling default model in background:', process.env.LLM_MODEL);
                    deps.modelManager.pullModelWithProgress(process.env.LLM_MODEL).catch((err) => {
                        console.warn('[ModelConfig] Background pull failed:', err.message);
                    });
                } else {
                    console.log('[ModelConfig] No generative models installed; configure via Admin > AI Models.');
                }
            } catch (err) {
                console.warn('[ModelConfig] Auto-discovery skipped:', err.message);
            }
        }

        console.log('[ModelConfig] Active runtime models:', JSON.stringify(active));
    }

    const app = express();
    app.use(cors());
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    app.use(createRoutes(deps));
    app.get('/health', (req, res) => res.json({ status: 'ok', message: 'Server is running' }));

    // Must be registered after all routes — Express identifies error handlers by their 4-arg signature.
    app.use(errorMiddleware);

    await seedDefaultAdmin(deps.userService);

    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

start().catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
});
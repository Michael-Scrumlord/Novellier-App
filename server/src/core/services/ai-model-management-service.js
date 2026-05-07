import { normalizeModelName, coerceModelString } from '../domain/ModelNameUtils.js';
import {
    MODEL_ROLE_TARGETS,
    createDefaultRuntimeModels,
    assertValidTarget,
    sanitizeRuntimeModels,
    mergePersistedIntoRuntime,
} from '../domain/RuntimeModelRoles.js';
import {
    buildConstrainedModelSet,
    collectCandidates,
    indexInstalledByNormalizedName,
    buildCatalogEntries,
} from '../domain/ModelCatalogBuilder.js';

const RUNTIME_MODELS_SETTING_KEY = 'runtime_models';

export class AIModelManagementService {
    static VALID_TARGETS = MODEL_ROLE_TARGETS;

    constructor({
        aiService,
        runtimeModels,
        localModels,
        constrainedModels,
        infrastructureRepository,
        logger = console,
    } = {}) {
        if (!aiService) throw new Error('AIModelManagementService requires aiService');
        this.logger = logger;
        this.aiService = aiService;
        this.runtimeModels = (runtimeModels && typeof runtimeModels === 'object')
            ? runtimeModels
            : createDefaultRuntimeModels();
        this.localModels = Array.isArray(localModels) ? localModels : [];
        this.constrainedModels = buildConstrainedModelSet(constrainedModels);
        this.infrastructureRepository = infrastructureRepository || null;
    }

    _warn(message, error) {
        if (typeof this.logger?.warn !== 'function') return;
        if (error?.message) {
            this.logger.warn(`[AIModelManagementService] ${message}:`, error.message);
            return;
        }
        this.logger.warn(`[AIModelManagementService] ${message}`);
    }

    async hydrateRuntimeModels() {
        if (!this.infrastructureRepository) return this.getActiveModels();

        let persisted = null;
        try {
            persisted = await this.infrastructureRepository.getSetting(RUNTIME_MODELS_SETTING_KEY);
        } catch (error) {
            this._warn('Failed to hydrate persisted models', error);
        }
        if (!persisted) return this.getActiveModels();

        const merged = mergePersistedIntoRuntime(this.runtimeModels, persisted);
        for (const target of MODEL_ROLE_TARGETS) {
            this.runtimeModels[target] = merged[target];
        }
        return this.getActiveModels();
    }

    async _persistRuntimeModels() {
        const active = this.getActiveModels();
        if (!this.infrastructureRepository) return active;
        try {
            await this.infrastructureRepository.saveSetting(RUNTIME_MODELS_SETTING_KEY, active);
            return active;
        } catch (error) {
            this._warn('Failed to persist active models', error);
            return active;
        }
    }

    /**
     * @returns {{ suggestion: string|null, summary: string|null, embedding: string|null }}
     */
    getActiveModels() {
        return sanitizeRuntimeModels(this.runtimeModels);
    }

    async setActiveModel(target, model) {
        assertValidTarget(target);
        const normalizedModel = coerceModelString(model);
        if (!normalizedModel) throw new Error('model is required');

        this.runtimeModels[target] = normalizedModel;
        await this._persistRuntimeModels();
        return this.getActiveModels();
    }

    isModelActive(modelName) {
        const candidate = normalizeModelName(modelName);
        return Object.values(this.getActiveModels()).some(
            (runtimeModel) => normalizeModelName(runtimeModel) === candidate
        );
    }

    async getModelCatalog() {
        const { installed } = await this.aiService.listModels();
        const candidates = collectCandidates({
            localModels: this.localModels,
            constrainedSet: this.constrainedModels,
            runtimeModels: this.runtimeModels,
            installedModels: installed,
        });
        const installedIndex = indexInstalledByNormalizedName(installed);
        return buildCatalogEntries(candidates, installedIndex, this.constrainedModels);
    }

    // Returns { installed, progress } so callers can co-locate catalog and pull state
    // queries in a single round trip.
    async getModelStatus() {
        return this.aiService.listModels();
    }
}

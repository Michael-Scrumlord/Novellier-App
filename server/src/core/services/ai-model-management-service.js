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

/**
 * Application service for AI model lifecycle and runtime configuration.
 *
 * Pure validation, formatting, and catalog assembly are delegated to the
 * domain modules above. This class is left with orchestration only:
 * config-port hydration, the mutable shared `runtimeModels` reference, and
 * I/O calls into the IModelManager port.
 */
export class AIModelManagementService {
    static VALID_TARGETS = MODEL_ROLE_TARGETS;

    constructor({
        modelManager,
        runtimeModels,
        localModels,
        constrainedModels,
        runtimeModelConfigPort,
        logger = console,
    } = {}) {
        if (!modelManager) {
            throw new Error('AIModelManagementService requires modelManager');
        }
        this.logger = logger;
        this.modelManager = modelManager;
        this.runtimeModels = (runtimeModels && typeof runtimeModels === 'object')
            ? runtimeModels
            : createDefaultRuntimeModels();
        this.localModels = Array.isArray(localModels) ? localModels : [];
        this.constrainedModels = buildConstrainedModelSet(constrainedModels);
        this.runtimeModelConfigPort = this._resolveRuntimeModelConfigPort(runtimeModelConfigPort);
    }

    _resolveRuntimeModelConfigPort(port) {
        if (!port) return null;
        const ok =
            typeof port.getRuntimeModels === 'function' &&
            typeof port.saveRuntimeModels === 'function';
        if (ok) return port;
        this._warn('Ignoring runtime model config port with invalid contract');
        return null;
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
        if (!this.runtimeModelConfigPort) return this.getActiveModels();

        let persisted = null;
        try {
            persisted = await this.runtimeModelConfigPort.getRuntimeModels();
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
        if (!this.runtimeModelConfigPort) return active;
        try {
            return await this.runtimeModelConfigPort.saveRuntimeModels(active);
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
        const installedModels = await this.modelManager.listInstalledModels();
        const candidates = collectCandidates({
            localModels: this.localModels,
            constrainedSet: this.constrainedModels,
            runtimeModels: this.runtimeModels,
            installedModels,
        });
        const installedIndex = indexInstalledByNormalizedName(installedModels);
        return buildCatalogEntries(candidates, installedIndex, this.constrainedModels);
    }

    async getPullProgress(modelName) {
        return this.modelManager.getPullProgress(modelName);
    }
}

import { normalizeModelName } from '../domain/ModelNameUtils.js';

/**
 * Core service for the Ollama model catalog.
 *
 * Responsibilities:
 * - Merge installed models with library index data.
 * - Decorate families and variants with runtime-role and download status.
 * - Provide filtered, query-driven catalog views.
 *
 * Design decisions (post Options C + D refactor):
 * - All outbound HTTP and HTML parsing lives in OllamaLibraryAdapter (IOllamaLibraryPort).
 * - Installed model queries delegate to modelManager (IModelManager) — not IAIService.
 * - This service handles only domain logic: decoration, filtering, role matching.
 */
export class OllamaModelCatalogService {
    constructor({ modelManager, ollamaLibraryPort, runtimeModels } = {}) {
        this.modelManager = modelManager || null;
        this.ollamaLibraryPort = ollamaLibraryPort || null;
        this.runtimeModels = runtimeModels || { suggestion: null, summary: null, embedding: null };
    }

    async getCatalog(query = '') {
        const installed = await this._getInstalledModelMap();
        const index = this.ollamaLibraryPort
            ? await this.ollamaLibraryPort.getLibraryIndex()
            : [];
        const normalizedQuery = String(query || '').trim().toLowerCase();

        const models = index
            .map((family) => this._decorateFamily(family, installed))
            .filter((entry) => {
                if (!normalizedQuery) return true;

                const haystack = [
                    entry.family,
                    entry.displayName,
                    entry.description,
                    ...(entry.sizeTags || []),
                ]
                    .filter(Boolean)
                    .join(' ')
                    .toLowerCase();

                return haystack.includes(normalizedQuery);
            });

        return { active: this._getActiveRoles(), models };
    }

    async getModelDetails(modelName) {
        const normalized = normalizeModelName(modelName);
        const installed = await this._getInstalledModelMap();
        const family = normalized.split(':')[0];

        if (!this.ollamaLibraryPort) {
            return { family, displayName: family, description: '', variants: [], selectedVariant: null, installedVariant: null, active: this._getActiveRoles() };
        }

        const detail = await this.ollamaLibraryPort.getModelDetail(family);

        const runtimeCandidates = Object.values(this.runtimeModels)
            .map(normalizeModelName)
            .filter(Boolean);

        const activeVariant = detail.variants.find((variant) =>
            runtimeCandidates.includes(normalizeModelName(variant.tag))
        );

        const selectedVariant =
            activeVariant ||
            detail.variants.find((variant) => normalizeModelName(variant.tag) === normalized) ||
            detail.variants[0] ||
            null;

        const installedVariant = selectedVariant
            ? installed.get(normalizeModelName(selectedVariant.tag)) || null
            : null;

        return {
            family: detail.family,
            displayName: detail.displayName,
            description: detail.description,
            selectedVariant: selectedVariant
                ? this._decorateVariant(selectedVariant, installed, family)
                : null,
            variants: detail.variants.map((variant) =>
                this._decorateVariant(variant, installed, family)
            ),
            installedVariant: installedVariant
                ? {
                    name: installedVariant.name,
                    sizeBytes: Number(installedVariant.size || 0) || null,
                }
                : null,
            active: this._getActiveRoles(),
        };
    }

    // ─── Private ───────────────────────────────────────────────────────────────

    _getActiveRoles() {
        return {
            suggestion: this.runtimeModels.suggestion,
            summary: this.runtimeModels.summary,
            embedding: this.runtimeModels.embedding,
        };
    }

    async _getInstalledModelMap() {
        const models = this.modelManager
            ? await this.modelManager.listInstalledModels()
            : [];

        const installed = new Map();
        for (const entry of models) {
            const name = String(entry?.name || '').trim();
            if (!name) continue;
            installed.set(normalizeModelName(name), entry);
        }

        return installed;
    }

    _decorateFamily(family, installed) {
        const installedTags = [];
        for (const [normalizedName, entry] of installed.entries()) {
            if (normalizedName.startsWith(normalizeModelName(family.family))) {
                installedTags.push({
                    name: entry.name,
                    sizeBytes: Number(entry.size || 0) || null,
                });
            }
        }

        return {
            family: family.family,
            displayName: family.displayName,
            description: family.description,
            sizeTags: family.sizeTags,
            pullCount: family.pullCount,
            downloaded: installedTags.length > 0,
            installedTags,
            estimatedRamGb: family.sizeTags?.[0]
                ? this._estimateRamFromSizeTag(family.sizeTags[0])
                : null,
            active: {
                suggestion: this._matchesRuntimeRole(family.family, this.runtimeModels.suggestion),
                summary: this._matchesRuntimeRole(family.family, this.runtimeModels.summary),
                embedding: this._matchesRuntimeRole(family.family, this.runtimeModels.embedding),
            },
        };
    }

    _decorateVariant(variant, installed, family) {
        const installedEntry =
            installed.get(normalizeModelName(variant.tag)) ||
            installed.get(normalizeModelName(family)) ||
            null;

        return {
            ...variant,
            downloaded: Boolean(installedEntry),
            diskSizeBytes: Number(installedEntry?.size || 0) || null,
            active: {
                suggestion: this._matchesRuntimeRole(variant.tag, this.runtimeModels.suggestion),
                summary: this._matchesRuntimeRole(variant.tag, this.runtimeModels.summary),
                embedding: this._matchesRuntimeRole(variant.tag, this.runtimeModels.embedding),
            },
        };
    }

    _matchesRuntimeRole(candidate, runtimeModel) {
        const normalizedCandidate = normalizeModelName(candidate);
        const normalizedRuntime = normalizeModelName(runtimeModel);
        return (
            normalizedCandidate === normalizedRuntime ||
            normalizedRuntime.startsWith(normalizedCandidate) ||
            normalizedCandidate.startsWith(normalizedRuntime)
        );
    }

    /**
     * Simple RAM estimation from a size tag like '7B', '3.8B'.
     * Kept inline since it's a lightweight heuristic, not shared infrastructure.
     */
    _estimateRamFromSizeTag(sizeTag) {
        const match = String(sizeTag || '')
            .trim()
            .match(/^(\d+(?:\.\d+)?)([KMGTP]?)(?:B|b)?$/i);
        if (!match) return null;

        const value = Number.parseFloat(match[1]);
        const unit = match[2].toUpperCase();
        const scale = { '': 1, K: 1 / 1024 / 1024, M: 1 / 1024, G: 1, T: 1024, P: 1024 * 1024 }[unit];
        if (!Number.isFinite(value) || !scale) return null;

        return Number((Math.max(0.5, value * scale * 0.7)).toFixed(1));
    }
}

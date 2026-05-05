// Manages persisted LLM generation parameters (temperature, num_predict, num_ctx, etc.).
// On hydrate, stored overrides are applied to the live adapter so changes take effect immediately
// without a server restart.

const PARAM_KEYS = ['temperature', 'num_predict', 'num_ctx', 'num_gpu', 'top_k', 'top_p', 'repeat_penalty'];

export class LlmParamsService {
    constructor({ repo, llmAdapter, hardwareDefaults, softDefaults } = {}) {
        if (!repo) throw new Error('LlmParamsService requires repo');
        if (!llmAdapter) throw new Error('LlmParamsService requires llmAdapter');
        this.repo = repo;
        this.llmAdapter = llmAdapter;
        this.hardwareDefaults = hardwareDefaults || {};
        this.softDefaults = softDefaults || {};
        this.storedParams = null;
    }

    async hydrate() {
        try {
            this.storedParams = await this.repo.getLlmModelParams();
            this._apply();
        } catch (error) {
            console.warn('[LlmParams] Hydration failed, using compiled defaults:', error.message);
        }
    }

    getParams() {
        return {
            params: this._effective(),
            stored: this.storedParams,
            defaults: this._allDefaults(),
        };
    }

    async setParams(updates) {
        const filtered = {};
        for (const key of PARAM_KEYS) {
            if (updates[key] != null) filtered[key] = Number(updates[key]);
        }
        await this.repo.saveLlmModelParams(filtered);
        this.storedParams = filtered;
        this._apply();
        return this.getParams();
    }

    async resetParams() {
        await this.repo.saveLlmModelParams(null);
        this.storedParams = null;
        this._apply();
        return this.getParams();
    }

    _allDefaults() {
        return {
            temperature: this.softDefaults.temperature,
            num_predict: this.softDefaults.num_predict,
            num_ctx: this.hardwareDefaults.num_ctx,
            num_gpu: this.hardwareDefaults.num_gpu,
            top_k: this.hardwareDefaults.top_k,
            top_p: this.hardwareDefaults.top_p,
            repeat_penalty: this.hardwareDefaults.repeat_penalty,
        };
    }

    _effective() {
        const d = this._allDefaults();
        const s = this.storedParams || {};
        return {
            temperature: s.temperature ?? d.temperature,
            num_predict: s.num_predict ?? d.num_predict,
            num_ctx: s.num_ctx ?? d.num_ctx,
            num_gpu: s.num_gpu ?? d.num_gpu,
            top_k: s.top_k ?? d.top_k,
            top_p: s.top_p ?? d.top_p,
            repeat_penalty: s.repeat_penalty ?? d.repeat_penalty,
        };
    }

    _apply() {
        const { temperature, num_predict, num_ctx, num_gpu, top_k, top_p, repeat_penalty } = this._effective();
        this.llmAdapter.setDefaultParams({
            temperature,
            numPredict: num_predict,
            num_ctx,
            num_gpu,
            top_k,
            top_p,
            repeat_penalty,
        });
    }
}
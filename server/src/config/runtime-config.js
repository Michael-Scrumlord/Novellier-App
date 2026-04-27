// Pure configuration helpers that derive runtime tuning values from host hardware.
// No database or HTTP calls — reads the os module and env strings only.
import os from 'os';
import { getModelSizeScore } from '../core/domain/ModelNameUtils.js';

export function pickSmallestModel(models, fallbackModel) {
    const sorted = [...models]
        .filter(Boolean)
        .map((model) => String(model).trim())
        .filter(Boolean)
        .sort((left, right) => {
            const leftScore = getModelSizeScore(left);
            const rightScore = getModelSizeScore(right);
            if (leftScore !== rightScore) return leftScore - rightScore;
            return left.localeCompare(right);
        });

    return sorted[0] || fallbackModel;
}

export function buildRagConfig() {
    const totalMemoryGB = os.totalmem() / 1024 ** 3;
    const cpuCores = os.cpus().length;

    if (totalMemoryGB >= 16 && cpuCores >= 8) {
        return { contextChunks: 5, maxContextTokens: 2000, batchSize: 10 };
    }
    if (totalMemoryGB >= 8 && cpuCores >= 4) {
        return { contextChunks: 3, maxContextTokens: 1000, batchSize: 5 };
    }
    return { contextChunks: 2, maxContextTokens: 500, batchSize: 3 };
}

export function buildLlmHardwareOptions() {
    const cpuCores = os.cpus().length;
    const totalMemoryGB = os.totalmem() / 1024 ** 3;

    return {
        num_ctx: totalMemoryGB >= 16 ? 4096 : 2048,
        num_thread: Math.max(cpuCores - 2, 4), // reserve two threads for non-LLM workloads
        num_gpu: 1,
        use_mmap: true,
        use_mlock: false,
        f16_kv: true,
        num_batch: totalMemoryGB >= 16 ? 512 : 256,
    };
}

export const DEFAULT_BASE_URL = 'http://ollama:11434';

export const TIMEOUTS = Object.freeze({
    UNARY: 60_000,
    GENERATE: 180_000,
    WARMUP: 120_000,
    STREAM: 600_000,
    PULL: 1_800_000,
    PROBE: 5_000,
});

export const KEEP_ALIVE = '30m';

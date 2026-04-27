// FIFO priority queue for serializing background LLM inference. Concurrency defaults to 1 (global
// lock). Abort-aware: aborted jobs are dropped before reaching the worker. Optionally checkpoints
// queue metadata to a store so post-restart admin views can report the last known queue depth.
export class AIJobQueue {
    constructor({ concurrency = 1, checkpointStore = null, logger } = {}) {
        this.concurrency = Math.max(1, concurrency);
        this.checkpointStore = checkpointStore;
        this.logger = logger || console;
        this.running = 0;
        this.pending = [];
        this.idCounter = 0;
    }

    enqueue(name, fn, { priority = 5, abortSignal = null } = {}) {
        return new Promise((resolve, reject) => {
            const job = {
                id: ++this.idCounter,
                name,
                fn,
                priority,
                abortSignal,
                resolve,
                reject,
                enqueuedAt: Date.now(),
            };

            if (abortSignal?.aborted) {
                reject(new Error('Job aborted before enqueue'));
                return;
            }

            this._insert(job);
            this._checkpoint();
            this._drain();
        });
    }

    snapshot() {
        return {
            running: this.running,
            pending: this.pending.length,
            pendingNames: this.pending.map((j) => j.name),
        };
    }

    _insert(job) {
        const idx = this.pending.findIndex((p) => p.priority > job.priority);
        if (idx === -1) this.pending.push(job);
        else this.pending.splice(idx, 0, job);
    }

    _checkpoint() {
        if (!this.checkpointStore) return;
        const payload = {
            running: this.running,
            pending: this.pending.map((j) => ({
                id: j.id,
                name: j.name,
                priority: j.priority,
                enqueuedAt: j.enqueuedAt,
            })),
        };
        Promise.resolve(this.checkpointStore.save(payload)).catch((err) =>
            this.logger.warn(`[AIJobQueue] checkpoint save failed: ${err.message}`)
        );
    }

    async _drain() {
        if (this.running >= this.concurrency) return;
        const job = this.pending.shift();
        if (!job) {
            this._checkpoint();
            return;
        }

        if (job.abortSignal?.aborted) {
            job.reject(new Error('Job aborted'));
            this._checkpoint();
            queueMicrotask(() => this._drain());
            return;
        }

        this.running++;
        this._checkpoint();
        const waitedMs = Date.now() - job.enqueuedAt;
        if (waitedMs > 500) {
            this.logger.log(`[AIJobQueue] ${job.name} started after ${waitedMs}ms queue wait`);
        }

        try {
            const result = await job.fn();
            job.resolve(result);
        } catch (error) {
            job.reject(error);
        } finally {
            this.running--;
            this._checkpoint();
            queueMicrotask(() => this._drain());
        }
    }
}

// Lightweight concurrency limiter for parallel work (e.g. embeddings). No priority or abort support.
export class ConcurrencyThrottle {
    constructor({ concurrency = 2, logger } = {}) {
        this.concurrency = Math.max(1, concurrency);
        this.logger = logger || console;
        this.running = 0;
        this.pending = [];
    }

    run(fn) {
        return new Promise((resolve, reject) => {
            this.pending.push({ fn, resolve, reject });
            this._drain();
        });
    }

    async _drain() {
        if (this.running >= this.concurrency) return;
        const task = this.pending.shift();
        if (!task) return;

        this.running++;
        try {
            task.resolve(await task.fn());
        } catch (error) {
            task.reject(error);
        } finally {
            this.running--;
            queueMicrotask(() => this._drain());
        }
    }
}

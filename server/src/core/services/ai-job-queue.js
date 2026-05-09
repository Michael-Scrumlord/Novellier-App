// FIFO priority queue for serializing background LLM inference. Concurrency defaults to 1 (global
// lock). Abort-aware: aborted jobs are dropped before reaching the worker. Optionally checkpoints
// queue metadata via IInfrastructureRepository.saveCheckpoint so post-restart admin views can
// report the last known queue depth.
export class AIJobQueue {
    constructor({ concurrency = 1, infrastructureRepository = null, logger } = {}) {
        this.concurrency = Math.max(1, concurrency);
        this.infrastructureRepository = infrastructureRepository;
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
                const err = new Error('Job aborted before enqueue');
                err.name = 'AbortError';
                reject(err);
                return;
            }

            this._insert(job);
            this._checkpoint();
            this._drain();
        });
    }

    _insert(job) {
        const idx = this.pending.findIndex((p) => p.priority > job.priority);
        if (idx === -1) this.pending.push(job);
        else this.pending.splice(idx, 0, job);
    }

    _checkpoint() {
        if (!this.infrastructureRepository) return;
        const payload = {
            running: this.running,
            pending: this.pending.map((j) => ({
                id: j.id,
                name: j.name,
                priority: j.priority,
                enqueuedAt: j.enqueuedAt,
            })),
        };
        Promise.resolve(this.infrastructureRepository.saveCheckpoint(payload)).catch((err) =>
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
            const err = new Error('Job aborted');
            err.name = 'AbortError';
            job.reject(err);
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

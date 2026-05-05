export class StreamingSemaphore {
    constructor({ concurrency = 2, logger } = {}) {
        this.concurrency = Math.max(1, Number(concurrency) || 1);
        this.logger = logger || console;
        this.inUse = 0;
        this.waiters = [];
    }

    snapshot() {
        return { inUse: this.inUse, waiting: this.waiters.length, concurrency: this.concurrency };
    }

    async acquire(abortSignal) {
        if (abortSignal?.aborted) {
            throw new Error('Stream aborted before semaphore acquire');
        }

        if (this.inUse < this.concurrency) {
            this.inUse++;
            return;
        }

        await new Promise((resolve, reject) => {
            const onAbort = () => {
                const idx = this.waiters.indexOf(waiter);
                if (idx !== -1) this.waiters.splice(idx, 1);
                reject(new Error('Stream aborted while waiting for semaphore'));
            };

            const waiter = {
                resolve: () => {
                    abortSignal?.removeEventListener?.('abort', onAbort);
                    resolve();
                },
            };

            abortSignal?.addEventListener?.('abort', onAbort, { once: true });
            this.waiters.push(waiter);
        });

        this.inUse++;
    }

    release() {
        this.inUse = Math.max(0, this.inUse - 1);
        const next = this.waiters.shift();
        if (next) next.resolve();
    }

    async withPermit(abortSignal, fn) {
        await this.acquire(abortSignal);
        try {
            return await fn();
        } finally {
            this.release();
        }
    }
}
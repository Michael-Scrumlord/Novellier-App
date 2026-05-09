export class StreamingSemaphore {
    constructor({ concurrency = 2 } = {}) {
        this.concurrency = Math.max(1, Number(concurrency) || 1);
        this.inUse = 0;
        this.waiters = [];
    }

    async acquire(abortSignal) {
        if (abortSignal?.aborted) {
            const err = new Error('Stream aborted before semaphore acquire');
            err.name = 'AbortError';
            throw err;
        }

        if (this.inUse < this.concurrency) {
            this.inUse++;
            return;
        }

        await new Promise((resolve, reject) => {
            const onAbort = () => {
                const idx = this.waiters.indexOf(waiter);
                if (idx !== -1) this.waiters.splice(idx, 1);
                const err = new Error('Stream aborted while waiting for semaphore');
                err.name = 'AbortError';
                reject(err);
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
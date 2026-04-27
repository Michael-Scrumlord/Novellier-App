// Port for AIJobQueue checkpointing. Persists queue metadata (pending job names, running count)
// on every enqueue and drain so post-restart admin views can report last known queue depth.
// Job closures are unrecoverable after restart — only metadata is saved. Implemented by MongoJobQueueCheckpointStore.
export class IJobQueueCheckpointStore {
    async load() {
        throw new Error('Not implemented');
    }

    async save(snapshot) {
        throw new Error('Not implemented');
    }
}

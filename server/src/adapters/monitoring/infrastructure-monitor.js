// Composite of the docker and mongo monitoring adapters. Exposed to LocalLLMAdapter so a
// single getTransportMetadata() call can return container, volume, and database health for
// the LLM stack.
export class InfrastructureMonitor {
    constructor({ dockerMonitor, mongoMonitor } = {}) {
        this.dockerMonitor = dockerMonitor || null;
        this.mongoMonitor = mongoMonitor || null;
    }

    async listContainers() {
        if (!this.dockerMonitor) throw new Error('Docker monitoring is not available');
        return this.dockerMonitor.listContainers();
    }

    async getVolumeStatus() {
        if (!this.dockerMonitor) throw new Error('Docker monitoring is not available');
        return this.dockerMonitor.getVolumeStatus();
    }

    async getMongoStatus() {
        if (!this.mongoMonitor) throw new Error('MongoDB monitoring is not available');
        return this.mongoMonitor.getStatus();
    }
}

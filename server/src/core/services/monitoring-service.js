// This is the service for infrastructure monitoring
// It provides orchestrates access to Docker container status and MongoDB health information, abstracting away the details of how that data is retrieved and formatted.
// Each query is independent, and this service acts as a thin layer that translates adapter results into a consistent domain shape for the controller to use.
export class MonitoringService {
    constructor({ dockerMonitor, mongoMonitor }) {
        this.dockerMonitor = dockerMonitor || null;
        this.mongoMonitor = mongoMonitor || null;
    }
    async getContainers() {
        if (!this.dockerMonitor) {
            throw new Error('Docker monitoring is not available');
        }
        const containers = await this.dockerMonitor.listContainers();
        return { containers };
    }

    async getVolumeStatus() {
        if (!this.dockerMonitor) {
            throw new Error('Docker monitoring is not available');
        }
        return this.dockerMonitor.getVolumeStatus();
    }

    async getMongoStatus() {
        if (!this.mongoMonitor) {
            throw new Error('MongoDB monitoring is not available');
        }
        const status = await this.mongoMonitor.getStatus();
        return { status };
    }
}

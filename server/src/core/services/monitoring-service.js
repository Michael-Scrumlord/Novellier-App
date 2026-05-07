// Thin facade over IAIService.getTransportMetadata. The infrastructure adapter is owned by
// LocalLLMAdapter; this service exists only to slice the metadata response into the three
// shapes the controller endpoints expect.
export class MonitoringService {
    constructor({ aiService }) {
        if (!aiService) throw new Error('MonitoringService requires aiService');
        this.aiService = aiService;
    }

    async getContainers() {
        const { infrastructure } = await this.aiService.getTransportMetadata();
        if (!infrastructure?.containers) {
            throw new Error('Docker monitoring is not available');
        }
        return { containers: infrastructure.containers };
    }

    async getVolumeStatus() {
        const { infrastructure } = await this.aiService.getTransportMetadata();
        if (!infrastructure?.volumes) {
            throw new Error('Docker monitoring is not available');
        }
        return infrastructure.volumes;
    }

    async getMongoStatus() {
        const { infrastructure } = await this.aiService.getTransportMetadata();
        if (!infrastructure?.mongo) {
            throw new Error('MongoDB monitoring is not available');
        }
        return { status: infrastructure.mongo };
    }
}

// This is the port interface for infrastructure monitoring. 
// It abstracts the driven-side dependencies like the docker socket and mongoDB admin connection.
// Each method returns a structured result object, and implementations are responsible for handling connection management and error translation.
export class IDockerMonitorPort {
    async listContainers() {
        throw new Error('Not implemented');
    }
    async getVolumeStatus() {
        throw new Error('Not implemented');
    }
}

export class IMongoMonitorPort {
    async getStatus() {
        throw new Error('Not implemented');
    }
}

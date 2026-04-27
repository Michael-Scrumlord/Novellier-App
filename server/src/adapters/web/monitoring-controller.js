// Provides the controller for monitoring Docker containers, volumes, and MongoDB status. 

export default class MonitoringController {
    constructor({ monitoringService }) {
        this.monitoringService = monitoringService;
    }

    async getContainers(req, res) {
        try {
            const result = await this.monitoringService.getContainers();
            return res.json(result);
        } catch (err) {
            console.error('Docker access error:', err.message);
            return res.status(500).json({ error: 'Cannot connect to Docker daemon' });
        }
    }

    async getVolumeStatus(req, res) {
        try {
            const result = await this.monitoringService.getVolumeStatus();
            return res.json(result);
        } catch (error) {
            console.error('Volume status error:', error.message);
            return res.status(500).json({ error: 'Failed to access Docker volume status' });
        }
    }

    async getMongoStatus(req, res) {
        try {
            const result = await this.monitoringService.getMongoStatus();
            return res.json(result);
        } catch (error) {
            console.error('Mongo status error:', error.message);
            res.status(500).json({ error: 'Failed to access MongoDB status' });
        }
    }
}

import http from 'http';
// Queries the docker socket directly.
export class DockerMonitoringAdapter {
    constructor({ projectName } = {}) {
        this.projectName = String(projectName || '').toLowerCase();
        const dockerHost = process.env.DOCKER_HOST || '';
        if (dockerHost.startsWith('tcp://')) {
            const url = new URL(dockerHost);
            this._transport = { type: 'tcp', host: url.hostname, port: Number(url.port) || 2375 };
        } else {
            this._transport = { type: 'socket', socketPath: '/var/run/docker.sock' };
        }
    }

    async listContainers() {
        const filterStr = encodeURIComponent(
            JSON.stringify({ label: [`com.docker.compose.project=${this.projectName}`] })
        );
        const raw = await this._dockerRequest(`/containers/json?all=true&filters=${filterStr}`);
        const containersRaw = JSON.parse(raw);

        return containersRaw.map((c) => ({
            id: c.Id.substring(0, 12),
            name: c.Names[0].replace('/', ''),
            image: c.Image,
            state: c.State,
            status: c.Status,
            role: c.Labels?.['com.docker.compose.service'] || 'unknown',
            cpuPercent: null,
            memory: null,
        }));
    }

    async getVolumeStatus() {
        const raw = await this._dockerRequest('/system/df');
        const parsed = JSON.parse(raw);
        const volumesRaw = Array.isArray(parsed?.Volumes) ? parsed.Volumes : [];

        const volumes = volumesRaw
            .filter((volume) => this._isRelevantVolume(volume.Name))
            .map((volume) => ({
                name: volume.Name,
                friendlyName: this._friendlyVolumeName(volume.Name),
                sizeBytes: Number(volume?.UsageData?.Size || 0),
                refCount: Number(volume?.UsageData?.RefCount || 0),
                mountpoint: volume.Mountpoint || null,
            }));

        const totalSizeBytes = volumes.reduce((total, volume) => total + volume.sizeBytes, 0);
        return { volumes, totalSizeBytes };
    }

    // Private function to make requests to the Docker API, abstracting transport details.
    _dockerRequest(path) {
        return new Promise((resolve, reject) => {
            const options =
                this._transport.type === 'tcp'
                    ? { host: this._transport.host, port: this._transport.port, path, method: 'GET' }
                    : { socketPath: this._transport.socketPath, path, method: 'GET' };

            const request = http.request(options, (response) => {
                let data = '';
                response.on('data', (chunk) => { data += chunk; });
                response.on('end', () => {
                    if (response.statusCode >= 400) {
                        reject(new Error(`Docker API request failed (${response.statusCode})`));
                        return;
                    }
                    resolve(data);
                });
            });

            request.on('error', (err) => reject(err));
            request.end();
        });
    }

    _isRelevantVolume(name) {
        const lower = String(name || '').toLowerCase();
        if (!lower) return false;
        return (
            lower.includes(this.projectName) ||
            lower.includes('novellier') ||
            lower.includes('ollama') ||
            lower.includes('mongo') ||
            lower.includes('chroma') ||
            lower.includes('portainer')
        );
    }

    _friendlyVolumeName(name) {
        const lower = String(name || '').toLowerCase();
        if (lower.includes('ollama')) return 'Ollama Models';
        if (lower.includes('mongo')) return 'Mongo Story Data';
        if (lower.includes('chroma')) return 'Chroma Vector Data';
        if (lower.includes('portainer')) return 'Portainer Data';
        return String(name || 'Unnamed Volume').replace(/[_-]+/g, ' ').trim();
    }
}
const SIZE_UNITS = ['B', 'KB', 'MB', 'GB', 'TB'];

export function formatBytes(bytes = 0) {
    if (!bytes) return '0 B';
    const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), SIZE_UNITS.length - 1);
    return `${(bytes / Math.pow(1024, index)).toFixed(2)} ${SIZE_UNITS[index]}`;
}

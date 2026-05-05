import { adminService } from '../../services/adminService.js';
import { useApiResource } from '../../hooks/useApiResource.js';
import { formatBytes } from '../../utils/formatUtils.js';
import { AdminPageHead, LoadingState, ErrorBanner, AdminTable } from './AdminStates.jsx';

const COLUMNS = [
    { key: 'friendlyName', label: 'Volume' },
    { key: 'name', label: 'Docker Name' },
    { key: 'size', label: 'Used Space', align: 'right' },
    { key: 'refCount', label: 'Attached Services', align: 'right' },
];

// This component provides an overview of the admin dashboard, focusing on the storage utilization of Docker volumes used by Novellier. 
// It fetches volume data from the admin service and displays it in a table format, along with some summary stats at the top.

function UnusedBadge() {
    const style = {
        marginLeft: '0.5rem',
        background: 'rgba(255, 149, 0, 0.15)',
        color: '#ff9500',
        border: '1px solid rgba(255, 149, 0, 0.3)',
    };
    return <span className="vision-badge" style={style} title="Unused volume (refcount 0)">Unused</span>;
}

function buildVolumeRow(volume) {
    return {
        key: volume.name,
        cells: {
            friendlyName: <span className="font-semibold">{volume.friendlyName}</span>,
            name: <span className="text-muted" style={{ fontFamily: 'monospace' }}>{volume.name}</span>,
            size: formatBytes(volume.sizeBytes),
            refCount: (
                <>
                    <span>{volume.refCount}</span>
                    {volume.refCount === 0 && <UnusedBadge />}
                </>
            ),
        },
    };
}

export default function AdminDashboardOverview({ token }) {
    const { data, loaded, error } = useApiResource(token, adminService.getVolumeStatus);
    const volumes = Array.isArray(data?.volumes) ? data.volumes : [];
    const totalSizeBytes = Number(data?.totalSizeBytes || 0);

    if (!loaded) {
        return <LoadingState message="Loading volume utilization..." />;
    }

    return (
        <section className="vision-module-container">
            <AdminPageHead
                crumb={['Admin', 'Overview']}
                title="Administrator Dashboard"
                desc="Storage utilization across Docker volumes used by Novellier services."
            />

            <ErrorBanner>{error}</ErrorBanner>

            {!error && (
                <>
                    <div className="glass-stat-grid">
                        <div className="surface-card surface-card--hoverable glass-stat-card">
                            <span className="eyebrow">Total Volume Storage</span>
                            <span className="glass-stat-value">{formatBytes(totalSizeBytes)}</span>
                        </div>
                        <div className="surface-card surface-card--hoverable glass-stat-card">
                            <span className="eyebrow">Tracked Volumes</span>
                            <span className="glass-stat-value">{volumes.length}</span>
                        </div>
                    </div>

                    <AdminTable
                        columns={COLUMNS}
                        rows={volumes.map(buildVolumeRow)}
                        emptyMessage="No Docker volumes were reported for this environment."
                    />
                </>
            )}
        </section>
    );
}

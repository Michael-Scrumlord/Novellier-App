import { adminService } from '../../services/adminService.js';
import { useApiResource } from '../../hooks/useApiResource.js';
import { formatBytes } from '../../utils/formatUtils.js';
import { AdminPageHead, LoadingState, ErrorBanner, EmptyState, AdminTable } from './AdminStates.jsx';
import './AdminModules.css';

// This component provides a dashboard for monitoring the status of the MongoDB instance used by the application.

const COLLECTION_COLUMNS = [
    { key: 'name', label: 'Collection Name' },
    { key: 'count', label: 'Document Count', align: 'right' },
    { key: 'size', label: 'Data Size', align: 'right' },
];

function totalCollectionSize(status) {
    if (!status?.collections) return 0;
    return status.collections.reduce((total, name) => total + (status.collectionSizes?.[name] || 0), 0);
}

function totalDocumentCount(status) {
    if (!status?.collections) return 0;
    return status.collections.reduce((total, name) => total + (status.counts?.[name] || 0), 0);
}

function buildCollectionRow(status, name) {
    return {
        key: name,
        cells: {
            name: <span className="font-semibold" style={{ fontFamily: 'monospace' }}>{name}</span>,
            count: (status.counts?.[name] ?? 0).toLocaleString(),
            size: <span className="text-muted">{formatBytes(status.collectionSizes?.[name] || 0)}</span>,
        },
    };
}

function StatusBadge({ ok }) {
    const dotClass = ok ? 'running' : 'stopped';
    const label = ok ? 'System Healthy' : 'Unavailable';
    return (
        <div className="glass-status-badge">
            <span className={`glass-status-dot ${dotClass}`} />
            {label}
        </div>
    );
}

export default function MongoMonitor({ token }) {
    const { data, loaded, error } = useApiResource(token, adminService.getMongoStatus);
    const status = data?.status || null;

    if (!loaded) {
        return <LoadingState message="Loading database status..." />;
    }

    if (error) {
        return (
            <div className="col-fill">
                <AdminPageHead crumb={['Admin', 'Infrastructure', 'Database']} title="MongoDB Status" desc="Connection and database health overview." />
                <ErrorBanner>{error}</ErrorBanner>
            </div>
        );
    }

    if (!status) {
        return (
            <div className="col-fill">
                <AdminPageHead crumb={['Admin', 'Infrastructure', 'Database']} title="MongoDB Status" desc="Connection and database health overview." />
                <EmptyState>No MongoDB status available.</EmptyState>
            </div>
        );
    }

    const collections = status.collections || [];

    return (
        <div className="col-fill">
            <AdminPageHead
                crumb={['Admin', 'Infrastructure', 'Database']}
                title="MongoDB Status"
                desc="Connection and database health overview."
                actions={<StatusBadge ok={status.ok} />}
            />

            <div className="glass-stat-grid">
                <div className="glass-stat-card surface-card--hoverable">
                    <span className="eyebrow glass-stat-label">Active Database</span>
                    <span className="glass-stat-value">{status.db}</span>
                </div>
                <div className="glass-stat-card surface-card--hoverable">
                    <span className="eyebrow glass-stat-label">Total Collections</span>
                    <span className="glass-stat-value">{collections.length}</span>
                </div>
                <div className="glass-stat-card surface-card--hoverable">
                    <span className="eyebrow glass-stat-label">Total Documents</span>
                    <span className="glass-stat-value">{totalDocumentCount(status).toLocaleString()}</span>
                </div>
                <div className="glass-stat-card surface-card--hoverable">
                    <span className="eyebrow glass-stat-label">Storage Footprint</span>
                    <span className="glass-stat-value">{formatBytes(totalCollectionSize(status))}</span>
                </div>
            </div>

            <div style={{ marginTop: '1rem' }}>
                <h3 style={{ color: 'var(--ink)', fontSize: '1.25rem', marginBottom: '1rem', fontWeight: 600 }}>
                    Collection Breakdown
                </h3>
                <AdminTable
                    columns={COLLECTION_COLUMNS}
                    rows={collections.map((name) => buildCollectionRow(status, name))}
                    emptyMessage="No collections found in this database."
                />
            </div>
        </div>
    );
}

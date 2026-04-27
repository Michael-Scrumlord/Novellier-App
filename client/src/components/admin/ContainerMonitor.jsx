import { useMemo } from 'react';
import { adminService } from '../../services/adminService.js';
import { useApiResource } from '../../hooks/useApiResource.js';
import { formatBytes } from '../../utils/formatUtils.js';
import { AdminPageHead, LoadingState, ErrorBanner, EmptyState } from './AdminStates.jsx';
import './AdminModules.css';

// This component provides a dashboard for monitoring Docker containers related to the application stack.
// It relies on the docker API to fetch container information. 

const ROLE_FRIENDLY_NAME = {
    'client-dev': 'Client (Development)',
    'client': 'Client (Production)',
    'server': 'Server API',
    'mongodb': 'MongoDB',
    'chromadb': 'ChromaDB',
    'ollama': 'Ollama Inference',
    'portainer': 'Portainer',
};

const TIERS = [
    { id: 'frontend', name: 'Frontend Tier', desc: 'User interface and dev environments', roles: ['client', 'client-dev'] },
    { id: 'app', name: 'Application Tier', desc: 'API routing and logic', roles: ['server'] },
    { id: 'data', name: 'Data Tier', desc: 'Persistence and vector storage', roles: ['mongodb', 'chromadb'] },
    { id: 'ai', name: 'Inference Tier', desc: 'Local AI engine', roles: ['ollama'] },
    { id: 'mgmt', name: 'Management Tier', desc: 'Infrastructure admin', roles: ['portainer'] },
];

function getFriendlyContainerName(container) {
    const role = String(container?.role || '').toLowerCase();
    return ROLE_FRIENDLY_NAME[role] || container?.name || 'Unknown Service';
}

function groupContainersIntoTiers(containers) {
    if (!containers.length) return [];

    const trackedRoles = TIERS.flatMap((tier) => tier.roles);

    const groups = TIERS
        .map((tier) => ({ ...tier, containers: containers.filter((c) => tier.roles.includes(c.role)) }))
        .filter((tier) => tier.containers.length > 0);

    const otherContainers = containers.filter((c) => !trackedRoles.includes(c.role));
    if (otherContainers.length > 0) {
        groups.push({
            id: 'other',
            name: 'Other Components',
            desc: 'Misc. or unclassified containers in the stack',
            containers: otherContainers,
        });
    }

    return groups;
}

function pickFillColor(percent) {
    if (percent > 80) return 'var(--terracotta)';
    return 'var(--accent)';
}

function formatCpu(container) {
    if (container.cpuPercent === null) return 'N/A';
    return `${container.cpuPercent.toFixed(1)}%`;
}

function formatMemoryText(container) {
    if (!container.memory) return 'N/A';
    return `${formatBytes(container.memory.usage)} / ${formatBytes(container.memory.limit)}`;
}

function MetricBar({ label, valueText, percent }) {
    const fillStyle = {
        width: `${Math.min(percent || 0, 100)}%`,
        background: pickFillColor(percent || 0),
    };

    return (
        <div className="glass-metric-group">
            <div className="glass-metric-label">
                <span>{label}</span>
                <span className="glass-metric-value">{valueText}</span>
            </div>
            <div className="glass-progress-container">
                <div className="glass-progress-bar">
                    <div className="glass-progress-fill" style={fillStyle} />
                </div>
            </div>
        </div>
    );
}

function ContainerCard({ container }) {
    const stateClass = container.state === 'running' ? 'running' : 'stopped';

    return (
        <div className="surface-card surface-card--hoverable vision-grid-card">
            <div className="vision-grid-card__header">
                <div>
                    <h4 className="vision-grid-card__title">{getFriendlyContainerName(container)}</h4>
                    <p className="vision-grid-card__subtitle">{container.name}</p>
                </div>
                <div className="glass-status-badge">
                    <span className={`glass-status-dot ${stateClass}`} />
                    {container.state || 'unknown'}
                </div>
            </div>

            <p className="vision-grid-card__subtitle" style={{ fontSize: '0.8rem', marginTop: '-0.5rem' }}>
                Image: {container.image}
            </p>
            <p className="vision-grid-card__subtitle" style={{ fontSize: '0.8rem', marginTop: '-0.75rem' }}>
                {container.status}
            </p>

            <MetricBar label="CPU Usage" valueText={formatCpu(container)} percent={container.cpuPercent} />
            <MetricBar label="Memory Allocation" valueText={formatMemoryText(container)} percent={container.memory?.percent} />
        </div>
    );
}

function TierSection({ tier }) {
    const headerStyle = {
        marginBottom: '1rem',
        borderBottom: '1px solid var(--border-subtle)',
        paddingBottom: '0.5rem',
    };

    return (
        <div className="vision-tier-section" style={{ marginBottom: '2rem' }}>
            <div className="vision-tier-header" style={headerStyle}>
                <h3 style={{ fontSize: '1.2rem', color: 'var(--ink)', margin: 0 }}>{tier.name}</h3>
                <p className="glass-module-subtitle" style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem' }}>
                    {tier.desc}
                </p>
            </div>
            <div className="vision-card-grid">
                {tier.containers.map((container) => (
                    <ContainerCard key={container.id} container={container} />
                ))}
            </div>
        </div>
    );
}

export default function ContainerMonitor({ token }) {
    const { data, loaded, error } = useApiResource(token, adminService.getContainers);
    const containers = useMemo(() => data?.containers || [], [data]);
    const tiers = useMemo(() => groupContainersIntoTiers(containers), [containers]);

    return (
        <div className="col-fill">
            <AdminPageHead
                crumb={['Admin', 'Infrastructure', 'Containers']}
                title="Container Monitoring"
                desc="Monitor Docker containers, health status, and system resources."
            />

            {!loaded && <LoadingState message="Loading containers..." />}
            {loaded && <ErrorBanner>{error}</ErrorBanner>}
            {loaded && !error && containers.length === 0 && (
                <EmptyState>No containers found in the current environment.</EmptyState>
            )}
            {loaded && !error && containers.length > 0 && (
                <div className="vision-architecture-view">
                    {tiers.map((tier) => <TierSection key={tier.id} tier={tier} />)}
                </div>
            )}
        </div>
    );
}

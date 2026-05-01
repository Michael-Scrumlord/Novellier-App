import { useEffect, useState } from 'react';

function useServerStatus() {
    const [status, setStatus] = useState('checking'); // 'checking' | 'online' | 'offline'

    useEffect(() => {
        const check = () => {
            fetch('/api/health', { signal: AbortSignal.timeout(4000) })
                .then(r => setStatus(r.ok ? 'online' : 'offline'))
                .catch(() => setStatus('offline'));
        };
        check();
        const id = setInterval(check, 30000);
        return () => clearInterval(id);
    }, []);

    return status;
}

const STATUS_LABEL = {
    checking: 'Connecting…',
    online: 'Connected',
    offline: 'Offline',
};

export default function PromptPanelHeader({ isCollapsed, onToggle, modelLabel }) {
    const status = useServerStatus();

    return (
        <div className={`spatial-sidebar__header${!isCollapsed ? ' row-between' : ''}`}>
            <button
                className="btn btn--glass btn--icon sidebar-toggle"
                onClick={onToggle}
                title={isCollapsed ? 'Expand AI Panel' : 'Collapse AI Panel'}
            >
                {isCollapsed ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                        <line x1="15" y1="3" x2="15" y2="21" />
                    </svg>
                ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M9 18l6-6-6-6" />
                    </svg>
                )}
            </button>
            {!isCollapsed && (
                <div className="pp-header__identity">
                    <span className="pp-header__eyebrow">AI Copilot</span>
                    <div className="pp-header__badge" title={STATUS_LABEL[status]}>
                        <span className="pp-header__model">{modelLabel || 'No model'}</span>
                        <span className={`pp-header__dot pp-header__dot--${status}`} />
                    </div>
                </div>
            )}
        </div>
    );
}

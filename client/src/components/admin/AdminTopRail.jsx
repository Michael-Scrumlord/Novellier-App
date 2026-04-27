// The top rail is the horizontal nav bar at the top of the admin panel. It looks better than a sidebar, imo. 

export default function AdminTopRail({ navigation, activeView, onNavigate, badges = {} }) {
    return (
        <div className="admin-top-rail" role="navigation" aria-label="Admin sections">
            <div className="admin-top-rail-left">
                <div className="admin-panel-meta">
                    <span className="admin-panel-meta__title">Admin Panel</span>
                    <span className="admin-panel-meta__sub">system hub</span>
                </div>

                <div className="admin-divider-v" />

                <div className="admin-nav">
                    {navigation.map((item) => (
                        <button
                            key={item.id}
                            className="admin-nav-item"
                            aria-current={item.id === activeView ? 'page' : undefined}
                            onClick={() => onNavigate?.(item.id)}
                            type="button"
                        >
                            {item.label}
                            {badges[item.id] != null && (
                                <span className="admin-nav-badge">{badges[item.id]}</span>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            <div className="admin-top-rail-right">
                <span className="admin-health">
                    <span className="admin-health-dot" aria-hidden="true" />
                    Healthy
                </span>
            </div>
        </div>
    );
}

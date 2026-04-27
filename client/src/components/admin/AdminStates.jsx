// This file contains shared layout components for the admin views. 
// The intention is to make some quick reusable components for some common patterns I've used in the panel.

export function AdminPageHead({ crumb, title, desc, actions }) {
    return (
        <div className="admin-page-head">
            <div>
                <div className="admin-breadcrumb">
                    {crumb.map((segment, i) => (
                        <span key={i}>
                            {i < crumb.length - 1 ? (
                                <>
                                    <span>{segment}</span>
                                    <span className="admin-breadcrumb__sep">/</span>
                                </>
                            ) : (
                                <span className="admin-breadcrumb__item--current">{segment}</span>
                            )}
                        </span>
                    ))}
                </div>
                <h2 className="admin-page-title">{title}</h2>
                {desc && <p className="admin-page-desc">{desc}</p>}
            </div>
            {actions && <div className="admin-page-actions">{actions}</div>}
        </div>
    );
}

export function ModuleHeader({ title, subtitle, right }) {
    const className = 'glass-module-header';

    return (
        <header className={className}>
            <div>
                <h2>{title}</h2>
                {subtitle && <p className="glass-module-subtitle">{subtitle}</p>}
            </div>
            {right}
        </header>
    );
}

export function LoadingState({ message = 'Loading...' }) {
    return (
        <div className="loader-container">
            <div className="spinner" />
            <p>{message}</p>
        </div>
    );
}

export function ErrorBanner({ children }) {
    if (!children) return null;
    return <div className="glass-error-banner">{children}</div>;
}

export function EmptyState({ icon, children }) {
    return (
        <div className="empty-state">
            {icon && <span className="empty-state__icon">{icon}</span>}
            <p>{children}</p>
        </div>
    );
}

const INLINE_BANNER_TONES = {
    success: { bg: 'rgba(52, 199, 89, 0.12)', border: 'rgba(52, 199, 89, 0.3)', color: '#2fb25e' },
    warning: { bg: 'rgba(255, 149, 0, 0.12)', border: 'rgba(255, 149, 0, 0.3)', color: '#ff9500' },
    error: { bg: 'rgba(255, 69, 58, 0.12)', border: 'rgba(255, 69, 58, 0.3)', color: '#ff6b6b' },
};

export function InlineBanner({ variant = 'warning', children }) {
    const tone = INLINE_BANNER_TONES[variant] || INLINE_BANNER_TONES.warning;
    const style = {
        padding: '0.5rem 0.75rem',
        borderRadius: '8px',
        fontSize: '0.82rem',
        background: tone.bg,
        border: `1px solid ${tone.border}`,
        color: tone.color,
    };
    return <div style={style}>{children}</div>;
}

export function AdminTable({ columns, rows, emptyMessage }) {
    if (!rows.length) {
        return (
            <div className="glass-table-wrapper">
                <table className="glass-table">
                    <thead>
                        <tr>
                            {columns.map((column) => (
                                <th key={column.key} className={column.align === 'right' ? 'align-right' : undefined}>
                                    {column.label}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td colSpan={columns.length} className="vision-empty-state--compact">
                                {emptyMessage || 'No data.'}
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        );
    }

    return (
        <div className="glass-table-wrapper">
            <table className="glass-table">
                <thead>
                    <tr>
                        {columns.map((column) => (
                            <th key={column.key} className={column.align === 'right' ? 'align-right' : undefined}>
                                {column.label}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row) => (
                        <tr key={row.key} className="glass-table-row">
                            {columns.map((column) => (
                                <td key={column.key} className={column.align === 'right' ? 'align-right' : undefined}>
                                    {row.cells[column.key]}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

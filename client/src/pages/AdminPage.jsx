import { useLocation, useNavigate } from 'react-router-dom';
import AdminPanel from '../components/admin/AdminPanel.jsx';
import { useAuthContext } from '../contexts/AuthContext.jsx';

// This file defines the AdminPage component, which serves as the main entry point for the admin interface. 
// It handles routing to determine which admin view is active based on the URL, and it renders the AdminPanel with the appropriate props. 
// The actual content of each admin view is handled by separate components that are rendered within AdminPanel based on the active view.

const ROUTE_TO_VIEW = {
    '/admin': 'dashboard',
    '/admin/containers': 'containers',
    '/admin/database': 'database',
};

const VIEW_TO_ROUTE = {
    dashboard: '/admin',
    containers: '/admin/containers',
    database: '/admin/database',
};

const QUERY_VIEWS = new Set(['users', 'stories', 'models', 'conversations']);

function resolveActiveView(pathname, search) {
    if (pathname === '/admin') {
        const queryView = new URLSearchParams(search).get('view');
        if (queryView && QUERY_VIEWS.has(queryView)) {
            return queryView;
        }
        return 'dashboard';
    }
    return ROUTE_TO_VIEW[pathname] || 'dashboard';
}

function resolveRouteForView(view) {
    if (VIEW_TO_ROUTE[view]) {
        return VIEW_TO_ROUTE[view];
    }
    if (QUERY_VIEWS.has(view)) {
        return `/admin?view=${view}`;
    }
    return '/admin';
}

export function AdminPage() {
    const { token } = useAuthContext();
    const { pathname, search } = useLocation();
    const navigate = useNavigate();

    const activeView = resolveActiveView(pathname, search);

    const handleNavigate = (nextView) => {
        const nextRoute = resolveRouteForView(nextView);
        const currentRoute = `${pathname}${search}`;
        if (nextRoute !== currentRoute) {
            navigate(nextRoute);
        }
    };

    return (
        <div id="admin">
            <AdminPanel token={token} activeView={activeView} onNavigate={handleNavigate} />
        </div>
    );
}

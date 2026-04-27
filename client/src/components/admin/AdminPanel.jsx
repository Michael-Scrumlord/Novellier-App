import { useEffect, useState } from 'react';
import { adminService } from '../../services/adminService.js';
import { storyService } from '../../services/storyService.js';
import { llmProvider } from '../../services/llmProvider.js';
import AdminTopRail from './AdminTopRail.jsx';
import UserManagement from './UserManagement.jsx';
import StoryManagement from './StoryManagement.jsx';
import ContainerMonitor from './ContainerMonitor.jsx';
import MongoMonitor from './MongoMonitor.jsx';
import ModelOperations from './ModelOperations.jsx';
import ConversationHistory from './ConversationHistory.jsx';
import AdminDashboardOverview from './AdminDashboardOverview.jsx';
import './AdminModules.css';

const NAVIGATION = [
    { id: 'dashboard', label: 'Dashboard Overview', Component: AdminDashboardOverview },
    { id: 'users', label: 'User Management', Component: UserManagement },
    { id: 'stories', label: 'Story Management', Component: StoryManagement },
    { id: 'containers', label: 'Containers', Component: ContainerMonitor },
    { id: 'database', label: 'Database', Component: MongoMonitor },
    { id: 'models', label: 'AI Models', Component: ModelOperations },
    { id: 'conversations', label: 'Conversations', Component: ConversationHistory },
];

// Admin Panel is the main component for that admin UI.
// It just provides the layout and navigation, while the actual content of each view is handled by separate components like the UserManagement, StoryManagement, etc.

function useBadges(token) {
    const [badges, setBadges] = useState({});
    useEffect(() => {
        if (!token) return;
        Promise.allSettled([
            adminService.listUsers(token),
            storyService.list(token),
            adminService.getContainers(token),
            adminService.getMongoStatus(token),
            llmProvider.getModelCatalog(token),
            adminService.listConversations(token),
        ]).then(([users, stories, containers, mongo, models, convos]) => {
            setBadges({
                users: users.value?.users?.length,
                stories: stories.value?.stories?.length ?? stories.value?.length,
                containers: containers.value?.containers?.filter(c => c.state === 'running').length,
                database: mongo.value?.status?.collections?.length,
                models: models.value?.models?.length,
                conversations: convos.value?.conversations?.length,
            });
        });
    }, [token]);
    return badges;
}

export default function AdminPanel({ token, activeView = 'dashboard', onNavigate }) {
    const badges = useBadges(token);
    const activeEntry = NAVIGATION.find((entry) => entry.id === activeView) || NAVIGATION[0];
    const ActiveView = activeEntry.Component;

    return (
        <div className="admin-rail-layout">
            <AdminTopRail
                navigation={NAVIGATION}
                activeView={activeView}
                onNavigate={onNavigate}
                badges={badges}
            />

            <main className="scroll-area--padded admin-rail-content">
                <div className="admin-view" key={activeView}>
                    <ActiveView token={token} />
                </div>
            </main>
        </div>
    );
}

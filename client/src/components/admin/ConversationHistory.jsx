import { useMemo, useState } from 'react';
import { adminService } from '../../services/adminService.js';
import { useApiResource } from '../../hooks/useApiResource.js';
import { AdminPageHead, LoadingState, ErrorBanner } from './AdminStates.jsx';
import ConfirmModal from '../common/ConfirmModal.jsx';

const fetchAdminConversations = (token) => adminService.listConversations(token, 200);
const fetchAdminUsers = (token) => adminService.listUsers(token);

function formatDate(dateValue) {
    if (!dateValue) return '--';
    return new Date(dateValue).toLocaleString();
}

function ConversationListItem({ group, isActive, onSelect, userName }) {
    return (
        <button
            className={`surface-card vision-conversation-item ${isActive ? 'active' : ''}`}
            type="button"
            onClick={() => onSelect(group.id)}
        >
            <strong>{group.model || 'Unknown model'}</strong>
            <span>{userName}</span>
            <span>{formatDate(group.createdAt)}</span>
            <small>{group.storyId || 'No story context'}</small>
            {group.messages.length > 1 && (
                <span className="vision-badge vision-badge--small" style={{ marginTop: '0.25rem' }}>
                    {group.messages.length} exchanges
                </span>
            )}
        </button>
    );
}

function ConversationDetail({ group, userName, onDelete }) {
    if (!group) {
        return <p className="text-muted">Select a conversation to inspect details.</p>;
    }

    return (
        <>
            <div className="vision-conversation-meta" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <p><strong>User:</strong> {userName}</p>
                    <p><strong>Model:</strong> {group.model || '--'}</p>
                    <p><strong>Feedback:</strong> {group.feedbackType || '--'}</p>
                    <p><strong>Created:</strong> {formatDate(group.createdAt)}</p>
                </div>
                <button className="btn btn--danger btn--small" onClick={() => onDelete(group)}>
                    Delete Conversation
                </button>
            </div>

            <div className="vision-conversation-scroll">
                {group.messages.map((msg, i) => {
                    const isSystem = msg.role === 'system';
                    return (
                        <div key={msg.id || i} style={{ marginBottom: '1.25rem' }}>
                            <div className="vision-conversation-bubble vision-conversation-bubble--user" style={{ marginBottom: '0.5rem' }}>
                                <h4>{isSystem ? 'System Step' : 'User Prompt'}</h4>
                                <pre>{msg.prompt || ''}</pre>
                            </div>
                            <div className="vision-conversation-bubble vision-conversation-bubble--ai">
                                <h4>AI Response</h4>
                                <pre>{msg.response || ''}</pre>
                            </div>
                        </div>
                    );
                })}
            </div>
        </>
    );
}

export default function ConversationHistory({ token }) {
    const { data, loaded, error } = useApiResource(token, fetchAdminConversations);
    const { data: usersData } = useApiResource(token, fetchAdminUsers);

    const [deletedIds, setDeletedIds] = useState(new Set());
    const [selectedId, setSelectedId] = useState(null);
    const [pendingDeleteGroup, setPendingDeleteGroup] = useState(null);

    const groupedConversations = useMemo(() => {
        const validRows = (data?.conversations || []).filter(r => !deletedIds.has(r.id));
        const map = new Map();
        const groups = [];

        validRows.forEach(row => {
            const key = row.interactionId || row.id;
            if (!map.has(key)) {
                const group = {
                    id: key,
                    model: row.model,
                    userId: row.userId,
                    storyId: row.storyId,
                    createdAt: row.createdAt,
                    feedbackType: row.feedbackType,
                    messages: []
                };
                groups.push(group);
                map.set(key, group);
            }
            map.get(key).messages.push(row);
        });

        groups.forEach(g => {
            g.messages.sort((a, b) => {
                if (a.role === 'user' && b.role !== 'user') return -1;
                if (b.role === 'user' && a.role !== 'user') return 1;
                return new Date(a.createdAt) - new Date(b.createdAt);
            });
            g.createdAt = g.messages[0]?.createdAt || g.createdAt;
        });

        return groups.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }, [data, deletedIds]);

    const usersList = useMemo(() => usersData?.users || [], [usersData]);
    const getUserName = (userId) => {
        const u = usersList.find(user => user.id === userId);
        return u ? (u.name || u.email) : (userId || 'Unknown User');
    };

    const effectiveId = selectedId || groupedConversations[0]?.id || null;
    const selectedGroup = useMemo(
        () => groupedConversations.find((g) => g.id === effectiveId) || null,
        [groupedConversations, effectiveId]
    );

    const handleDeleteClick = (group) => {
        setPendingDeleteGroup(group);
    };

    const handleDeleteConfirmed = async () => {
        const group = pendingDeleteGroup;
        if (!group) return;

        setPendingDeleteGroup(null);
        try {
            for (const msg of group.messages) {
                await adminService.deleteConversation(token, msg.id);
                setDeletedIds(prev => new Set(prev).add(msg.id));
            }
            if (selectedId === group.id) setSelectedId(null);
        } catch (e) {
            console.error(e);
            alert('Failed to delete one or more conversation segments');
        }
    };

    if (!loaded) {
        return <LoadingState message="Loading conversation history..." />;
    }

    return (
        <section className="vision-module-container">
            <AdminPageHead
                crumb={['Admin', 'Content', 'Conversations']}
                title="Conversation History"
                desc="Persisted AI exchanges from new requests onward."
            />

            <ErrorBanner>{error}</ErrorBanner>

            <div className="vision-conversation-layout">
                <aside className="vision-conversation-list">
                    {groupedConversations.map((group) => (
                        <ConversationListItem
                            key={group.id}
                            group={group}
                            isActive={group.id === effectiveId}
                            onSelect={setSelectedId}
                            userName={getUserName(group.userId)}
                        />
                    ))}
                </aside>

                <div className="surface-card vision-conversation-detail">
                    <ConversationDetail
                        group={selectedGroup}
                        userName={selectedGroup ? getUserName(selectedGroup.userId) : ''}
                        onDelete={handleDeleteClick}
                    />
                </div>
            </div>

            <ConfirmModal
                isOpen={!!pendingDeleteGroup}
                title="Delete Conversation"
                message="Are you sure you want to delete this entire conversation thread?"
                confirmLabel="Delete"
                tone="danger"
                onConfirm={handleDeleteConfirmed}
                onCancel={() => setPendingDeleteGroup(null)}
            />
        </section>
    );
}

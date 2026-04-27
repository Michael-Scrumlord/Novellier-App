import { useState } from 'react';
import { storyService } from '../../services/storyService.js';
import { useApiResource } from '../../hooks/useApiResource.js';
import { AdminPageHead, LoadingState, ErrorBanner, AdminTable } from './AdminStates.jsx';
import './AdminModules.css';

// This file provides an admin interface for managing user stories. 
// The component fetches story data using a hook and displays it in a structured table format, with progress indicators and formatted dates for easy review.

const COLUMNS = [
    { key: 'title', label: 'Title' },
    { key: 'genre', label: 'Genre' },
    { key: 'beats', label: 'Beats' },
    { key: 'progress', label: 'Progress' },
    { key: 'created', label: 'Created' },
    { key: 'updated', label: 'Updated' },
    { key: 'actions', label: 'Actions', align: 'right' },
];

const DATE_FORMAT = { month: 'short', day: 'numeric', year: '2-digit' };

function formatShortDate(value) {
    if (!value) return '--';
    return new Date(value).toLocaleDateString('en-US', DATE_FORMAT);
}

function getProgress(story) {
    const total = story.sections?.length || 0;
    if (total === 0) return 0;
    const completed = story.sections.filter((section) => section.content && section.content.trim().length > 0).length;
    return Math.round((completed / total) * 100);
}

function ProgressCell({ percent }) {
    return (
        <div className="glass-progress-container">
            <div className="glass-progress-bar">
                <div className="glass-progress-fill" style={{ width: `${percent}%` }} />
            </div>
            <span className="glass-progress-text">{percent}%</span>
        </div>
    );
}

function buildStoryRow(story, onDelete) {
    const buttonStyle = { padding: '0.4rem 0.8rem', fontSize: '0.85rem' };
    return {
        key: story.id,
        cells: {
            title: <span className="font-semibold">{story.title}</span>,
            genre: <span className="glass-badge">{story.genre || 'Uncategorized'}</span>,
            beats: story.sections?.length || 0,
            progress: <ProgressCell percent={getProgress(story)} />,
            created: <span className="text-muted">{formatShortDate(story.createdAt)}</span>,
            updated: <span className="text-muted">{formatShortDate(story.updatedAt)}</span>,
            actions: (
                <button
                    type="button"
                    className="btn btn--glass btn--danger"
                    style={buttonStyle}
                    onClick={() => onDelete(story.id)}
                    title="Delete this story"
                >
                    Delete
                </button>
            ),
        },
    };
}

export default function StoryManagement({ token }) {
    const { data, loaded, error: loadError, refetch } = useApiResource(token, storyService.list);
    const stories = data?.stories || [];

    const [mutationError, setMutationError] = useState('');

    const handleDeleteStory = async (id) => {
        if (!window.confirm('Delete this story? This action cannot be undone.')) return;

        setMutationError('');
        try {
            await storyService.remove(token, id);
            refetch();
        } catch (err) {
            setMutationError(err.message || 'Failed to delete story.');
        }
    };

    if (!loaded) {
        return <LoadingState message="Loading stories..." />;
    }

    return (
        <div className="col-fill">
            <AdminPageHead
                crumb={['Admin', 'Content', 'Stories']}
                title="Story Management"
                desc="View and manage all user stories across the platform."
            />

            <ErrorBanner>{loadError || mutationError}</ErrorBanner>

            {stories.length === 0 ? (
                <div className="admin-empty">
                    <div className="admin-empty-orb">{ }</div>
                    <div>
                        <h3>No stories yet</h3>
                        <p>When users begin writing, their drafts and published works will appear here for review and moderation.</p>
                    </div>
                </div>
            ) : (
                <AdminTable
                    columns={COLUMNS}
                    rows={stories.map((story) => buildStoryRow(story, handleDeleteStory))}
                />
            )}
        </div>
    );
}

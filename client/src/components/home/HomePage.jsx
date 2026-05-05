import { useMemo } from 'react';
import StoryCard from './StoryCard.jsx';
import './HomePage.css';
import '../../App.css';

function EmptyLibrary({ onCreate }) {
    return (
        <div className="home-page__empty flex-center" style={{ animationDelay: '0.1s' }}>
            <div className="empty-state__glass glass-card stack">
                <svg
                    className="empty-state__icon"
                    width="64"
                    height="64"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                >
                    <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
                </svg>
                <h3>No stories yet</h3>
                <p>Start your first story to begin your writing journey</p>
                <div className="empty-state__actions flex-center">
                    <button className="btn btn--primary" onClick={onCreate} type="button">
                        Create First Story
                    </button>
                </div>
            </div>
        </div>
    );
}

function LibraryHeader({ onCreate }) {
    return (
        <header className="home-page__header row-between glass-card animate-fade-in-up">
            <div className="home-page__title-group">
                <h2 className="text-heading">Your Library</h2>
                <p className="text-muted">Manage your writing projects and track your progress</p>
            </div>
            <div className="home-page__actions row">
                <button className="btn btn--primary" onClick={onCreate} type="button">
                    + New Story
                </button>
            </div>
        </header>
    );
}

export default function HomePageView({
    stories,
    onStorySelect,
    onCreate,
    onOpenStorySettings,
}) {
    const sortedStories = useMemo(
        () => [...stories].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)),
        [stories]
    );

    return (
        <div className="home-page">
            <LibraryHeader onCreate={onCreate} />

            {stories.length === 0 ? (
                <EmptyLibrary onCreate={onCreate} />
            ) : (
                <div className="home-page__grid" style={{ animationDelay: '0.1s' }}>
                    {sortedStories.map((story) => (
                        <StoryCard
                            key={story.id}
                            story={story}
                            onSelect={onStorySelect}
                            onOpenSettings={onOpenStorySettings}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
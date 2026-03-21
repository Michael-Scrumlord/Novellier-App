import React, { useMemo } from 'react';
import './Home.css';

const getGenreMotif = (genre) => {
    const motifs = {
        'Fantasy': 'FY', 
        'Sci-Fi': 'SF', 
        'Mystery': 'MY', 
        'Romance': 'RM',
        'Thriller': 'TH', 
        'Horror': 'HR', 
        'Drama': 'DR', 
        'Adventure': 'AD',
        'Historical': 'HS', 
        'Literary': 'LT', 
        'Comedy': 'CM', 
        'Crime': 'CR',
    };
    return motifs[genre] || '--'; 
};

const getStoryProgress = (story) => {
    if (!story.sections || story.sections.length === 0) return 0;
    const completed = story.sections.filter(sec => sec.content && sec.content.trim().length > 0).length;
    return Math.round((completed / story.sections.length) * 100);
};

const getStatusText = (progress) => {
    if (progress === 0) return 'Not started';
    if (progress < 50) return 'In progress';
    if (progress < 100) return 'Nearly complete';
    return 'Complete';
};

export default function HomePageView({
    stories,
    onStorySelect,
    onCreate,
    onCreateExample,
    onOpenStorySettings
}) {
  
    const sortedStories = useMemo(() => {
        return [...stories].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    }, [stories]);

    return (
        <div className="home-page animate-fade-in-up">
        <header className="home-page__header glass-card">
            <div className="home-page__title-group">
            <h2 className="text-heading">Your Library</h2>
            <p className="text-muted">Manage your writing projects and track your progress</p>
            </div>
            <div className="home-page__actions">
            <button className="btn btn--glass" onClick={onCreateExample} type="button">
                Create Example
            </button>
            <button className="btn btn--primary" onClick={onCreate} type="button">
                + New Story
            </button>
            </div>
        </header>

        {stories.length === 0 ? (
            <div className="home-page__empty">
            <div className="empty-state__glass">
                <div className="empty-state__icon">TODO: Book Icon</div>
                <h3>No stories yet</h3>
                <p>Start your first story to begin your writing journey</p>
                <div className="empty-state__actions">
                <button className="btn btn--primary" onClick={onCreate} type="button">
                    Create First Story
                </button>
                </div>
            </div>
            </div>
        ) : (
            <div className="home-page__grid">
            {sortedStories.map((story) => {
                const progress = getStoryProgress(story);
                const status = getStatusText(progress);

                return (
                <article
                    key={story.id}
                    className="story-card"
                    onClick={() => onStorySelect(story)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') onStorySelect(story);
                    }}
                >
                    <div className="story-card__header">
                    <div className="story-card__badge">
                        <span className="badge-icon">{getGenreMotif(story.genre)}</span>
                        <span className="badge-text">{story.genre || 'Draft'}</span>
                    </div>
                    <button
                        className="btn btn--glass btn--small"
                        onClick={(e) => {
                        e.stopPropagation();
                        onOpenStorySettings?.(story);
                        }}
                        title="Story settings"
                    >
                        Options
                    </button>
                    </div>

                    <div className="story-card__body">
                    <h3 className="story-card__title">{story.title}</h3>
                    <p className="story-card__status">{status}</p>
                    </div>

                    <div className="story-card__progress-section">
                    <div className="progress-bar">
                        <div className="progress-bar__fill" style={{ width: `${progress}%` }} />
                    </div>
                    <div className="progress-stats">
                        <span>{progress}% complete</span>
                        <span>{story.sections?.length || 0} sections</span>
                    </div>
                    </div>

                    <div className="story-card__footer">
                    <div className="story-card__date">
                        <span className="meta-label">Edited</span>
                        <span className="meta-value">
                        {new Date(story.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                    </div>
                    <div className="story-card__cta">
                        Continue →
                    </div>
                    </div>
                </article>
                );
            })}
            </div>
        )}
        </div>
    );
}
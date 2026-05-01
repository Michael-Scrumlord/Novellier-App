import { GENRE_MOTIFS } from '../../constants/genres.js';
import { getStoryProgress } from '../../utils/storyContentUtils.js';

const DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
});

function progressToStatusText(progress) {
    if (progress === 0) return 'Not started';
    if (progress < 50) return 'In progress';
    if (progress < 100) return 'Nearly complete';
    return 'Complete';
}

function CardHeader({ story, onOpenSettings }) {
    const handleSettingsClick = (event) => {
        event.stopPropagation();
        onOpenSettings?.(story);
    };

    return (
        <div className="story-card__header">
            <div className="story-card__badge">
                <span className="badge-icon" data-genre={story.genre}>{GENRE_MOTIFS[story.genre] || '--'}</span>
                <span className="badge-text">{story.genre || 'Draft'}</span>
            </div>
            <button
                className="btn btn--glass btn--small"
                onClick={handleSettingsClick}
                title="Story settings"
            >
                Options
            </button>
        </div>
    );
}

function CardProgress({ progress, sectionCount }) {
    return (
        <div className="story-card__progress-section">
            <div className="progress-bar">
                <div className="progress-bar__fill" style={{ width: `${progress}%` }} />
            </div>
            <div className="progress-stats">
                <span>{progress}% complete</span>
                <span>{sectionCount} sections</span>
            </div>
        </div>
    );
}

export default function StoryCard({ story, onSelect, onOpenSettings }) {
    const progress = getStoryProgress(story);
    const status = progressToStatusText(progress);

    const handleKeyDown = (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
            onSelect(story);
        }
    };

    return (
        <article
            className="story-card"
            onClick={() => onSelect(story)}
            role="button"
            tabIndex={0}
            onKeyDown={handleKeyDown}
        >
            <CardHeader story={story} onOpenSettings={onOpenSettings} />

            <div className="story-card__body">
                <h3 className="story-card__title">{story.title}</h3>
                <p className="story-card__status">{status}</p>
            </div>

            <CardProgress progress={progress} sectionCount={story.sections?.length || 0} />

            <div className="story-card__footer">
                <div className="story-card__date">
                    <span className="meta-label">Edited</span>
                    <span className="meta-value">{DATE_FORMATTER.format(new Date(story.updatedAt))}</span>
                </div>
                <div className="story-card__cta">Continue →</div>
            </div>
        </article>
    );
}

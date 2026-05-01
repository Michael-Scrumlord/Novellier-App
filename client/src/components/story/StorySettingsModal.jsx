import { useState } from 'react';
import { GENRE_OPTIONS } from '../../constants/genres.js';
import './StorySettingsModal.css';

function DangerZone({ onConfirmDelete }) {
    const [showConfirm, setShowConfirm] = useState(false);

    return (
        <div className="danger-zone">
            <div className="danger-zone__text">
                <h3>Danger Zone</h3>
                <p>This action cannot be undone. Please be careful.</p>
            </div>
            {showConfirm ? (
                <div className="danger-zone__confirm">
                    <p>Are you sure? This will erase all content.</p>
                    <div className="danger-zone__actions">
                        <button className="btn btn--glass" type="button" onClick={() => setShowConfirm(false)}>
                            Cancel
                        </button>
                        <button className="btn btn--danger" type="button" onClick={onConfirmDelete}>
                            Yes, Delete
                        </button>
                    </div>
                </div>
            ) : (
                <button className="btn btn--danger" type="button" onClick={() => setShowConfirm(true)}>
                    Delete Story
                </button>
            )}
        </div>
    );
}

function ModalHeader({ onClose }) {
    return (
        <div className="modal__header">
            <h2>Story Settings</h2>
            <button
                className="btn btn--glass btn--icon"
                type="button"
                onClick={onClose}
                aria-label="Close settings"
            >
                ✕
            </button>
        </div>
    );
}

function StorySettingsModalContent({ story, onClose, onSave, onDelete }) {
    const [title, setTitle] = useState(story.title || '');
    const [genre, setGenre] = useState(story.genre || '');

    const handleSubmit = (event) => {
        event.preventDefault();
        onSave({
            ...story,
            title: title.trim() || story.title,
            genre: genre || story.genre,
        });
        onClose();
    };

    const handleDelete = () => {
        onDelete(story.id);
        onClose();
    };

    return (
        <div className="modal-shell">
            <div className="modal-overlay" onClick={onClose} aria-hidden="true" />

            <div className="modal-window" role="dialog" aria-modal="true">
                <ModalHeader onClose={onClose} />

                <form onSubmit={handleSubmit} className="modal__form">
                    <div className="modal__content">
                        <div className="form-group">
                            <label htmlFor="story-title">Story Title</label>
                            <input
                                id="story-title"
                                type="text"
                                value={title}
                                onChange={(event) => setTitle(event.target.value)}
                                placeholder="Enter story title"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="story-genre">Genre</label>
                            <select
                                id="story-genre"
                                value={genre}
                                onChange={(event) => setGenre(event.target.value)}
                                className="spatial-select"
                            >
                                <option value="" disabled>Choose a genre</option>
                                {GENRE_OPTIONS.map((option) => (
                                    <option key={option} value={option}>
                                        {option}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="modal__divider" />

                        <DangerZone onConfirmDelete={handleDelete} />
                    </div>

                    <div className="modal__footer">
                        <button className="btn btn--glass" type="button" onClick={onClose}>
                            Cancel
                        </button>
                        <button className="btn btn--primary" type="submit">
                            Save Changes
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default function StorySettingsModal({ story, isOpen, onClose, onSave, onDelete }) {
    if (!isOpen || !story) return null;
    return (
        <StorySettingsModalContent
            key={story.id}
            story={story}
            onClose={onClose}
            onSave={onSave}
            onDelete={onDelete}
        />
    );
}

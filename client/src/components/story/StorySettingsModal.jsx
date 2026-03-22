import { useState, useEffect } from 'react';
import './StorySettingsModal.css';

const GENRE_OPTIONS = [
    'Fantasy', 'Sci-Fi', 'Mystery', 'Romance', 'Thriller', 'Horror',
    'Drama', 'Adventure', 'Historical', 'Literary', 'Comedy', 'Crime'
];

export default function StorySettingsModal({
    story,
    isOpen,
    onClose,
    onSave,
    onDelete
}) {
    const [title, setTitle] = useState('');
    const [genre, setGenre] = useState('');
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    useEffect(() => {
        if (isOpen && story) {
            setTitle(story.title || '');
            setGenre(story.genre || '');
            setShowDeleteConfirm(false); 
        }
    }, [isOpen, story]);

    if (!isOpen || !story) return null;

    const handleSubmit = (e) => {
        e.preventDefault(); 
        onSave({
            ...story,
            title: title.trim() || story.title,
            genre: genre || story.genre
        });
        onClose();
    };

    const handleDelete = () => {
        onDelete(story.id);
        onClose();
    };

    return (
        <div className="modal-container">
            <div className="modal-overlay" onClick={onClose} aria-hidden="true" />
          
            <div className="modal-window" role="dialog" aria-modal="true">
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

                <form onSubmit={handleSubmit} className="modal__form">
                    <div className="modal__content">
                      
                        <div className="form-group">
                            <label htmlFor="story-title">Story Title</label>
                            <input
                                id="story-title"
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Enter story title"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="story-genre">Genre</label>
                            <select
                                id="story-genre"
                                value={genre}
                                onChange={(e) => setGenre(e.target.value)}
                                className="spatial-select"
                            >
                                <option value="" disabled>Choose a genre</option>
                                {GENRE_OPTIONS.map((g) => (
                                  <option key={g} value={g}>{g}</option>
                                ))}
                            </select>
                        </div>

                        <div className="modal__divider" />

                        <div className="danger-zone">
                            <div className="danger-zone__text">
                                <h3>Danger Zone</h3>
                                <p>This action cannot be undone. Please be careful.</p>
                            </div>
                          
                            {!showDeleteConfirm ? (
                              <button
                                className="btn btn--danger"
                                type="button"
                                onClick={() => setShowDeleteConfirm(true)}
                              >
                                Delete Story
                              </button>
                            ) : (
                            <div className="danger-zone__confirm">
                                <p>Are you sure? This will erase all content.</p>
                                <div className="danger-zone__actions">
                                    <button
                                      className="btn btn--glass"
                                      type="button"
                                      onClick={() => setShowDeleteConfirm(false)}
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      className="btn btn--danger"
                                      type="button"
                                      onClick={handleDelete}
                                    >
                                      Yes, Delete
                                    </button>
                                </div>
                            </div>
                          )}
                        </div>
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
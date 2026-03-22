import { useEffect, useMemo, useState } from 'react';
import { DEFAULT_SECTION } from '../../lib/storyTemplates.js';
import { GENRE_OPTIONS } from '../../constants/genres.js';
import './TemplateWizard.css';

export default function TemplateWizard({ isOpen, templates, onClose, onCreate }) {
    const [step, setStep] = useState('start');
    const [useTemplate, setUseTemplate] = useState(true);
    const [selectedTemplateId, setSelectedTemplateId] = useState('');
    const [title, setTitle] = useState('Untitled draft');
    const [editableBeats, setEditableBeats] = useState([]);
    const [customGenre, setCustomGenre] = useState('');

    const selectedTemplate = useMemo(
        () => templates.find((template) => template.id === selectedTemplateId),
        [templates, selectedTemplateId]
    );

    useEffect(() => {
        if (!isOpen) {
        setStep('start');
        setUseTemplate(true);
        setSelectedTemplateId('');
        setTitle('Untitled draft');
        setCustomGenre('');
        setEditableBeats([]);
        }
    }, [isOpen]);

    const handleStart = (choice) => {
        setUseTemplate(choice);
        if (!choice) {
        setSelectedTemplateId('');
        setEditableBeats([]);
        setStep('confirm');
        } else {
        setStep('genre');
        }
    };

    const handleGenreSelect = (templateId) => {
        setSelectedTemplateId(templateId);
        const template = templates.find(t => t.id === templateId);
        if (template) {
        setEditableBeats(
            template.beats.map((beat) => ({
            key: beat.key,
            label: beat.label,
            guidance: beat.guidance
            }))
        );
        }
        setStep('confirm');
    };

    const updateBeat = (index, updates) => {
        setEditableBeats((prev) =>
        prev.map((beat, idx) => (idx === index ? { ...beat, ...updates } : beat))
        );
    };

    const removeBeat = (index) => {
        setEditableBeats((prev) => prev.filter((_, idx) => idx !== index));
    };

    const addBeat = () => {
        const nextIndex = editableBeats.length + 1;
        setEditableBeats((prev) => [
        ...prev,
        {
            key: `beat-${nextIndex}`,
            label: `New beat ${nextIndex}`,
            guidance: 'Describe the intent of this beat.'
        }
        ]);
    };

    const handleCreate = () => {
        const sections = useTemplate && selectedTemplate
        ? editableBeats.map((beat, index) => ({
            id: `${beat.key || 'beat'}-${index}`,
            beatKey: beat.key || `beat-${index + 1}`,
            title: beat.label,
            guidance: beat.guidance,
            content: ''
            }))
        : [{ ...DEFAULT_SECTION, content: '' }];

        onCreate({
        title,
        templateId: useTemplate ? selectedTemplate?.id || null : null,
        genre: useTemplate ? (selectedTemplate?.genre || null) : (customGenre || null),
        sections
        });
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="modal-container">
        <div className="modal-overlay" onClick={onClose} aria-hidden="true" />
        
        <div className="modal-window" style={{ maxWidth: '700px' }} role="dialog" aria-modal="true">
            
            <div className="modal__header">
            <div>
                <h2>{step === 'start' ? 'Create a new story' : step === 'genre' ? 'Choose a Genre' : 'Finalize Details'}</h2>
                <p className="modal-p" style={{margin: 0, fontSize: '0.9rem'}}>
                {step === 'start' ? 'Start from a beat template or begin with a blank draft.' : 
                step === 'genre' ? 'Select a structural foundation.' : 'Adjust your beats and title.'}
                </p>
            </div>
            <button type="button" className="btn btn--glass btn--icon" onClick={onClose} aria-label="Close">
                ✕
            </button>
            </div>

            {step === 'start' && (
            <div className="modal__content">
                <div className="wizard-grid wizard-grid--2col">
                <button type="button" className="spatial-card" onClick={() => handleStart(true)}>
                    <h3>Start from a template</h3>
                    <p>Use genre-based beats to guide your drafting.</p>
                </button>
                <button type="button" className="spatial-card" onClick={() => handleStart(false)}>
                    <h3>Start blank</h3>
                    <p>Open a single draft section and build freely.</p>
                </button>
                </div>
            </div>
            )}

            {step === 'genre' && (
            <div className="modal__content">
                <div className="wizard-grid wizard-grid--3col">
                {templates.map((template) => (
                    <button
                    key={template.id}
                    type="button"
                    className="spatial-card spatial-card--small"
                    onClick={() => handleGenreSelect(template.id)}
                    >
                    <h4>{template.genre}</h4>
                    <p>{template.beats.length} story beats</p>
                    </button>
                ))}
                </div>
            </div>
            )}

            {step === 'confirm' && (
            <div className="modal__content">
                <div className="form-group">
                <label htmlFor="story-title">Story title</label>
                <input 
                    id="story-title"
                    value={title} 
                    onChange={(e) => setTitle(e.target.value)} 
                    autoFocus
                />
            </div>

            {!useTemplate && (
                    <div className="form-group">
                        <label htmlFor="custom-genre">Genre</label>
                        <select
                            id="custom-genre"
                            value={customGenre}
                            onChange={(e) => setCustomGenre(e.target.value)}
                            className="spatial-select"
                            style={{ width: '100%', padding: '0.8rem 1rem', borderRadius: '12px', border: '1px solid var(--border-subtle)', background: 'rgba(0,0,0,0.05)', color: 'var(--ink)' }}
                        >
                            <option value="" disabled>Select a genre...</option>
                            {GENRE_OPTIONS.map((g) => (
                                <option key={g} value={g}>{g}</option>
                            ))}
                        </select>
                    </div>
                )}
                
                <div className="modal__divider" />

                {useTemplate && selectedTemplate ? (
                <div className="beat-preview">
                    <div className="beat-preview__header">
                    <h3>{selectedTemplate.genre} Beats</h3>
                    <button type="button" className="btn btn--glass btn--small" onClick={addBeat}>
                        + Add Beat
                    </button>
                    </div>
                    
                    <div className="beat-editor-list">
                    {editableBeats.map((beat, index) => (
                        <div className="beat-editor__row" key={`${beat.key}-${index}`}>
                        <div className="form-group" style={{marginBottom: 0}}>
                            <label>Beat title</label>
                            <input
                            value={beat.label}
                            onChange={(e) => updateBeat(index, { label: e.target.value })}
                            />
                        </div>
                        <div className="form-group" style={{marginBottom: 0}}>
                            <label>Guidance</label>
                            <input
                            value={beat.guidance}
                            onChange={(e) => updateBeat(index, { guidance: e.target.value })}
                            />
                        </div>
                        <button
                            type="button"
                            className="btn btn--glass btn--icon"
                            onClick={() => removeBeat(index)}
                            title="Remove beat"
                            style={{ alignSelf: 'flex-end', marginBottom: '4px' }}
                        >
                            ✕
                        </button>
                        </div>
                    ))}
                    </div>
                </div>
                ) : (
                <div className="beat-preview">
                    <h3>Blank draft</h3>
                    <p className="modal-p">Starting with a single, unstructured drafting section.</p>
                </div>
                )}
            </div>
            )}

            <div className="modal__footer">
            {step !== 'start' && (
                <button type="button" className="btn btn--glass" style={{marginRight: 'auto'}} onClick={() => setStep(step === 'confirm' && useTemplate ? 'genre' : 'start')}>
                ← Back
                </button>
            )}
            <button type="button" className="btn btn--glass" onClick={onClose}>
                Cancel
            </button>
            {step === 'confirm' && (
                <button type="button" className="btn btn--primary" onClick={handleCreate}>
                Create story
                </button>
            )}
            </div>

        </div>
        </div>
    );
}
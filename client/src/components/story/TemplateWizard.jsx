import { GENRE_OPTIONS } from '../../constants/genres.js';
import { useTemplateWizard } from '../../hooks/useTemplateWizard.js';
import { STEP_COPY } from '../../utils/templateWizardUtils.js';
import './TemplateWizard.css';

function WizardHeader({ step, onClose }) {
    const copy = STEP_COPY[step];

    return (
        <div className="modal__header row-between">
            <div>
                <h2>{copy.title}</h2>
                <p className="modal-p text-muted-sm">
                    {copy.subtitle}
                </p>
            </div>
            <button type="button" className="btn btn--glass btn--icon" onClick={onClose} aria-label="Close">
                ✕
            </button>
        </div>
    );
}

function StartStep({ onStart }) {
    return (
        <div className="wizard-grid wizard-grid--2col">
            <button type="button" className="spatial-card flex-col" onClick={() => onStart(true)}>
                <h3>Start from a template</h3>
                <p>Use genre-based beats to guide your drafting.</p>
            </button>
            <button type="button" className="spatial-card flex-col" onClick={() => onStart(false)}>
                <h3>Start blank</h3>
                <p>Open a single draft section and build freely.</p>
            </button>
        </div>
    );
}

function GenreStep({ templates, onSelect }) {
    return (
        <div className="wizard-grid wizard-grid--3col">
            {templates.map((template) => (
                <button
                    key={template.id}
                    type="button"
                    className="spatial-card spatial-card--small flex-col"
                    onClick={() => onSelect(template.id)}
                >
                    <h4>{template.genre}</h4>
                    <p>{template.beats.length} story beats</p>
                </button>
            ))}
        </div>
    );
}

function BeatRow({ beat, index, onUpdate, onRemove }) {
    return (
        <div className="beat-editor__row">
            <div className="form-group">
                <label>Beat title</label>
                <input
                    value={beat.label}
                    onChange={(event) => onUpdate(index, { label: event.target.value })}
                />
            </div>
            <div className="form-group">
                <label>Guidance</label>
                <input
                    value={beat.guidance}
                    onChange={(event) => onUpdate(index, { guidance: event.target.value })}
                />
            </div>
            <button
                type="button"
                className="btn btn--glass btn--icon"
                onClick={() => onRemove(index)}
                title="Remove beat"
            >
                ✕
            </button>
        </div>
    );
}

function BeatEditorList({ beats, onUpdate, onRemove }) {
    return (
        <div className="beat-editor-list stack--sm">
            {beats.map((beat, index) => (
                <BeatRow
                    key={`${beat.key}-${index}`}
                    beat={beat}
                    index={index}
                    onUpdate={onUpdate}
                    onRemove={onRemove}
                />
            ))}
        </div>
    );
}

function ConfirmStep({
    state,
    dispatch,
    selectedTemplate,
}) {
    const showTemplateBeats = state.useTemplate && selectedTemplate;

    return (
        <>
            <div className="form-group">
                <label htmlFor="story-title">Story title</label>
                <input
                    id="story-title"
                    className="glass-input full-width"
                    value={state.title}
                    onChange={(event) => dispatch({ type: 'SET_FIELD', field: 'title', value: event.target.value })}
                    autoFocus
                />
            </div>

            {!state.useTemplate && (
                <div className="form-group">
                    <label htmlFor="custom-genre">Genre</label>
                    <select
                        id="custom-genre"
                        value={state.customGenre}
                        onChange={(event) => dispatch({ type: 'SET_FIELD', field: 'customGenre', value: event.target.value })}
                        className="glass-input full-width"
                    >
                        <option value="" disabled>Select a genre...</option>
                        {GENRE_OPTIONS.map((option) => (
                            <option key={option} value={option}>{option}</option>
                        ))}
                    </select>
                </div>
            )}

            <div className="modal__divider" />

            {showTemplateBeats ? (
                <div className="beat-preview">
                    <div className="beat-preview__header row-between">
                        <h3>{selectedTemplate.genre} Beats</h3>
                        <button type="button" className="btn btn--glass btn--small" onClick={() => dispatch({ type: 'ADD_BEAT' })}>
                            + Add Beat
                        </button>
                    </div>
                    <BeatEditorList 
                        beats={state.editableBeats} 
                        onUpdate={(index, updates) => dispatch({ type: 'UPDATE_BEAT', index, updates })} 
                        onRemove={(index) => dispatch({ type: 'REMOVE_BEAT', index })} 
                    />
                </div>
            ) : (
                <div className="beat-preview">
                    <h3>Blank draft</h3>
                    <p className="modal-p">Starting with a single, unstructured drafting section.</p>
                </div>
            )}
        </>
    );
}

export default function TemplateWizard({ isOpen, templates, onClose, onCreate }) {
    const { state, dispatch, selectedTemplate, handleStart, handleGenreSelect, handleCreate } = useTemplateWizard({ templates, onCreate, onClose });

    if (!isOpen) return null;

    return (
        <div className="modal-shell">
            <div className="modal-overlay" onClick={onClose} aria-hidden="true" />
            <div className="modal-window" role="dialog" aria-modal="true">
                <WizardHeader step={state.step} onClose={onClose} />

                <div className="modal__content scroll-area">
                    {state.step === 'start' && <StartStep onStart={handleStart} />}
                    {state.step === 'genre' && (
                        <GenreStep templates={templates} onSelect={handleGenreSelect} />
                    )}
                    {state.step === 'confirm' && (
                        <ConfirmStep
                            state={state}
                            dispatch={dispatch}
                            selectedTemplate={selectedTemplate}
                        />
                    )}
                </div>

                <div className="modal__footer row-between">
                    {state.step !== 'start' ? (
                        <button
                            type="button"
                            className="btn btn--glass"
                            onClick={() => dispatch({ type: 'BACK' })}
                        >
                            ← Back
                        </button>
                    ) : <div className="flex-1" />}
                    <div className="flex-row gap-3">
                        <button type="button" className="btn btn--glass" onClick={onClose}>
                            Cancel
                        </button>
                        {state.step === 'confirm' && (
                            <button type="button" className="btn btn--primary" onClick={handleCreate}>
                                Create story
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function ModeToggleButton({ label, active, onClick }) {
    return (
        <button
            onClick={onClick}
            className={`mode-toggle-btn${active ? ' mode-toggle-btn--active' : ''}`}
        >
            {label}
        </button>
    );
}

export function PromptPanelControls({ aiMode, setAiMode, feedbackType, setFeedbackType, feedbackOptions }) {
    return (
        <div className="prompt-panel__controls">
            <div className="mode-toggle-bar">
                <ModeToggleButton label="Reviewer" active={aiMode === 'copilot'} onClick={() => setAiMode('copilot')} />
                <ModeToggleButton label="Tools" active={aiMode === 'tools'} onClick={() => setAiMode('tools')} />
            </div>

            {aiMode === 'copilot' && (
                <select
                    className="spatial-select spatial-select--small"
                    value={feedbackType}
                    onChange={(event) => setFeedbackType(event.target.value)}
                >
                    {feedbackOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                </select>
            )}
        </div>
    );
}

export function PromptPanelAnchor({ aiPrompt, setAiPrompt, aiMode, isSuggesting, onSuggest }) {
    const handleKeyDown = (event) => {
        if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
            event.preventDefault();
            onSuggest();
        }
    };

    const placeholder = aiMode === 'tools'
        ? 'Populate facts, extract from this section, add a fact... (⌘+Enter)'
        : 'Ask for feedback (⌘+Enter)';

    const submitLabel = isSuggesting
        ? '⏹ Stop Process'
        : aiMode === 'tools'
            ? 'Execute Tool'
            : 'Analyze Current Chapter';

    return (
        <div className="ai-input-anchor">
            <textarea
                value={aiPrompt}
                onChange={(event) => setAiPrompt(event.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                rows={2}
                className="prompt-panel__textarea"
            />
            <button
                className={`btn ${isSuggesting ? 'btn--danger' : 'btn--primary'} prompt-panel__submit`}
                onClick={onSuggest}
            >
                {submitLabel}
            </button>
        </div>
    );
}

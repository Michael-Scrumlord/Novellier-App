import { useAutoScroll } from '../../hooks/useAutoScroll.js';
import { FEEDBACK_OPTIONS } from '../../constants/ai.js';
import PromptPanelHeader from './PromptPanelHeader.jsx';
import PromptPanelOutput from './PromptPanelOutput.jsx';
import { PromptPanelControls, PromptPanelAnchor } from './PromptPanelInput.jsx';
import './PromptPanel.css';

export default function PromptPanel({ aiCtx, selectedModel, isCollapsed, onToggle, onSuggest }) {
    const {
        aiPrompt, setAiPrompt,
        aiResponse, toolEvents = [], isSuggesting,
        feedbackType, setFeedbackType,
        aiMode, setAiMode,
        progress,
    } = aiCtx;

    const modelLabel = (selectedModel || '').split(':')[0];

    const { ref: scrollRef, onScroll } = useAutoScroll({
        triggers: [aiResponse, toolEvents],
        active: isSuggesting,
        paused: isCollapsed,
    });

    return (
        <aside className={`spatial-sidebar col-fill-w ${isCollapsed ? 'spatial-sidebar--collapsed' : ''}`}>
            <PromptPanelHeader
                isCollapsed={isCollapsed}
                onToggle={onToggle}
                modelLabel={modelLabel}
            />

            {!isCollapsed && (
                <div className="prompt-panel__body">
                    <PromptPanelControls
                        aiMode={aiMode}
                        setAiMode={setAiMode}
                        feedbackType={feedbackType}
                        setFeedbackType={setFeedbackType}
                        feedbackOptions={FEEDBACK_OPTIONS}
                    />

                    <PromptPanelOutput
                        scrollRef={scrollRef}
                        onScroll={onScroll}
                        aiResponse={aiResponse}
                        toolEvents={toolEvents}
                        isSuggesting={isSuggesting}
                        aiMode={aiMode}
                        progress={progress}
                    />

                    <PromptPanelAnchor
                        aiPrompt={aiPrompt}
                        setAiPrompt={setAiPrompt}
                        aiMode={aiMode}
                        isSuggesting={isSuggesting}
                        onSuggest={onSuggest}
                    />
                </div>
            )}
        </aside>
    );
}
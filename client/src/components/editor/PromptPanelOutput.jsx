import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { formatProgress } from '../../utils/aiProgressFormatter.js';

const TOOL_STATUS_BY_TYPE = {
    tool_started: 'running',
    tool_requested: 'queued',
    tool_failed: 'failed',
};

const STATUS_ICON = {
    running: { glyph: '⚙', color: 'var(--accent)' },
    queued: { glyph: '•', color: 'var(--muted)' },
    failed: { glyph: '!', color: '#ff6b6b' },
    complete: { glyph: '✓', color: 'var(--muted)' },
};

const STATUS_LABEL = {
    running: (toolName) => `Executing tool: ${toolName}...`,
    queued: (toolName) => `Queued tool: ${toolName}`,
    failed: (toolName) => `Tool failed: ${toolName}`,
    complete: (toolName) => `Used tool: ${toolName}`,
};

function formatArgs(args) {
    if (!args || (typeof args === 'object' && Object.keys(args).length === 0)) return null;
    try {
        return JSON.stringify(args);
    } catch {
        return String(args);
    }
}

function PopulateProgress({ progress }) {
    const formatted = formatProgress(progress);
    if (!formatted) return null;

    const hasMetaRow = formatted.sub || formatted.percent !== null;

    return (
        <div className="glass-card stack--sm p-4">
            <div className="row-between row--baseline">
                <span className="text-ink font-medium">
                    {formatted.label}
                </span>
                {formatted.percent !== null && (
                    <span className="text-muted-sm">{formatted.percent}%</span>
                )}
            </div>
            {formatted.sub && (
                <p className="text-muted-sm truncate">
                    {formatted.sub}
                </p>
            )}
            {formatted.percent !== null && (
                <div className="glass-progress-bar">
                    <div
                        className="glass-progress-fill"
                        style={{ width: `${Math.max(2, formatted.percent)}%` }}
                    />
                </div>
            )}
        </div>
    );
}

function ToolEventCard({ event, index }) {
    const statusLabel = TOOL_STATUS_BY_TYPE[event.type] || 'complete';
    const toolName = event.toolName || 'unknown_tool';
    const argText = formatArgs(event.arguments);
    const icon = STATUS_ICON[statusLabel];

    return (
        <div className="surface-card overflow-hidden">
            <div className="row p-3">
                <span className={`tool-icon--${statusLabel}`}>{icon.glyph}</span>
                <span
                    className={`font-medium ${
                        statusLabel === 'running'
                            ? 'text-accent'
                            : statusLabel === 'failed'
                            ? 'text-accent'
                            : 'text-muted'
                    }`}
                >
                    {STATUS_LABEL[statusLabel](toolName)}
                </span>
            </div>
            {argText && (
                <div className="p-3 text-muted-sm font-mono">
                    args: {argText}
                </div>
            )}
        </div>
    );
}

function AIStreamRenderer({ text, toolEvents = [] }) {
    if (!text && toolEvents.length === 0) return null;

    return (
        <div className="stack">
            {toolEvents.map((event, index) => (
                <ToolEventCard key={`${event.type}-${index}`} event={event} index={index} />
            ))}
            {text && (
                <div className="ai-markdown">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
                </div>
            )}
        </div>
    );
}

export default function PromptPanelOutput({
    scrollRef,
    onScroll,
    aiResponse,
    toolEvents,
    isSuggesting,
    aiMode,
    progress,
}) {
    const showEmptyState = !aiResponse && !isSuggesting && toolEvents.length === 0;
    const showResponseBubble = aiResponse || isSuggesting || toolEvents.length > 0;

    const placeholderText = isSuggesting && !aiResponse && toolEvents.length === 0
        ? (aiMode === 'tools' ? 'Evaluating facts and invoking tools...' : 'Analyzing structure...')
        : null;

    return (
        <div
            className={`ai-message-well stack ${isSuggesting ? 'ai-card--thinking' : ''}`}
            ref={scrollRef}
            onScroll={onScroll}
        >
            {showEmptyState && (
                <div className="empty-state text-muted-sm p-4">
                    <p>{aiMode === 'tools' ? 'No active tool executions.' : 'What should we focus on?'}</p>
                </div>
            )}

            {progress && isSuggesting && <PopulateProgress progress={progress} />}

            {showResponseBubble && (
                <div className="glass-panel p-4">
                    <div className={aiResponse ? 'text-ink' : 'text-muted'}>
                        {placeholderText || <AIStreamRenderer text={aiResponse} toolEvents={toolEvents} />}
                    </div>
                </div>
            )}
        </div>
    );
}

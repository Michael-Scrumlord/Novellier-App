const TOOL_EVENT_ORDER = {
    tool_requested: 0,
    tool_started: 1,
    tool_succeeded: 2,
    tool_failed: 2,
};

export function upsertToolEvent(events, incoming) {
    const key = `${incoming.index ?? 'na'}::${incoming.toolName || 'unknown_tool'}`;
    const incomingRank = TOOL_EVENT_ORDER[incoming.type] ?? 0;
    const idx = events.findIndex((e) =>
        `${e.index ?? 'na'}::${e.toolName || 'unknown_tool'}` === key
    );

    if (idx === -1) return [...events, incoming];

    const current = events[idx];
    const currentRank = TOOL_EVENT_ORDER[current.type] ?? 0;
    if (incomingRank < currentRank) return events;

    const next = [...events];
    next[idx] = { ...current, ...incoming, arguments: incoming.arguments ?? current.arguments };
    return next;
}
function createToolSpec(name, description, properties = {}, required = []) {
    return {
        type: 'function',
        function: {
            name,
            description,
            parameters: {
                type: 'object',
                properties,
                required,
            },
        },
    };
}

export const CONTINUITY_TOOL_SPECS = [
    createToolSpec(
        'add_fact',
        'Add an objective factual truth about the universe, timeline, or characters.',
        {
            factString: {
                type: 'string',
                description: 'The explicit fact',
            },
        },
        ['factString']
    ),
    createToolSpec(
        'remove_fact',
        'Remove an inaccurate fact from the established timeline.',
        {
            factString: {
                type: 'string',
                description: 'The exact fact to remove',
            },
        },
        ['factString']
    ),
    createToolSpec(
        'populate_facts',
        'Analyze the structured draft and aggregate character, universe, and timeline facts into the active Continuity Database. Use mode="simple" (default, fast) to extract from existing chapter summaries, or mode="thorough" for full chapter-by-chapter extraction with consolidation + verification.',
        {
            mode: {
                type: 'string',
                description: 'Extraction strategy: "simple" (summaries only, single call) or "thorough" (per-chunk, with verification)',
                enum: ['simple', 'thorough'],
            },
        }
    ),
    createToolSpec(
        'section_facts',
        'Extract and add facts from the current section being edited. Processes the section in sequential chunks — use this for targeted extraction from the active chapter.'
    ),
    createToolSpec(
        'list_tools',
        'List all of the available continuity and AI database tools that you currently have access to.'
    ),
];
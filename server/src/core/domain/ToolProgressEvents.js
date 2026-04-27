// Typed progress event kinds emitted by core services.
// Adapter layer (controllers) translates these to wire-format text or SSE payloads.
export const PROGRESS = Object.freeze({
    UNSUPPORTED_MODEL: 'unsupported_model',

    // populate_facts: legacy sequential path (kept for backwards compat with UI)
    POPULATE_CHAPTER_START: 'populate_chapter_start',
    POPULATE_CHAPTER_COMPLETE: 'populate_chapter_complete',

    // populate_facts simple mode
    POPULATE_SIMPLE_START: 'populate_simple_start',
    POPULATE_SIMPLE_COMPLETE: 'populate_simple_complete',

    // populate_facts thorough mode: pass 1 (per-chunk extraction)
    POPULATE_CHUNK_START: 'populate_chunk_start',
    POPULATE_CHUNK_COMPLETE: 'populate_chunk_complete',

    // populate_facts thorough mode: pass 2 (consolidation)
    POPULATE_CONSOLIDATE_START: 'populate_consolidate_start',
    POPULATE_CONSOLIDATE_COMPLETE: 'populate_consolidate_complete',

    // populate_facts thorough mode: pass 3 (per-fact verification)
    POPULATE_VERIFY_START: 'populate_verify_start',
    POPULATE_VERIFY_COMPLETE: 'populate_verify_complete',

    // section_facts: pass 1 (per-chunk extraction)
    SECTION_CHUNK_START: 'section_chunk_start',
    SECTION_CHUNK_COMPLETE: 'section_chunk_complete',

    // section_facts: pass 2 (consolidation)
    SECTION_CONSOLIDATE_START: 'section_consolidate_start',
    SECTION_CONSOLIDATE_COMPLETE: 'section_consolidate_complete',

    LIST_TOOLS: 'list_tools',
    TOOL_EXECUTION_COMPLETE: 'tool_execution_complete',
});

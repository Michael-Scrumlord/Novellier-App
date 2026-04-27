import { richTextToPlainText } from '../domain/RichText.js';
import { truncateAtBoundary } from '../domain/TextUtils.js';

const DEFAULT_SUMMARY_CONFIG = Object.freeze({
    maxSourceChars: 9000,
    maxTokens: 480,
    temperature: 0.2,
});

const PROMPT_TEMPLATES = Object.freeze({
    chapter: 'Summarize this chapter for continuity memory in 3-5 short sentences. Focus on key events, character changes, and unresolved threads. Do not quote or restate opening words.',
    beat: 'Summarize this beat from chapter summaries in 3-5 short sentences. Focus on beat-level progression and current narrative state. Do not quote chapter summaries verbatim.',
    story: 'Summarize the entire story from beat summaries in 4-6 short sentences. Focus on main arc, current situation, and unresolved conflicts. Do not quote or start with beat opening wording.',
});

export class StorySummarizationService {
    constructor({ aiService, runtimeModels, summaryConfig, jobQueue } = {}) {
        super();
        this.aiService = aiService || null;
        this.runtimeModels = runtimeModels || null;
        this.summaryConfig = { ...DEFAULT_SUMMARY_CONFIG, ...(summaryConfig || {}) };
        this.jobQueue = jobQueue || null;
    }

    async buildStorySummaries(title, sections = []) {
        const normalized = sections
            .map((s) => {
                const content = richTextToPlainText(s.content);
                return content ? { id: s.id, beatKey: s.beatKey, title: s.title || 'Section', content } : null;
            })
            .filter(Boolean);

        if (!normalized.length) {
            return { chapterSummaries: [], beatSummaries: [], storySummary: '', storySummaryShort: '', storySummaryLong: '' };
        }

        // Sequential via job queue so each chapter doesn't race for the model
        const chapters = [];
        for (const section of normalized) {
            chapters.push(await this._runQueued(`summary_chapter:${section.id || section.title}`, 7,
                () => this._summarizeChapter(section)));
        }

        const beatMap = new Map();
        chapters.forEach((c) => {
            const key = c.beatKey || 'unknown';
            if (!beatMap.has(key)) beatMap.set(key, []);
            beatMap.get(key).push(c);
        });

        const beats = [];
        for (const [beatKey, chaps] of beatMap.entries()) {
            beats.push(await this._runQueued(`summary_beat:${beatKey}`, 7,
                () => this._summarizeBeat(beatKey, chaps)));
        }

        // Story summary runs after beats since it depends on beat output
        const storySource = beats.map((b) => `${b.beatTitle}: ${b.summary}`).join('\n');
        const storySummary = await this._runQueued('summary_story', 7, () => this._summarizeText(
            [PROMPT_TEMPLATES.story, '', '<story>', storySource, '</story>'].join('\n'),
            1200,
            { maxTokens: 320 }
        ));

        return { chapterSummaries: chapters, beatSummaries: beats, storySummary, storySummaryShort: storySummary, storySummaryLong: storySummary };
    }

    async ensureSummaryModelReady() {
        const model = this.runtimeModels?.summary || this.summaryConfig.model;
        if (!model || !this.aiService) return;

        try {
            await this.aiService.ensureModelAvailable(model);
            await this.aiService.warmupModel?.(model);
        } catch (error) {
            console.warn(`[StorySummarizationService] Warmup failed: ${error.message}`);
        }
    }

    // Private helpers
    _runQueued(name, priority, fn) {
        if (!this.jobQueue) return fn();
        return this.jobQueue.enqueue(name, fn, { priority });
    }

    async _summarizeChapter(section) {
        const source = this._extractFallbackSummary(section.content, 2600);
        const summary = await this._summarizeText(
            [PROMPT_TEMPLATES.chapter, '', '<chapter>', source, '</chapter>'].join('\n'),
            700,
            { maxTokens: 220 }
        );
        return {
            sectionId: section.id || null,
            beatKey: section.beatKey || null,
            chapterTitle: section.title,
            summary: summary || '',
        };
    }

    async _summarizeBeat(beatKey, chapters) {
        const beatSource = chapters.map((c) => `${c.chapterTitle}: ${c.summary}`).join('\n');
        const beatTitle = (chapters[0]?.chapterTitle || 'Beat').replace(/\s*-\s*Chapter\s+\d+\s*$/i, '').trim();
        const summary = await this._summarizeText(
            [PROMPT_TEMPLATES.beat, '', '<beat>', beatSource, '</beat>'].join('\n'),
            900,
            { maxTokens: 260 }
        );
        return { beatKey, beatTitle, summary: summary || '' };
    }

    async _summarizeText(sourceText, fallbackChars = 900, options = {}) {
        const normalized = truncateAtBoundary(sourceText || '', this.summaryConfig.maxSourceChars);
        if (!normalized || !this.aiService) return truncateAtBoundary(normalized, fallbackChars);

        try {
            const raw = await this.aiService.generateCompletion(
                ['Return only <summary>...</summary> with concise factual summary:', '<source_text>', normalized, '</source_text>'].join('\n'),
                {
                    model: options.model || this.runtimeModels?.summary || this.summaryConfig.model,
                    maxTokens: options.maxTokens || this.summaryConfig.maxTokens,
                    temperature: this.summaryConfig.temperature,
                }
            );
            const match = (raw || '').match(/<summary>\s*([\s\S]*?)\s*<\/summary>/i);
            return truncateAtBoundary((match?.[1] || String(raw || '')).trim(), fallbackChars);
        } catch (error) {
            console.warn(`[StorySummarizationService] Summary failed, fallback: ${error.message}`);
            return truncateAtBoundary(normalized, fallbackChars);
        }
    }

    // Pulls first, middle, and last paragraphs to give the AI a representative slice of long content.
    _extractFallbackSummary(text, maxChars = 2600) {
        const norm = truncateAtBoundary(text || '', maxChars);
        if (!norm) return '';
        const paras = norm.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
        if (paras.length <= 3) return norm;
        const mid = Math.floor(paras.length / 2);
        return truncateAtBoundary([paras[0], paras[mid], paras[paras.length - 1]].join('\n\n'), maxChars);
    }
}

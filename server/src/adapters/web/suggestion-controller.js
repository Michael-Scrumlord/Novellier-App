import { PROGRESS } from '../../core/domain/ToolProgressEvents.js';

export default class SuggestionController {
    constructor({ suggestionService, runtimeModels }) {
        if (!suggestionService) throw new Error('SuggestionController requires suggestionService');
        this.suggestionService = suggestionService;
        this.runtimeModels = runtimeModels || { suggestion: null };
    }

    async getSuggestion(req, res) {
        const {
            storyText,
            sections,
            storyId,
            mode,
            domain, // YouTrack demo — selects prompt strategy (e.g. 'youtrack'); defaults to novel
            feedbackType,
            customPrompt,
            contextSummaries,
            chapterSummaries,
        } = req.body || {};

        if (!storyText) {
            return res.status(400).json({ error: 'storyText is required' });
        }

        const options = {
            sections,
            storyId,
            model: this.runtimeModels.suggestion,
            mode,
            domain,
            feedbackType,
            customPrompt,
            contextSummaries,
            chapterSummaries,
            _meta: {
                userId: req.user?.id || req.user?.sub || null,
                storyId,
                model: this.runtimeModels.suggestion,
                feedbackType,
            },
        };

        await this._streamSuggestion(req, res, storyText, options);
    }

    async _streamSuggestion(req, res, storyText, options) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        let fullResponse = '';
        let isAborted = false;
        const abortController = new AbortController();

        res.on('close', () => {
            if (!res.writableEnded && !isAborted) {
                isAborted = true;
                abortController.abort();
                console.log('[SuggestionController] Client disconnected, aborting AI request');
            }
        });

        const writeFrame = async (frame) => {
            if (isAborted || res.writableEnded) return;
            const ok = res.write(frame);
            if (ok) return;
            await new Promise((resolve) => {
                const onDrain = () => {
                    res.off('close', onClose);
                    resolve();
                };
                const onClose = () => {
                    res.off('drain', onDrain);
                    resolve();
                };
                res.once('drain', onDrain);
                res.once('close', onClose);
            });
        };

        const onChunk = async (chunk) => {
            if (isAborted) return;
            fullResponse += chunk;
            await writeFrame(`data: ${JSON.stringify({ chunk, done: false })}\n\n`);
        };

        const writeProgress = async (event) => {
            if (isAborted) return;
            await writeFrame(
                `data: ${JSON.stringify({ event: 'progress', progress: event, done: false })}\n\n`
            );
        };

        const onProgress = (event) => {
            if (isAborted) return;
            switch (event.kind) {
                case PROGRESS.UNSUPPORTED_MODEL:
                    onChunk("\n\n[Continuity Tool Error: The selected active model does not natively support Tools. Please select a model like 'llama3.1' or 'mistral' from the Model settings.]");
                    break;
                case PROGRESS.LIST_TOOLS:
                    onChunk('\n\n**Available System Tools:**\n');
                    (event.tools || []).forEach((t) => onChunk(`- \`${t.name}\`: ${t.description}\n`));
                    onChunk('\ntool execution complete.');
                    break;
                case PROGRESS.TOOL_EXECUTION_COMPLETE:
                    onChunk('\ntool execution complete.');
                    break;
                default:
                    writeProgress(event);
                    break;
            }
        };

        const onToolEvent = async (toolEvent) => {
            if (isAborted) return;
            console.log('[ToolDebug] stream_tool_event', JSON.stringify({
                storyId: options.storyId || null,
                userId: options._meta?.userId || null,
                eventType: toolEvent?.type || null,
                toolName: toolEvent?.toolName || null,
                index: toolEvent?.index ?? null,
                error: toolEvent?.error || null,
            }));
            await writeFrame(`data: ${JSON.stringify({ event: 'tool', toolEvent, done: false })}\n\n`);
        };

        try {
            console.log('[ToolDebug] stream_request_start', JSON.stringify({
                mode: options.mode || null,
                storyId: options.storyId || null,
                userId: options._meta?.userId || null,
                model: options.model || this.runtimeModels.suggestion || null,
            }));
            await this.suggestionService.getSuggestion(storyText, {
                ...options,
                onChunk,
                onProgress,
                onToolEvent,
                abortSignal: abortController.signal,
            });

            if (!isAborted) {
                console.log('[ToolDebug] stream_request_complete', JSON.stringify({
                    storyId: options.storyId || null,
                    userId: options._meta?.userId || null,
                }));
                await writeFrame(`data: ${JSON.stringify({ chunk: '', done: true, fullResponse })}\n\n`);
                res.end();
            }
        } catch (error) {
            if (error.name === 'AbortError' || error.message?.includes('aborted')) return;

            console.error('[SuggestionController] Streaming Error:', error.message);
            if (!isAborted) {
                await writeFrame(`data: ${JSON.stringify({ error: 'AI Service Error', done: true })}\n\n`);
                res.end();
            }
        }
    }
}

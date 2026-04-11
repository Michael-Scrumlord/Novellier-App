export default class AIController {
    constructor({ suggestionService, aiService, localModels }) {
        if (!suggestionService) {
        throw new Error('AIController requires suggestionService');
        }
        if (!aiService) {
        throw new Error('AIController requires aiService');
        }

        this.suggestionService = suggestionService;
        this.aiService = aiService;
        this.localModels = Array.isArray(localModels) ? localModels : [];
    }

    async listModels(_req, res) {
        const models = this.localModels
            .map((model) => String(model || '').trim())
            .filter(Boolean)
            .map((model) => ({
                value: model,
                label: this._formatModelLabel(model)
            }));

        return res.json({
            modelGroups: [
                {
                    label: 'Local Models (Ollama)',
                    options: models
                }
            ]
        });
    }

    async warmup(req, res) {
        try {
        const body = req.body || {};
        const model = req.query.model || body.model;
        const result = await this.aiService.warmupModel(model);
        return res.json(result);
        } catch (error) {
        console.error('[AIController] Warmup Error:', error.message);
        return res.status(500).json({ error: 'Failed to warm up model' });
        }
    }

    async keepAlive(req, res) {
        try {
        const body = req.body || {};
        const model = req.query.model || body.model;
        const result = await this.aiService.keepAlive(model);
        return res.json(result);
        } catch (error) {
        console.error('[AIController] KeepAlive Error:', error.message);
        return res.status(500).json({ error: 'Failed to keep model alive' });
        }
    }

    async ensureModel(req, res) {
        try {
        const { model } = req.body || {};
        if (!model) {
            return res.status(400).json({ error: 'model is required' });
        }

        const result = await this.aiService.ensureModelAvailable(model);
        return res.json({ status: result?.status || 'ready', model });
        } catch (error) {
        console.error('[AIController] EnsureModel Error:', error.message);
        return res.status(500).json({ error: 'Failed to ensure model availability' });
        }
    }

    async getSuggestion(req, res) {
        const {
        storyText,
        sections,
        activeSectionIndex,
        storyId,
        model,
        feedbackType,
        stream,
        customPrompt,
        currentChapterSummary,
        currentBeatSummary,
        storySummary,
        storySummaryShort,
        storySummaryLong
        } = req.body || {};

        if (!storyText) {
        return res.status(400).json({ error: 'storyText is required' });
        }

        const options = this._buildSuggestionOptions({
        sections,
        activeSectionIndex,
        storyId,
        model,
        feedbackType,
        customPrompt,
        currentChapterSummary,
        currentBeatSummary,
        storySummary,
        storySummaryShort,
        storySummaryLong
        });

    try {
        if (stream) {
            await this._streamSuggestion(req, res, storyText, options);
            return;
      }
        return await this._sendSuggestion(res, storyText, options);
        } catch (error) {
        console.error('[AIController] AI Service Error:', error);
        return res.status(500).json({ error: 'AI Service Error' });
        }
    }

    async _sendSuggestion(res, storyText, options) {
        const suggestion = await this.suggestionService.getSuggestion(storyText, options);
        return res.json({ suggestion });
    }

    async _streamSuggestion(_req, res, storyText, options) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        let fullResponse = '';
        let chunkCount = 0;
        let isAborted = false;
        const abortController = new AbortController();

        // Handle client disconnecting mid-stream
        res.on('close', () => {
        if (!res.writableEnded && !isAborted) {
            isAborted = true;
            abortController.abort();
            console.log('[AIController] Client disconnected, aborting AI request');
        }
        });

        const onChunk = (chunk) => {
        if (isAborted) return;

        chunkCount++;
        fullResponse += chunk;
        const message = JSON.stringify({ chunk, done: false });
        res.write(`data: ${message}\n\n`);
        };

        try {
        await this.suggestionService.getSuggestion(storyText, {
            ...options,
            onChunk,
            abortSignal: abortController.signal
        });

        if (!isAborted) {
            res.write(`data: ${JSON.stringify({ chunk: '', done: true, fullResponse })}\n\n`);
            res.end();
        }
        } catch (error) {
        if (error.name === 'AbortError' || error.message?.includes('aborted')) {
            return;
        } 
        
        console.error('[AIController] Streaming Error:', error.message);
        if (!isAborted) {
            res.write(`data: ${JSON.stringify({ error: 'AI Service Error', done: true })}\n\n`);
            res.end();
        }
        }
    }

    _buildSuggestionOptions({
        sections,
        activeSectionIndex,
        storyId,
        model,
        feedbackType,
        customPrompt,
        currentChapterSummary,
        currentBeatSummary,
        storySummary,
        storySummaryShort,
        storySummaryLong
    }) {
        return {
        sections,
        activeSectionIndex,
        storyId,
        model,
        feedbackType,
        customPrompt,
        currentChapterSummary,
        currentBeatSummary,
        storySummary,
        storySummaryShort,
        storySummaryLong
        };
    }

    _formatModelLabel(model) {
        return model
            .split(':')[0]
            .split('-')
            .map((part) => (part ? part[0].toUpperCase() + part.slice(1) : part))
            .join(' ');
    }
}
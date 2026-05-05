// Consumes a ReadableStream from an SSE response, dispatching text chunks, tool events,
// and progress events via callbacks. Returns the full accumulated response string.
export async function parseSSEStream(reader, { onChunk, onEvent, onProgress } = {}) {
    const decoder = new TextDecoder();
    let fullResponse = '';
    let buffer = '';

    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop();

            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed.startsWith('data: ')) continue;

                const data = trimmed.slice(6).trim();
                if (!data || data === '[DONE]') continue;

                try {
                    const parsed = JSON.parse(data);
                    if (parsed.error) throw new Error(parsed.error);

                    if (parsed.event === 'tool' && parsed.toolEvent) {
                        onEvent?.(parsed.toolEvent);
                    }

                    if (parsed.event === 'progress' && parsed.progress) {
                        onProgress?.(parsed.progress);
                    }

                    if (parsed.chunk) {
                        fullResponse += parsed.chunk;
                        onChunk?.(parsed.chunk);
                    }

                    if (parsed.done) return fullResponse;
                } catch (e) {
                    if (import.meta.env.DEV) {
                        console.error('Failed to parse SSE frame:', e, 'Data:', data);
                    }
                    throw e;
                }
            }
        }
    } finally {
        reader.releaseLock();
    }

    return fullResponse;
}
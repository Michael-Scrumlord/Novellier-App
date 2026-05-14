import { useCallback, useEffect, useRef, useState } from 'react';
import { storyService } from '../services/storyService.js';

const POLL_INTERVAL_MS = 3000;

// Polls /api/stories/:id/index-status while a story is being indexed.
// Returns { indexStatus, indexError } where indexStatus is:
//   null | 'pending' | 'running' | 'done' | 'error'
export function useIndexStatus({ token, storyId, enabled }) {
    const [indexStatus, setIndexStatus] = useState(null);
    const [indexError, setIndexError] = useState(null);
    const timerRef = useRef(null);

    const stop = useCallback(() => {
        clearTimeout(timerRef.current);
        timerRef.current = null;
    }, []);

    const poll = useCallback(async () => {
        if (!token || !storyId) return;
        try {
            const data = await storyService.getIndexStatus(token, storyId);
            const status = data?.status?.status ?? null;
            const error = data?.status?.error ?? null;
            setIndexStatus(status);
            setIndexError(error);

            if (status === 'pending' || status === 'running') {
                timerRef.current = setTimeout(poll, POLL_INTERVAL_MS);
            }
        } catch {
            // Network error — stop polling silently.
        }
    }, [token, storyId]);

    // Start polling when enabled flips to true (i.e., right after a save).
    useEffect(() => {
        if (!enabled || !storyId) return;
        setIndexStatus('pending');
        setIndexError(null);
        timerRef.current = setTimeout(poll, POLL_INTERVAL_MS);
        return stop;
    }, [enabled, storyId, poll, stop]);

    // Clear status when story changes.
    useEffect(() => {
        setIndexStatus(null);
        setIndexError(null);
        stop();
    }, [storyId, stop]);

    return { indexStatus, indexError };
}

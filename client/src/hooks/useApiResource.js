import { useState, useEffect, useCallback } from 'react';

export function useApiResource(token, apiFn) {
    const [data, setData] = useState(null);
    const [loaded, setLoaded] = useState(false);
    const [error, setError] = useState('');
    const [tick, setTick] = useState(0);

    useEffect(() => {
        if (!token) {
            setLoaded(true);
            return;
        }
        let cancelled = false;
        setLoaded(false);
        setError('');
        apiFn(token)
            .then((response) => {
                if (!cancelled) { setData(response); setLoaded(true); }
            })
            .catch((err) => {
                if (!cancelled) { setError(err.message || 'Request failed'); setLoaded(true); }
            });
        return () => { cancelled = true; };
    }, [token, apiFn, tick]);

    const refetch = useCallback(() => setTick((t) => t + 1), []);
    return { data, loaded, error, refetch };
}
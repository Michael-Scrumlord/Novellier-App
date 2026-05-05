import { useCallback, useState } from 'react';

export function useLocalStorage(key, initialValue = '') {
    const [value, setValue] = useState(() => {
        const stored = localStorage.getItem(key);
        return stored !== null ? stored : initialValue;
    });

    const set = useCallback((next) => {
        setValue(next);
        if (next === null || next === undefined) {
            localStorage.removeItem(key);
        } else {
            localStorage.setItem(key, next);
        }
    }, [key]);

    return [value, set];
}
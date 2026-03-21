import { useEffect, useState } from 'react';
import { THEME_KEY } from '../constants/storage.js';

export function useTheme() {
    const [theme, setTheme] = useState(() => {
        const stored = localStorage.getItem(THEME_KEY) || 'light';
        return stored;
    });

    useEffect(() => {
        document.body.setAttribute('data-theme', theme);
        localStorage.setItem(THEME_KEY, theme);
    }, [theme]);

    return { theme, setTheme };
}
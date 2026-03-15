import React, { createContext, useContext, useEffect, useState } from 'react';
import { THEME_KEY } from '../constants/storage.js';

const ThemeContext = createContext(null);

function getInitialTheme() {
    const stored = localStorage.getItem(THEME_KEY) || 'fall';
    if (stored === 'light') return 'fall';
    if (stored === 'dark') return 'night';
    return stored;
}

export function ThemeProvider({ children }) {
    const [theme, setTheme] = useState(getInitialTheme);

    useEffect(() => {
        document.body.setAttribute('data-theme', theme);
        localStorage.setItem(THEME_KEY, theme);
    }, [theme]);

    const value = { theme, setTheme };
    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useThemeContext() {
    const ctx = useContext(ThemeContext);
    if (!ctx) {
        throw new Error('useThemeContext must be used within ThemeProvider');
    }
    return ctx;
}

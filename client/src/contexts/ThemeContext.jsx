import { createContext, useContext, useEffect, useState } from 'react';
import { THEME_KEY } from '../constants/storage.js';

const ThemeContext = createContext(null);

const DEFAULT_THEME = 'light';

export function ThemeProvider({ children }) {
    const [theme, setThemeState] = useState(() => localStorage.getItem(THEME_KEY) || DEFAULT_THEME);

    const setTheme = (nextTheme) => {
        setThemeState(nextTheme);
        localStorage.setItem(THEME_KEY, nextTheme);
    };

    useEffect(() => {
        document.body.setAttribute('data-theme', theme);
    }, [theme]);

    return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}

export function useThemeContext() {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useThemeContext must be used within a ThemeProvider');
    }
    return context;
}
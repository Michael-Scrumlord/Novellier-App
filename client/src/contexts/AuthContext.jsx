import React, { createContext, useMemo, useContext, useState, useCallback } from 'react';
import { api } from '../lib/api.js';
import { TOKEN_KEY, USER_KEY } from '../constants/storage.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
    const [user, setUser] = useState(() => {
        const stored = localStorage.getItem(USER_KEY);
        return stored ? JSON.parse(stored) : null;
    });
    const [authError, setAuthError] = useState('');
    const [authLoading, setAuthLoading] = useState(false);

    const isAuthenticated = Boolean(token);

    const handleLogin = useCallback(async (credentials) => {
        setAuthError('');
        setAuthLoading(true);
        try {
            const data = await api.login(credentials);
            setToken(data.token);
            setUser(data.user);
            localStorage.setItem(TOKEN_KEY, data.token);
            localStorage.setItem(USER_KEY, JSON.stringify(data.user));
            return 'Signed in successfully.';
        } catch {
            setAuthError('Login failed. Check your credentials.');
            return null;
        } finally {
            setAuthLoading(false);
        }
    }, []);

    const handleLogout = useCallback(async () => {
            const currentToken = localStorage.getItem(TOKEN_KEY);
            if (currentToken) {
            await api.logout(currentToken).catch(() => null);
        }
        setToken(null);
        setUser(null);
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
    }, []);

    const clearTokenOnFailure = useCallback(() => {
        setToken(null);
        localStorage.removeItem(TOKEN_KEY);
    }, []);

    const updateUser = useCallback((newData) => {
        setUser((prev) => {
            const updated = { ...prev, ...newData };
            localStorage.setItem(USER_KEY, JSON.stringify(updated));
            return updated;
        });
    }, []);

    const value = useMemo(
        () => ({
            token,
            user,
            isAuthenticated,
            authError,
            authLoading,
            handleLogin,
            handleLogout,
            clearTokenOnFailure,
            updateUser 
        }),
        [
        token, 
        user, 
        isAuthenticated, 
        authError, 
        authLoading, 
        handleLogin, 
        handleLogout, 
        clearTokenOnFailure,
        updateUser
        ]
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
    const ctx = useContext(AuthContext);
    if (!ctx) {
        throw new Error('useAuthContext must be used within an AuthProvider');
    }
    return ctx;
}
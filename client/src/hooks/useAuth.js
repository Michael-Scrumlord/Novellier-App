import { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api.js';
import { TOKEN_KEY, USER_KEY } from '../constants/storage.js';

export function useAuth() {
    const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
    const [user, setUser] = useState(() => {
        const stored = localStorage.getItem(USER_KEY);
        return stored ? JSON.parse(stored) : null;
    });
    const [authError, setAuthError] = useState('');
    const [authLoading, setAuthLoading] = useState(false);

    const isAuthenticated = useMemo(() => Boolean(token), [token]);

    const handleLogin = async (credentials) => {
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
    };

    const handleLogout = async () => {
        if (token) {
        await api.logout(token).catch(() => null);
        }
        setToken(null);
        setUser(null);
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
    };

    // Auto-clear stories when token disappears
    const clearTokenOnFailure = () => {
        setToken(null);
        localStorage.removeItem(TOKEN_KEY);
    };

    return {
        token,
        user,
        setUser,
        isAuthenticated,
        authError,
        authLoading,
        handleLogin,
        handleLogout,
        clearTokenOnFailure
    };
}
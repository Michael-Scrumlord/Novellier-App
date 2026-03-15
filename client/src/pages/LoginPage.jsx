import React from 'react';
import { Navigate } from 'react-router-dom';
import AuthPanel from '../components/auth/AuthPanel.jsx';
import { useAuthContext } from '../contexts/AuthContext.jsx';

export function LoginPage() {
    const { isAuthenticated, handleLogin, authLoading, authError } = useAuthContext();

    if (isAuthenticated) {
        return <Navigate to="/home" replace />;
    }

    return (
        <div id="login">
        <AuthPanel
            onSubmit={handleLogin}
            isLoading={authLoading}
            error={authError}
        />
        </div>
    );
}

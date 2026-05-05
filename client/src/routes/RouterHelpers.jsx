import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthContext } from '../contexts/AuthContext.jsx';
import { useStoryContext } from '../contexts/StoryContext.jsx';

// Handles route redirection based on authentication status and the current story context.
export function AppRedirect() {
    const { isAuthenticated } = useAuthContext();
    return <Navigate to={isAuthenticated ? '/home' : '/login'} replace />;
}

export function WorkspaceRedirect() {
    const { currentStory, stories, storiesLoaded } = useStoryContext();

    if (!storiesLoaded) {
        return null;
    }

    const targetStoryId = currentStory?.id || stories?.[0]?.id;
    if (targetStoryId) {
        return <Navigate to={`/workspace/${targetStoryId}`} replace />;
    }

    return <Navigate to="/home" replace />;
}

export function ProtectedLayout() {
    const { isAuthenticated } = useAuthContext();
    return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
}

function getRoleFromToken(token) {
    if (!token) return null;
    try {
        return JSON.parse(atob(token.split('.')[1]))?.role ?? null;
    } catch {
        return null;
    }
}

export function AdminGuard() {
    const { token } = useAuthContext();
    return getRoleFromToken(token) === 'admin' ? <Outlet /> : <Navigate to="/home" replace />;
}
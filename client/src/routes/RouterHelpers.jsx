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

export function AdminGuard() {
    const { user } = useAuthContext();
    return user?.role === 'admin' ? <Outlet /> : <Navigate to="/home" replace />;
}

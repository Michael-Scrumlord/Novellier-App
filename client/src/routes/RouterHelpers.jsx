import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthContext } from '../contexts/AuthContext.jsx';

export function AppRedirect() {
    const { isAuthenticated } = useAuthContext();
    return <Navigate to={isAuthenticated ? "/home" : "/login"} replace />;
}

export function WorkspaceRedirect() {
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
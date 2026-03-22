import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext.jsx';
import { ThemeProvider } from './contexts/ThemeContext.jsx';
import { ModelProvider } from './contexts/ModelContext.jsx';
import { StoryProvider } from './contexts/StoryContext.jsx';
import { AIProvider } from './contexts/AIContext.jsx';
import { RootLayout } from './layouts/RootLayout.jsx';
import {
  LoginPage,
  HomePage,
  ProfilePage,
  WorkspacePage
} from './pages/index.js';
import { AppRedirect, ProtectedLayout, WorkspaceRedirect } from './routes/RouterHelpers.jsx';

import './styles/Buttons.css'
import './App.css';
import './styles/themes.css';

const APP_PROVIDERS = [AuthProvider, ThemeProvider, ModelProvider, StoryProvider, AIProvider];

function App() {
    const appRoutes = (
        <Routes>
            <Route element={<RootLayout />}>
                <Route path="/" element={<AppRedirect />} />
                <Route path="/login" element={<LoginPage />} />

                <Route element={<ProtectedLayout />}>
                    <Route path="/home" element={<HomePage />} />
                    <Route path="/profile" element={<ProfilePage />} />
                    <Route path="/workspace" element={<WorkspaceRedirect />} />
                    <Route path="/workspace/:storyId" element={<WorkspacePage />} />
                </Route>

                <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
        </Routes>
    );

    return (
        <BrowserRouter>
            {APP_PROVIDERS.reduceRight(
                (children, ProviderComponent) => <ProviderComponent>{children}</ProviderComponent>,
                appRoutes
            )}
        </BrowserRouter>
    );
}

export default App;
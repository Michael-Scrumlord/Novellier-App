import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext.jsx';
import { ThemeProvider } from './contexts/ThemeContext.jsx';
import { StoryProvider, useStoryContext } from './contexts/StoryContext.jsx';
import { EditorUIProvider } from './contexts/EditorUIContext.jsx';
import { AIProvider } from './contexts/AIContext.jsx';
import { RootLayout } from './layouts/RootLayout.jsx';
import {
    AppRedirect,
    ProtectedLayout,
    WorkspaceRedirect,
    AdminGuard,
} from './routes/RouterHelpers.jsx';

import './styles/Buttons.css';
import './App.css';
import './styles/themes.css';
import './styles/utilities.css';
import './styles/Forms.css';

const LoginPage = lazy(() =>
    import('./pages/LoginPage.jsx').then((m) => ({ default: m.LoginPage }))
);
const HomePage = lazy(() =>
    import('./pages/HomePage.jsx').then((m) => ({ default: m.HomePage }))
);
const ProfilePage = lazy(() =>
    import('./pages/ProfilePage.jsx').then((m) => ({ default: m.ProfilePage }))
);
const WorkspacePage = lazy(() =>
    import('./pages/WorkspacePage.jsx').then((m) => ({ default: m.WorkspacePage }))
);
const AdminPage = lazy(() =>
    import('./pages/AdminPage.jsx').then((m) => ({ default: m.AdminPage }))
);

function RouteFallback() {
    return null;
}

function EditorUILayer({ children }) {
    const { currentStory } = useStoryContext();
    return (
        <EditorUIProvider key={currentStory?.id ?? 'no-story'}>
            {children}
        </EditorUIProvider>
    );
}

function DataProvidersLayout() {
    return (
        <StoryProvider>
            <EditorUILayer>
                <AIProvider>
                    <Outlet />
                </AIProvider>
            </EditorUILayer>
        </StoryProvider>
    );
}

function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <ThemeProvider>
                    <Suspense fallback={<RouteFallback />}>
                        <Routes>
                            <Route element={<RootLayout />}>
                                <Route path="/" element={<AppRedirect />} />
                                <Route path="/login" element={<LoginPage />} />

                                <Route element={<ProtectedLayout />}>
                                    <Route element={<DataProvidersLayout />}>
                                        <Route path="/home" element={<HomePage />} />
                                        <Route path="/profile" element={<ProfilePage />} />
                                        <Route path="/workspace" element={<WorkspaceRedirect />} />
                                        <Route path="/workspace/:storyId" element={<WorkspacePage />} />
                                        <Route element={<AdminGuard />}>
                                            <Route path="/admin" element={<AdminPage />} />
                                            <Route path="/admin/containers" element={<AdminPage />} />
                                            <Route path="/admin/database" element={<AdminPage />} />
                                        </Route>
                                    </Route>
                                </Route>

                                <Route path="*" element={<Navigate to="/" replace />} />
                            </Route>
                        </Routes>
                    </Suspense>
                </ThemeProvider>
            </AuthProvider>
        </BrowserRouter>
    );
}

export default App;


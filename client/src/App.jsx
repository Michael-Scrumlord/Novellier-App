import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext.jsx';
import { ThemeProvider } from './contexts/ThemeContext.jsx';
import { ModelProvider } from './contexts/ModelContext.jsx';
import { RootLayout } from './layouts/RootLayout.jsx';
import {
  LoginPage,
  HomePage,
  ProfilePage
} from './pages/index.js';
import { AppRedirect, ProtectedLayout } from './routes/RouterHelpers.jsx';
import './App.css';

const APP_PROVIDERS = [AuthProvider, ThemeProvider, ModelProvider];

function App() {
  const appRoutes = (
    <Routes>
      <Route element={<RootLayout />}>
        <Route path="/" element={<AppRedirect />} />
        <Route path="/login" element={<LoginPage />} />

        <Route element={<ProtectedLayout />}>
            <Route path="/home" element={<HomePage />} />
            <Route path="/profile" element={<ProfilePage />} />
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

import React from 'react';
import { useNavigate } from 'react-router-dom';
import ProfilePageView from '../components/profile/ProfilePage.jsx';
import { useAuthContext } from '../contexts/AuthContext.jsx';
import { useThemeContext } from '../contexts/ThemeContext.jsx';

export function ProfilePage() {
  const navigate = useNavigate();
  const { user, token, setUser } = useAuthContext();
  const { theme, setTheme } = useThemeContext();

  if (!user) {
    return null;
  }

  return (
    <div id="profile">
      <ProfilePageView
        user={user}
        token={token}
        theme={theme}
        onThemeChange={setTheme}
        onClose={() => navigate(-1)}
        onProfileUpdate={setUser}
      />
    </div>
  );
}

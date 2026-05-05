import Profile from './Profile.jsx';
import ThemeSelector from './ThemeSelector.jsx';

export default function ProfilePageView({
    user,
    token,
    theme,
    onThemeChange,
    onClose,
    onProfileUpdate,
}) {
    return (
        <div className="profile-page">
            <div className="profile-page__header">
                <h1>Your Profile</h1>
                <button type="button" className="btn btn--glass" onClick={onClose} title="Close profile">
                    ✕
                </button>
            </div>

            <div className="profile-page__content">
                <div className="profile-page__main">
                    <Profile user={user} token={token} onProfileUpdate={onProfileUpdate} />
                </div>

                <div className="profile-page__sidebar">
                    <ThemeSelector currentTheme={theme || 'default'} onThemeChange={onThemeChange} />
                </div>
            </div>
        </div>
    );
}

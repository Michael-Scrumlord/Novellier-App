import Profile from './Profile.jsx';
import ThemeSelector from './ThemeSelector.jsx';


// I know this has the same name as the page component, but this 
// is the "view" that the page component renders. The page component 
// handles data fetching and state management, while this view component 
// focuses on presentation and user interactions.

// ..Maybe rename in the future.

export default function ProfilePageView({ user, token, theme, onThemeChange, onClose, onProfileUpdate }) {
    return (
        <div className="profile-page">
            <div className="profile-page__header">
              <h1>Your Profile</h1>
              <button 
                type="button" 
                className="btn btn--glass"
                onClick={onClose}
                title="Close profile"
              >
                ✕
              </button>
            </div>

            <div className="profile-page__content">
              <div className="profile-page__main">
                <Profile 
                  user={user} 
                  token={token} 
                  onProfileUpdate={onProfileUpdate}
                />
              </div>

              <div className="profile-page__sidebar">
                <ThemeSelector 
                  currentTheme={theme || 'default'}
                  onThemeChange={onThemeChange}
                />
              </div>
            </div>
        </div>
    );
}

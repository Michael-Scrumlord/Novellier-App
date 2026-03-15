import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '../../contexts/AuthContext.jsx';

export default function Navbar({ statusMessage = '' }) {
  const navigate = useNavigate();
  const { user, handleLogout, isAuthenticated } = useAuthContext();

  return (
    <header className="nav">
      <div className="nav__brand">
        <span className="nav__logo">N</span>
        <div>
          <p className="nav__title">Novellier</p>
          <p className="nav__subtitle">Writing Workspace</p>
        </div>
      </div>

      <nav className="nav__links">
        {isAuthenticated && (
          <>
            <button
              className="nav__link-btn"
              onClick={() => navigate('/home')}
              type="button"
            >
              Home
            </button>
            <button
              className="nav__link-btn"
              onClick={goWorkspace}
              type="button"
              title={hasActiveStory ? 'View your workspace' : 'Select a story first'}
              disabled={!hasActiveStory}
              style={{
                opacity: hasActiveStory ? 1 : 0.5,
                cursor: hasActiveStory ? 'pointer' : 'not-allowed'
              }}
            >
              Workspace
            </button>
            {user?.role === 'admin' && (
              <button
                className="nav__link-btn nav__link-btn--admin"
                onClick={() => navigate('/admin')}
                type="button"
              >
                Admin
              </button>
            )}
          </>
        )}
      </nav>
    </header>
  );
}

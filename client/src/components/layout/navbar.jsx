import { useNavigate } from 'react-router-dom';
import { useRef, useState, useEffect } from 'react';
import { useAuthContext } from '../../contexts/AuthContext.jsx';
import './Navbar.css';
import './Dropdown.css';
import '../../styles/Buttons.css';
import logoMask from '../../../public/logo/mask.png'
import { THEMES } from '../../constants/themes.js';
import { useThemeContext } from '../../contexts/ThemeContext.jsx';

export default function Navbar({ statusMessage = '' }) {
    const navigate = useNavigate();
    const { user, handleLogout, isAuthenticated } = useAuthContext();
    const { theme, setTheme } = useThemeContext();

    const [showUserMenu, setShowUserMenu] = useState(false);
    const [showThemeMenu, setShowThemeMenu] = useState(false);

    const userMenuRef = useRef(null);
    const themeMenuRef = useRef(null);

    useEffect(() => {
      const handleClickOutside = (event) => {
        if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
          setShowUserMenu(false);
        }
        if (themeMenuRef.current && !themeMenuRef.current.contains(event.target)) {
          setShowThemeMenu(false);
        }
      };

      if (showUserMenu || showThemeMenu) {
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
          document.removeEventListener('mousedown', handleClickOutside);
        };
      }
    }, [showUserMenu, showThemeMenu]);

    const getDisplayName = () => {
      if (user?.firstName || user?.lastName) {
        return `${user?.firstName || ''} ${user?.lastName || ''}`.trim();
      }
      return user?.username || 'User';
    };
    const getInitials = () => {
      const name = getDisplayName();
      return name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    };

  return (
    <header className="nav">
      <div 
        className="nav__brand" 
        onClick={() => navigate('/home')} 
        style={{ cursor: 'pointer' }}
        title="Go to Home"
      >
        <div className="nav__brand-lockup">
          {/* The Icon */}
          <div 
            className="nav__logo-icon"
            style={{ 
              WebkitMaskImage: `url(${logoMask})`,
              maskImage: `url(${logoMask})`
            }}
            aria-label="Novellier Logo"
          />
          {/* The Native Text */}
          <div className="nav__logo-text">
            NOVELLIER
          </div>
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
              type="button"
              style={{
                opacity: 0.5,
                cursor: 'pointer'
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

      <div className="nav__actions">
        <div className="nav__theme-selector" ref={themeMenuRef}>
          <button
            className="btn btn--glass nav__theme-toggle"
            type="button"
            onClick={() => setShowThemeMenu(!showThemeMenu)}
            title="Select theme"
          >Theme
          </button>
          {showThemeMenu && (
            <div className="nav__theme-menu">
              <div className="nav__theme-menu-header">
                <p>Choose Theme</p>
              </div>
              <div className="nav__theme-options">
                {THEMES.map(({ id, name, description }) => (
                  <button
                    key={id}
                    className={`nav__theme-option ${theme === id ? 'nav__theme-option--active' : ''}`}
                    onClick={() => {
                      setTheme(id);
                      setShowThemeMenu(false);
                    }}
                    type="button"
                  >
                    <span className="nav__theme-dot" data-theme={id} />
                    <div className="nav__theme-text">
                      <span className="nav__theme-label">{name}</span>
                      <span className="nav__theme-desc">{description}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {user ? (
          <div className="nav__user-section" ref={userMenuRef}>
            <button
              className="nav__user-btn"
              type="button"
              onClick={() => setShowUserMenu(!showUserMenu)}
            >
              <div className="nav__user-avatar">
                {user.profilePicture ? (
                  <img
                    src={user.profilePicture}
                    alt={getDisplayName()}
                    className="nav__user-picture"
                  />
                ) : (
                  <span className="nav__user-initials">{getInitials()}</span>
                )}
              </div>
              <div className="nav__user-info">
                <span className="nav__user-role">{user.role}</span>
              </div>
            </button>

            {showUserMenu && (
              <div className="nav__user-menu">
                <div className="nav__menu-header">
                  <p className="nav__menu-title">{getDisplayName()}</p>
                  <p className="nav__menu-email">{user.email || 'No email'}</p>
                </div>
                <button
                  type="button"
                  className="btn btn--glass nav__menu-item"
                  onClick={() => {
                    navigate('/profile');
                    setShowUserMenu(false);
                  }}
                >
                  View Profile
                </button>
                <button
                  type="button"
                  className="btn btn--glass nav__menu-item"
                  onClick={handleLogout}
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        ) : (
          <button
            className="btn btn--primary"
            onClick={() => navigate('/login')}
            type="button"
            title="Sign in to your account"
          >
            Login
          </button>
        )}
      </div>
    </header>
  );
}

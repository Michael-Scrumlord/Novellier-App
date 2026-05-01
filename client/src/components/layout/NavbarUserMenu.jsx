import { useCallback, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '../../contexts/AuthContext.jsx';
import { useClickOutside } from '../../hooks/useClickOutside.js';
import { getDisplayName, getInitials } from '../../utils/stringUtils.js';

function UserAvatar({ user, displayName }) {
    if (user.profilePicture) {
        return <img src={user.profilePicture} alt={displayName} className="nav__user-picture" />;
    }
    return <span className="nav__user-initials">{getInitials(displayName)}</span>;
}

export default function NavbarUserMenu() {
    const navigate = useNavigate();
    const { user, handleLogout } = useAuthContext();
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);

    const handleClose = useCallback(() => setIsOpen(false), []);
    useClickOutside(containerRef, handleClose, isOpen);

    const displayName = getDisplayName(user);

    const handleViewProfile = () => {
        navigate('/profile');
        setIsOpen(false);
    };

    return (
        <div className="nav__user-section" ref={containerRef}>
            <button
                className="nav__user-btn"
                type="button"
                onClick={() => setIsOpen(!isOpen)}
            >
                <div className="nav__user-avatar">
                    <UserAvatar user={user} displayName={displayName} />
                </div>
                <div className="nav__user-info">
                    <span className="nav__user-role">{user.role}</span>
                </div>
            </button>

            {isOpen && (
                <div className="nav__user-menu">
                    <div className="nav__menu-header">
                        <p className="nav__menu-title">{displayName}</p>
                        <p className="nav__menu-email">{user.email || 'No email'}</p>
                    </div>
                    <button type="button" className="btn btn--glass nav__menu-item" onClick={handleViewProfile}>
                        View Profile
                    </button>
                    <button type="button" className="btn btn--glass nav__menu-item" onClick={handleLogout}>
                        Logout
                    </button>
                </div>
            )}
        </div>
    );
}

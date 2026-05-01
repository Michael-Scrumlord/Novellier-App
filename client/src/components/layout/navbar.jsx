import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '../../contexts/AuthContext.jsx';
import NavbarThemeMenu from './NavbarThemeMenu.jsx';
import NavbarUserMenu from './NavbarUserMenu.jsx';
import logoMask from '../../../public/logo/mask.png';
import './navbar.css';
import './Dropdown.css';
import '../../styles/Buttons.css';

function NavBrand({ onClick }) {
    const maskStyle = {
        WebkitMaskImage: `url(${logoMask})`,
        maskImage: `url(${logoMask})`,
    };

    return (
        <div className="nav__brand" onClick={onClick} style={{ cursor: 'pointer' }} title="Go to Home">
            <div className="nav__brand-lockup">
                <div className="nav__logo-icon" style={maskStyle} aria-label="Novellier Logo" />
                <div className="nav__logo-text">NOVELLIER</div>
            </div>
        </div>
    );
}

function NavLinks({ user, onNavigate }) {
    return (
        <nav className="nav__links">
            <button className="nav__link-btn" onClick={() => onNavigate('/home')} type="button">
                Home
            </button>
            <button className="nav__link-btn" onClick={() => onNavigate('/workspace')} type="button">
                Workspace
            </button>
            {user?.role === 'admin' && (
                <button
                    className="nav__link-btn nav__link-btn--admin"
                    onClick={() => onNavigate('/admin')}
                    type="button"
                >
                    Admin
                </button>
            )}
        </nav>
    );
}

export default function Navbar() {
    const navigate = useNavigate();
    const { user, isAuthenticated } = useAuthContext();

    return (
        <header className="nav">
            <NavBrand onClick={() => navigate('/home')} />

            {isAuthenticated && <NavLinks user={user} onNavigate={navigate} />}

            <div className="nav__actions">
                <NavbarThemeMenu />

                {user ? (
                    <NavbarUserMenu />
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

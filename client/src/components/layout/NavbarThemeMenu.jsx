import { useCallback, useRef, useState } from 'react';
import { THEMES } from '../../constants/themes.js';
import { useClickOutside } from '../../hooks/useClickOutside.js';
import { useThemeContext } from '../../contexts/ThemeContext.jsx';

function ThemeOption({ themeId, name, description, isActive, onPick }) {
    const className = isActive
        ? 'nav__theme-option nav__theme-option--active'
        : 'nav__theme-option';

    return (
        <button className={className} onClick={() => onPick(themeId)} type="button">
            <span className="nav__theme-dot" data-theme={themeId} />
            <div className="nav__theme-text">
                <span className="nav__theme-label">{name}</span>
                <span className="nav__theme-desc">{description}</span>
            </div>
        </button>
    );
}

export default function NavbarThemeMenu() {
    const { theme, setTheme } = useThemeContext();
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);

    const handleClose = useCallback(() => setIsOpen(false), []);
    useClickOutside(containerRef, handleClose, isOpen);

    const handlePick = (nextTheme) => {
        setTheme(nextTheme);
        setIsOpen(false);
    };

    return (
        <div className="nav__theme-selector" ref={containerRef}>
            <button
                className="btn btn--glass nav__theme-toggle"
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                title="Select theme"
            >
                Theme
            </button>

            {isOpen && (
                <div className="nav__theme-menu">
                    <div className="nav__theme-menu-header">
                        <p>Choose Theme</p>
                    </div>
                    <div className="nav__theme-options">
                        {THEMES.map(({ id, name, description }) => (
                            <ThemeOption
                                key={id}
                                themeId={id}
                                name={name}
                                description={description}
                                isActive={theme === id}
                                onPick={handlePick}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

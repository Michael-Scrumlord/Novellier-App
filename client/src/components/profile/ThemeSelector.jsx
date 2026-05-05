import { THEMES } from '../../constants/themes.js';

function ThemeCard({ theme, isActive, onPick }) {
    const className = isActive ? 'theme-card theme-card--active' : 'theme-card';

    return (
        <button type="button" className={className} onClick={() => onPick(theme.id)}>
            <div className="theme-card__preview">
                {theme.colors.map((color, idx) => (
                    <div
                        key={idx}
                        className="theme-card__color"
                        style={{ backgroundColor: color }}
                    />
                ))}
            </div>
            <div className="theme-card__info">
                <p className="theme-card__name">{theme.name}</p>
                <p className="theme-card__description">{theme.description}</p>
            </div>
        </button>
    );
}

export default function ThemeSelector({ currentTheme, onThemeChange }) {
    return (
        <section className="panel panel--theme-selector">
            <div className="panel__header">
                <h3>Theme</h3>
            </div>

            <div className="theme-grid">
                {THEMES.map((theme) => (
                    <ThemeCard
                        key={theme.id}
                        theme={theme}
                        isActive={currentTheme === theme.id}
                        onPick={onThemeChange}
                    />
                ))}
            </div>
        </section>
    );
}

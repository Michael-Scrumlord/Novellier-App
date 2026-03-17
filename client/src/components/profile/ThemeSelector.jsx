import { THEMES } from '../../constants/themes.js';

export default function ThemeSelector({ currentTheme, onThemeChange }) {
  return (
    <section className="panel panel--theme-selector">
      <div className="panel__header">
        <h3>Theme</h3>
      </div>

      <div className="theme-grid">
        {THEMES.map((theme) => (
          <button
            key={theme.id}
            type="button"
            className={`theme-card ${currentTheme === theme.id ? 'theme-card--active' : ''}`}
            onClick={() => onThemeChange(theme.id)}
          >
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
        ))}
      </div>
    </section>
  );
}

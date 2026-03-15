import { useState } from 'react';

export default function AuthPanel({ onSubmit, isLoading, error }) {
    const [credentials, setCredentials] = useState({ username: '', password: '' });

    const handleChange = (event) => {
        const { name, value } = event.target;
        setCredentials((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (event) => {
        event.preventDefault();
        onSubmit(credentials);
    };

    return (
        <section className="auth" aria-live="polite">
        <div className="auth__card">
            <h2>Welcome back</h2>
            <p>Sign in to access your writing projects</p>
            <form onSubmit={handleSubmit} className="auth__form">
            <label>
                Username
                <input
                name="username"
                value={credentials.username}
                onChange={handleChange}
                placeholder="Your username"
                required
                />
            </label>
            <label>
                Password
                <input
                type="password"
                name="password"
                value={credentials.password}
                onChange={handleChange}
                placeholder="••••••••"
                required
                />
            </label>
            <button className="btn btn--primary" type="submit" disabled={isLoading}>
                {isLoading ? 'Signing in...' : 'Login'}
            </button>
            {error ? <p className="auth__error">{error}</p> : null}
            </form>
        </div>
        </section>
    );
}
import { useState } from 'react';
import './Auth.css'; // Make sure Forms.css is imported globally in App.jsx

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
        <section className="auth-layout" aria-live="polite">
            <div className="auth__card">
                <h2>Welcome back</h2>
                <p>Sign in to access your writing projects</p>
                
                <form onSubmit={handleSubmit} className="auth__form">
                    
                    {/* Utilizing the global .form-group architecture */}
                    <div className="form-group">
                        <label htmlFor="auth-username">Username</label>
                        <input
                            id="auth-username"
                            name="username"
                            value={credentials.username}
                            onChange={handleChange}
                            placeholder="Your username"
                            required
                        />
                    </div>
                    
                    <div className="form-group">
                        <label htmlFor="auth-password">Password</label>
                        <input
                            id="auth-password"
                            type="password"
                            name="password"
                            value={credentials.password}
                            onChange={handleChange}
                            placeholder="••••••••"
                            required
                        />
                    </div>

                    <button className="btn btn--primary" type="submit" disabled={isLoading}>
                        {isLoading ? 'Signing in...' : 'Login'}
                    </button>
                    
                    {error ? <div className="auth__error">{error}</div> : null}
                </form>
            </div>
        </section>
    );
}
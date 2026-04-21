import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getApiBaseUrl, loginRequest } from '../lib/api';

export default function LoginPage({ auth }) {
    const navigate = useNavigate();
    const [form, setForm] = useState({ phone: '', password: '' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    async function handleSubmit(event) {
        event.preventDefault();
        setLoading(true);
        setError('');

        try {
            const payload = await loginRequest(form);
            auth.login({
                token: payload.token,
                business: payload.business,
            });
            navigate('/dashboard', { replace: true });
        } catch (err) {
            setError(err.message || 'Login failed');
        } finally {
            setLoading(false);
        }
    }

    return (
        <main className="auth-page">
            <section className="auth-card auth-card--intro">
                <p className="eyebrow">SmartOps Dashboard</p>
                <h1>Operational intelligence for your store</h1>
                <p className="auth-copy">
                    Review revenue trends, product movement, payment mix, and customer segments
                    from a single examiner-ready dashboard.
                </p>
                <div className="auth-highlights">
                    <div>
                        <strong>5</strong>
                        <span>presentation-ready panels</span>
                    </div>
                    <div>
                        <strong>JWT</strong>
                        <span>same business auth as mobile</span>
                    </div>
                    <div>
                        <strong>Live API</strong>
                        <span>powered by existing analytics routes</span>
                    </div>
                </div>
            </section>

            <section className="auth-card auth-card--form">
                <div className="auth-card__header">
                    <h2>Business Login</h2>
                    <p>API base URL: {getApiBaseUrl()}</p>
                </div>

                <form className="auth-form" onSubmit={handleSubmit}>
                    <label>
                        <span>Phone</span>
                        <input
                            autoComplete="username"
                            value={form.phone}
                            onChange={event => setForm(current => ({ ...current, phone: event.target.value }))}
                            placeholder="Enter registered phone"
                            required
                        />
                    </label>

                    <label>
                        <span>Password</span>
                        <input
                            autoComplete="current-password"
                            type="password"
                            value={form.password}
                            onChange={event => setForm(current => ({ ...current, password: event.target.value }))}
                            placeholder="Enter password"
                            required
                        />
                    </label>

                    {error ? <p className="form-error">{error}</p> : null}

                    <button className="button button--primary" type="submit" disabled={loading}>
                        {loading ? 'Signing in...' : 'Open Dashboard'}
                    </button>
                </form>
            </section>
        </main>
    );
}

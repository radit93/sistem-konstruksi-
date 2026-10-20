/* Hallmark · macrostructure: Threshold · theme: Acorn-Blue · tone: utilitarian
 * disciplines: honest-copy · locked-tokens · typography-purity · real-states
 * states: default · hover · focus · active · disabled · error · loading
 *
 * A plain sign-in form: email, password, submit. Nothing else. The previous
 * role-picker grid was removed because the API authenticates by credential
 * alone, so picking a card only pre-filled fields the user then had to confirm.
 */

import React, { useState } from 'react';
import { api } from '../api';

export function LoginModal({ onLoginSuccess }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await api.login(email, password);
            if (onLoginSuccess) onLoginSuccess();
        } catch (err) {
            setError(err.message || 'Login gagal. Periksa kembali email dan password.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="pcm-login">
            {/* A plain div, not <main>: the theme pads every main element by the
                sidebar width, which this page does not have. */}
            <div className="pcm-login__panel" role="main">
                <header className="pcm-login__brand">
                    <span className="pcm-login__mark" aria-hidden="true">P</span>
                    <span className="pcm-login__brand-text">
                        <strong>PCM Piping Suite</strong>
                        <span>Job No. 2428</span>
                    </span>
                </header>

                <h1 className="pcm-login__title">Masuk</h1>
                <p className="pcm-login__lede">Gunakan email dan password akun proyek Anda.</p>

                {error && (
                    <div className="alert alert-danger pcm-login__alert" role="alert">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="pcm-login__form">
                    <div className="mb-3">
                        <label className="form-label pcm-login__label" htmlFor="pcm-login-email">
                            Email
                        </label>
                        <input
                            id="pcm-login-email"
                            type="email"
                            className="form-control form-control-lg"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="nama@pcm.local"
                            autoComplete="username"
                            autoFocus
                            required
                        />
                    </div>

                    <div className="mb-4">
                        <label className="form-label pcm-login__label" htmlFor="pcm-login-password">
                            Password
                        </label>
                        <input
                            id="pcm-login-password"
                            type="password"
                            className="form-control form-control-lg"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            autoComplete="current-password"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary btn-lg w-100 pcm-login__submit"
                        disabled={loading}
                    >
                        {loading ? 'Memproses...' : 'Masuk'}
                    </button>
                </form>

                <p className="pcm-login__foot">
                    &copy; 2026 PCM Piping Suite &bull; Job No. 2428
                </p>
            </div>
        </div>
    );
}

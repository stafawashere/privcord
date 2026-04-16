import { useState } from 'react';
import { api } from '../api.js';

export default function Auth({ onAuthenticated }) {
  const [mode, setMode] = useState('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const fn = mode === 'login' ? api.login : api.signup;
      const { token, user } = await fn(username.trim(), password);
      onAuthenticated(user, token);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="h-screen w-screen flex items-center justify-center bg-[#0a0a0a] text-neutral-200 p-6">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="flex items-center gap-3 mb-10 justify-center">
          <div className="w-9 h-9 rounded-xl bg-neutral-800 border border-neutral-700/60 flex items-center justify-center shadow-lg">
            <iconify-icon icon="solar:shield-keyhole-linear" width="20" height="20" class="text-neutral-200"></iconify-icon>
          </div>
          <span className="text-2xl font-semibold tracking-tight">Privcord</span>
        </div>

        {/* Card */}
        <div className="bg-[#0e0e0e] border border-neutral-800/70 rounded-2xl p-7 shadow-2xl">
          <h1 className="text-lg font-semibold tracking-tight text-neutral-100 mb-1">
            {mode === 'login' ? 'Welcome back' : 'Create your account'}
          </h1>
          <p className="text-sm text-neutral-500 mb-7">
            {mode === 'login'
              ? 'Sign in with your username and password.'
              : 'No email required — just a username and password.'}
          </p>

          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-neutral-500 tracking-wide uppercase">
                Username
              </label>
              <input
                type="text"
                autoFocus
                autoComplete="username"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="e.g. alice"
                className="w-full bg-neutral-900/60 border border-neutral-800/80 rounded-xl px-4 py-3 text-sm text-neutral-200 placeholder:text-neutral-600 focus:outline-none focus:border-neutral-600 focus:bg-neutral-900 transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-neutral-500 tracking-wide uppercase">
                Password
              </label>
              <input
                type="password"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="At least 4 characters"
                className="w-full bg-neutral-900/60 border border-neutral-800/80 rounded-xl px-4 py-3 text-sm text-neutral-200 placeholder:text-neutral-600 focus:outline-none focus:border-neutral-600 focus:bg-neutral-900 transition-all"
              />
            </div>

            {error && (
              <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || !username.trim() || !password}
              className="w-full py-3 rounded-xl bg-neutral-200 text-[#0a0a0a] text-sm font-semibold hover:bg-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed mt-1"
            >
              {submitting
                ? 'Please wait…'
                : mode === 'login' ? 'Sign in' : 'Create account'}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-neutral-800/60 text-center text-sm text-neutral-500">
            {mode === 'login' ? (
              <>
                New to Privcord?{' '}
                <button
                  onClick={() => { setMode('signup'); setError(''); }}
                  className="text-neutral-200 hover:text-white transition-colors font-medium"
                >
                  Create an account
                </button>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <button
                  onClick={() => { setMode('login'); setError(''); }}
                  className="text-neutral-200 hover:text-white transition-colors font-medium"
                >
                  Sign in
                </button>
              </>
            )}
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-neutral-600">
          Private. Direct. Yours.
        </p>
      </div>
    </div>
  );
}

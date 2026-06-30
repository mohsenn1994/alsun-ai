import { useState, type FormEvent } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { loginSchema } from '@alsun/schemas';
import { useAuth } from '../auth/AuthContext';
import { ApiError } from '../lib/api';
import { Wordmark } from '../components/Wordmark';

/**
 * Sign-in screen. If a session already exists it redirects to wherever the user
 * was headed (the `from` stashed by RequireAuth, defaulting to "/"). Validates
 * with the shared loginSchema, then calls the AuthContext login.
 */
export function LoginPage() {
  const { authenticated, loading, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/';

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Already signed in → bounce to the intended destination.
  if (!loading && authenticated) return <Navigate to={from} replace />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const parsed = loginSchema.safeParse({ username, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Enter your username and password.');
      return;
    }

    setSubmitting(true);
    try {
      await login(username, password);
      navigate(from, { replace: true });
    } catch (err) {
      // 401 surfaces here as an ApiError with the server's message.
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Try again.');
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass =
    'w-full rounded-lg border border-slate-200 px-3 py-2.5 text-slate-900 outline-none transition focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/25';

  return (
    <main className="grid min-h-screen place-items-center p-6">
      <form
        onSubmit={onSubmit}
        noValidate
        className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-9 shadow-[0_12px_32px_rgba(19,24,43,0.08)]"
      >
        <div className="mb-7">
          <Wordmark />
          <span className="mt-0.5 block text-xs uppercase tracking-wider text-slate-500">
            Form builder
          </span>
        </div>

        <h1 className="mb-1 text-2xl font-semibold tracking-tight">Sign in</h1>
        <p className="mb-6 text-sm text-slate-500">
          Use your creator credentials to manage forms.
        </p>

        {error && (
          <div
            role="alert"
            className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        <label className="mb-4 block">
          <span className="mb-1.5 block text-sm font-medium">Username</span>
          <input
            className={inputClass}
            type="text"
            value={username}
            autoComplete="username"
            autoFocus
            onChange={(e) => setUsername(e.target.value)}
          />
        </label>

        <label className="mb-4 block">
          <span className="mb-1.5 block text-sm font-medium">Password</span>
          <input
            className={inputClass}
            type="password"
            value={password}
            autoComplete="current-password"
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>

        <button
          type="submit"
          disabled={submitting}
          className="mt-1.5 w-full rounded-lg bg-indigo-600 px-4 py-2.5 font-semibold text-white transition hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40 disabled:opacity-60"
        >
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </main>
  );
}

import type { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { Wordmark } from './Wordmark';

/**
 * Chrome for the authenticated creator area: a top bar (wordmark + current user +
 * sign out) and a centered content column. Public pages deliberately do NOT use
 * this layout, so respondents never see creator controls.
 */
export function AppLayout({ children }: { children: ReactNode }) {
  const { username, logout } = useAuth();
  const navigate = useNavigate();

  // Log out, then send the user to the login screen.
  async function onLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3.5">
        <Link to="/" aria-label="Home">
          <Wordmark className="text-lg" />
        </Link>
        <div className="flex items-center gap-3.5">
          {username && <span className="text-sm text-slate-500">{username}</span>}
          <button
            onClick={onLogout}
            className="rounded-lg border border-slate-200 px-3.5 py-2 text-sm font-medium text-slate-900 transition hover:bg-slate-100"
          >
            Sign out
          </button>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-10">{children}</main>
    </div>
  );
}

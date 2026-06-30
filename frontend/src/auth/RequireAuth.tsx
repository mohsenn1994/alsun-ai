import { Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from './AuthContext';

/**
 * Route guard for creator pages. While the initial session check is in flight it
 * shows a spinner (so we don't flash the login page); once resolved it either
 * renders the children or redirects to /login, stashing the attempted path in
 * router state so login can send the user back where they were headed.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { authenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center">
        <span
          role="status"
          aria-label="Loading"
          className="inline-block h-7 w-7 animate-spin rounded-full border-[3px] border-slate-200 border-t-indigo-600"
        />
      </div>
    );
  }
  if (!authenticated) {
    // Remember where they were headed so login can send them back.
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <>{children}</>;
}

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import { RequireAuth } from './auth/RequireAuth';
import { LoginPage } from './pages/LoginPage';
import { FormsPage } from './pages/FormsPage';
import { FormEditorPage } from './pages/FormEditorPage';
import { PublicFormPage } from './pages/PublicFormPage';
import { SubmissionsPage } from './pages/SubmissionsPage';
import { SubmissionDetailPage } from './pages/SubmissionDetailPage';

/**
 * Root component and route table. AuthProvider wraps everything so any route can
 * read session state. Creator routes are wrapped in <RequireAuth> (redirect to
 * /login if not signed in); the public form page (/f/:token) is deliberately
 * ungated and outside the app shell so respondents see no creator chrome.
 */
export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          {/* Creator area — all guarded. */}
          <Route
            path="/"
            element={
              <RequireAuth>
                <FormsPage />
              </RequireAuth>
            }
          />
          <Route
            path="/forms/:id"
            element={
              <RequireAuth>
                <FormEditorPage />
              </RequireAuth>
            }
          />
          <Route
            path="/forms/:id/submissions"
            element={
              <RequireAuth>
                <SubmissionsPage />
              </RequireAuth>
            }
          />
          <Route
            path="/forms/:id/submissions/:sid"
            element={
              <RequireAuth>
                <SubmissionDetailPage />
              </RequireAuth>
            }
          />
          {/* Public respondent page — no auth, no app shell. */}
          <Route path="/f/:token" element={<PublicFormPage />} />
          {/* Unknown paths fall back home. */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

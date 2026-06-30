import { Link, useParams } from 'react-router-dom';
import { AppLayout } from '../components/AppLayout';
import { useForm } from '../queries/forms';
import { useSubmissions } from '../queries/submissions';

/**
 * Responses list for a form. Pulls the form (for its title) and its submissions,
 * rendering each as a row (timestamp + answer count) that links into the detail.
 * Handles loading/error/empty states.
 */
export function SubmissionsPage() {
  const { id = '' } = useParams();
  const { data: form } = useForm(id);
  const { data: submissions, isLoading, isError } = useSubmissions(id);

  return (
    <AppLayout>
      <Link to={`/forms/${id}`} className="text-sm text-indigo-600 hover:underline">
        ← Back to editor
      </Link>

      <h1 className="mt-4 text-2xl font-semibold tracking-tight">Responses</h1>
      {form && <p className="mb-5 mt-1 text-sm text-slate-500">{form.title}</p>}

      {isLoading && <p className="text-slate-500">Loading…</p>}
      {isError && <p className="text-red-700">Couldn't load responses.</p>}

      {submissions && submissions.length === 0 && (
        <p className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
          No responses yet. Share the form's public link to start collecting.
        </p>
      )}

      {submissions && submissions.length > 0 && (
        <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
          {submissions.map((s) => (
            <li key={s.id}>
              <Link
                to={`/forms/${id}/submissions/${s.id}`}
                className="flex items-center justify-between px-4 py-3.5 transition hover:bg-slate-50"
              >
                <span className="text-sm text-slate-800">
                  {new Date(s.createdAt).toLocaleString()}
                </span>
                <span className="text-xs text-slate-400">
                  {s.answerCount} answer{s.answerCount === 1 ? '' : 's'} ›
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </AppLayout>
  );
}

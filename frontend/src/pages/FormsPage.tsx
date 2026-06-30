import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import type { Form } from '@alsun/schemas';
import { createFormSchema } from '@alsun/schemas';
import { AppLayout } from '../components/AppLayout';
import { StatusBadge } from '../components/StatusBadge';
import { useForms, useCreateForm, useUpdateForm, useDeleteForm } from '../queries/forms';

/**
 * The forms dashboard (home). Lists all forms, lets the creator create one
 * (validated with the shared schema), and renders each as a row that links into
 * the editor. Loading/error/empty states are handled explicitly.
 */
export function FormsPage() {
  const { data: forms, isLoading, isError } = useForms();
  const createForm = useCreateForm();

  const [title, setTitle] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setCreateError(null);
    const parsed = createFormSchema.safeParse({ title: title.trim() });
    if (!parsed.success) {
      setCreateError(parsed.error.issues[0]?.message ?? 'Enter a form title.');
      return;
    }
    await createForm.mutateAsync(parsed.data);
    setTitle('');
  }

  return (
    <AppLayout>
      <h1 className="mb-1 text-2xl font-semibold tracking-tight">Forms</h1>
      <p className="mb-6 text-sm text-slate-500">Create a form, then add questions and publish it.</p>

      <form onSubmit={onCreate} className="mb-8 flex gap-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="New form title"
          className="flex-1 rounded-lg border border-slate-200 px-3 py-2.5 outline-none transition focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/25"
        />
        <button
          type="submit"
          disabled={createForm.isPending}
          className="rounded-lg bg-indigo-600 px-4 py-2.5 font-semibold text-white transition hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40 disabled:opacity-60"
        >
          {createForm.isPending ? 'Creating…' : 'Create form'}
        </button>
      </form>
      {createError && <p className="-mt-6 mb-6 text-sm text-red-700">{createError}</p>}

      {isLoading && <p className="text-slate-500">Loading forms…</p>}
      {isError && <p className="text-red-700">Couldn't load forms. Refresh to try again.</p>}

      {forms && forms.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-300 p-10 text-center">
          <p className="font-medium">No forms yet</p>
          <p className="mt-1 text-sm text-slate-500">Create your first form above to get started.</p>
        </div>
      )}

      {forms && forms.length > 0 && (
        <ul className="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white">
          {forms.map((form) => (
            <FormRow key={form.id} form={form} />
          ))}
        </ul>
      )}
    </AppLayout>
  );
}

/**
 * A single form row: links into the editor, shows status, and offers inline
 * rename and delete (delete is confirmed because it cascades to questions and
 * submissions server-side).
 */
function FormRow({ form }: { form: Form }) {
  const updateForm = useUpdateForm();
  const deleteForm = useDeleteForm();

  const [editing, setEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState(form.title);

  // Save a rename; no-op if unchanged/empty.
  async function saveRename(e: FormEvent) {
    e.preventDefault();
    const next = draftTitle.trim();
    if (!next || next === form.title) {
      setEditing(false);
      setDraftTitle(form.title);
      return;
    }
    await updateForm.mutateAsync({ id: form.id, input: { title: next } });
    setEditing(false);
  }

  function onDelete() {
    if (window.confirm(`Delete "${form.title}"? This also removes its questions and submissions.`)) {
      deleteForm.mutate(form.id);
    }
  }

  return (
    <li className="flex items-center gap-3 px-4 py-3.5">
      {editing ? (
        <form onSubmit={saveRename} className="flex flex-1 items-center gap-2">
          <input
            value={draftTitle}
            onChange={(e) => setDraftTitle(e.target.value)}
            autoFocus
            className="flex-1 rounded-md border border-slate-200 px-2.5 py-1.5 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/25"
          />
          <button type="submit" className="text-sm font-medium text-indigo-600 hover:underline">
            Save
          </button>
          <button
            type="button"
            onClick={() => {
              setEditing(false);
              setDraftTitle(form.title);
            }}
            className="text-sm text-slate-500 hover:underline"
          >
            Cancel
          </button>
        </form>
      ) : (
        <>
          <div className="flex-1">
            <Link to={`/forms/${form.id}`} className="font-medium text-slate-900 hover:text-indigo-600">
              {form.title}
            </Link>
            <span className="ml-2 text-xs text-slate-400">
              {new Date(form.createdAt).toLocaleDateString()}
            </span>
          </div>
          <StatusBadge status={form.status} />
          <button onClick={() => setEditing(true)} className="text-sm text-slate-500 hover:text-slate-900">
            Rename
          </button>
          <button
            onClick={onDelete}
            disabled={deleteForm.isPending}
            className="text-sm text-slate-500 hover:text-red-700 disabled:opacity-50"
          >
            Delete
          </button>
        </>
      )}
    </li>
  );
}

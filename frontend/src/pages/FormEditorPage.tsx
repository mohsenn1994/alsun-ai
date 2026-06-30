import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import type { FormWithQuestions } from '../lib/api';
import { AppLayout } from '../components/AppLayout';
import { StatusBadge } from '../components/StatusBadge';
import { QuestionList } from '../components/QuestionList';
import { QuestionForm } from '../components/QuestionForm';
import { useForm, usePublishForm } from '../queries/forms';

/**
 * The form editor. Loads one form (with its questions), and composes the
 * publish bar, the draggable question list, and the add-question form. A "View
 * responses" link jumps to that form's submissions.
 */
export function FormEditorPage() {
  const { id = '' } = useParams();
  const { data: form, isLoading, isError } = useForm(id);

  return (
    <AppLayout>
      <Link to="/" className="text-sm text-indigo-600 hover:underline">
        ← Back to forms
      </Link>

      {isLoading && <p className="mt-4 text-slate-500">Loading…</p>}
      {isError && <p className="mt-4 text-red-700">Couldn't load this form.</p>}

      {form && (
        <div className="mt-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">{form.title}</h1>
              <p className="mb-5 mt-1 text-sm text-slate-500">
                {form.questions.length} question{form.questions.length === 1 ? '' : 's'}
              </p>
            </div>
            <Link
              to={`/forms/${id}/submissions`}
              className="shrink-0 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium transition hover:bg-slate-100"
            >
              View responses
            </Link>
          </div>

          <PublishBar form={form} />

          <div className="mt-6">
            <QuestionList formId={id} questions={form.questions} />

            <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4">
              <p className="mb-3 text-sm font-medium">Add a question</p>
              <QuestionForm formId={id} />
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

/**
 * Publish controls. Shows the current status and a publish/unpublish button;
 * once published, reveals the shareable /f/:token URL with a copy button.
 */
function PublishBar({ form }: { form: FormWithQuestions }) {
  const publish = usePublishForm();
  const [copied, setCopied] = useState(false);

  const isPublished = form.status === 'published';
  // The shareable link only exists once a token has been minted (on first publish).
  const url = form.publicToken ? `${window.location.origin}/f/${form.publicToken}` : null;

  function toggle() {
    publish.mutate({ id: form.id, published: !isPublished });
  }

  async function copy() {
    if (!url) return;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <StatusBadge status={form.status} />
          <span className="text-sm text-slate-500">
            {isPublished ? 'Anyone with the link can respond.' : 'Only you can see this form.'}
          </span>
        </div>
        <button
          onClick={toggle}
          disabled={publish.isPending}
          className={
            isPublished
              ? 'rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium transition hover:bg-slate-100 disabled:opacity-60'
              : 'rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40 disabled:opacity-60'
          }
        >
          {publish.isPending ? 'Saving…' : isPublished ? 'Unpublish' : 'Publish'}
        </button>
      </div>

      {isPublished && url && (
        <div className="mt-3 flex items-center gap-2">
          <input
            readOnly
            value={url}
            onFocus={(e) => e.currentTarget.select()}
            className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600 outline-none"
          />
          <button
            onClick={copy}
            className="rounded-lg border border-slate-200 px-3.5 py-2 text-sm font-medium transition hover:bg-slate-100"
          >
            {copied ? 'Copied' : 'Copy link'}
          </button>
        </div>
      )}
    </div>
  );
}

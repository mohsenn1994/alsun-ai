import { useState, type ChangeEvent, type ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import type { Question, AnswerInput } from '@alsun/schemas';
import { ApiError, publicApi } from '../lib/api';
import { usePublicForm, useSubmitPublicForm } from '../queries/public';

// A file answer is a reference to an already-uploaded file.
type FileRef = { fileId: string };
// The local value of any answer, by question type.
type AnswerValue = string | string[] | FileRef;

/**
 * The public, unauthenticated form page (/f/:token). Fetches the published form,
 * renders each question by type, keeps answers in local state, runs a courtesy
 * required-check before submitting, and shows a success screen afterward. The
 * server is the real validator — see onError below for mapping its errors back.
 */
export function PublicFormPage() {
  const { token = '' } = useParams();
  const { data: form, isLoading, isError } = usePublicForm(token);
  const submit = useSubmitPublicForm(token);
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (isLoading) {
    return <Centered>Loading…</Centered>;
  }
  if (isError || !form) {
    // Draft, unknown token, or unpublished — all indistinguishable here.
    return (
      <Centered>
        This form isn't available. The link may be incorrect, or the form is no longer published.
      </Centered>
    );
  }

  // After a successful submit, replace the form with a thank-you state.
  if (submit.isSuccess) {
    return (
      <Centered>
        <span className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-700">
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-6 w-6" aria-hidden="true">
            <path
              fillRule="evenodd"
              d="M16.7 5.3a1 1 0 0 1 0 1.4l-7.5 7.5a1 1 0 0 1-1.4 0L3.3 9.7a1 1 0 1 1 1.4-1.4l3.3 3.3 6.8-6.8a1 1 0 0 1 1.4 0Z"
              clipRule="evenodd"
            />
          </svg>
        </span>
        <span className="block text-lg font-semibold text-slate-900">Thanks!</span>
        <span className="mt-1 block text-slate-500">Your response has been recorded.</span>
      </Centered>
    );
  }

  // Set (or clear, when value is undefined) one answer, and clear its field error.
  function setAnswer(questionId: string, value: AnswerValue | undefined) {
    setAnswers((prev) => {
      if (value === undefined) {
        const next = { ...prev };
        delete next[questionId];
        return next;
      }
      return { ...prev, [questionId]: value };
    });
    setErrors((prev) => {
      if (!prev[questionId]) return prev;
      const next = { ...prev };
      delete next[questionId];
      return next;
    });
  }

  // Build the payload, run the client-side required check, then submit. The
  // server re-validates; any field errors it returns are mapped back onto fields.
  function handleSubmit() {
    const nextErrors: Record<string, string> = {};
    const payload: AnswerInput[] = [];

    for (const question of form!.questions) {
      const value = answers[question.id];
      if (!isAnswered(question, value)) {
        if (question.required) nextErrors[question.id] = 'This question is required.';
        continue;
      }
      payload.push({ questionId: question.id, value });
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    submit.mutate(payload, {
      onError: (err) => {
        // Defense in depth: surface server-side validation per field.
        if (err instanceof ApiError && err.details) {
          const serverErrors: Record<string, string> = {};
          for (const detail of err.details) serverErrors[detail.path] = detail.message;
          setErrors(serverErrors);
        }
      },
    });
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-xl">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
          <h1 className="text-2xl font-semibold tracking-tight">{form.title}</h1>

          <div className="mt-7 space-y-7">
            {form.questions.map((q) => (
              <Field
                key={q.id}
                question={q}
                value={answers[q.id]}
                error={errors[q.id]}
                onChange={(v) => setAnswer(q.id, v)}
              />
            ))}
          </div>

          <div className="mt-8 border-t border-slate-100 pt-6">
            <button
              onClick={handleSubmit}
              disabled={submit.isPending}
              className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40 disabled:opacity-60"
            >
              {submit.isPending ? 'Submitting…' : 'Submit'}
            </button>
            {submit.isError && Object.keys(errors).length === 0 && (
              <p className="mt-3 text-center text-sm text-red-700">
                Something went wrong submitting your response. Please try again.
              </p>
            )}
          </div>
        </div>

        <p className="mt-5 text-center text-xs text-slate-400">
          Powered by{' '}
          <span className="font-medium text-slate-500">
            alsun<span className="ml-px text-indigo-500">.</span>
          </span>
        </p>
      </div>
    </main>
  );
}

/**
 * Whether an answer counts as "provided" for its type (mirrors the server's
 * isAnswered). Used for the client-side required check; file is only considered
 * answered once an upload has produced a fileId.
 */
function isAnswered(question: Question, value: AnswerValue | undefined): boolean {
  if (question.type === 'text') return typeof value === 'string' && value.trim().length > 0;
  if (question.type === 'multiple_choice') return Array.isArray(value) && value.length > 0;
  if (question.type === 'file') return typeof value === 'object' && value !== null && 'fileId' in value;
  return false;
}

/** A labeled question wrapper: renders the type-specific input and any field error. */
function Field({
  question,
  value,
  error,
  onChange,
}: {
  question: Question;
  value: AnswerValue | undefined;
  error?: string;
  onChange: (value: AnswerValue | undefined) => void;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-slate-800">
        {question.label}
        {question.required && <span className="ml-0.5 text-red-600">*</span>}
      </label>
      <FieldInput question={question} value={value} error={error} onChange={onChange} />
      {error && <p className="mt-1.5 text-sm text-red-700">{error}</p>}
    </div>
  );
}

/** Renders the correct control for a question's type (text / radios|checkboxes / file). */
function FieldInput({
  question,
  value,
  error,
  onChange,
}: {
  question: Question;
  value: AnswerValue | undefined;
  error?: string;
  onChange: (value: AnswerValue | undefined) => void;
}) {
  const ring = error
    ? 'border-red-400 focus:border-red-500 focus:ring-red-500/25'
    : 'border-slate-200 focus:border-indigo-600 focus:ring-indigo-500/25';

  switch (question.type) {
    case 'text':
      return (
        <input
          type="text"
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={!!error}
          className={`w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition focus:ring-2 ${ring}`}
        />
      );

    case 'multiple_choice': {
      const selected = Array.isArray(value) ? value : [];
      const multiple = question.config.allowMultiple;
      // Checkboxes when multiple selections are allowed; radios otherwise.
      return (
        <div className="space-y-2">
          {question.config.options.map((option) => {
            const checked = selected.includes(option);
            return (
              <label
                key={option}
                className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-slate-200 px-3 py-2.5 text-sm transition hover:bg-slate-50"
              >
                <input
                  type={multiple ? 'checkbox' : 'radio'}
                  name={question.id}
                  checked={checked}
                  onChange={() => {
                    if (multiple) {
                      // Toggle this option in/out of the selection array.
                      onChange(checked ? selected.filter((o) => o !== option) : [...selected, option]);
                    } else {
                      // Single-select: replace the selection.
                      onChange([option]);
                    }
                  }}
                  className="h-4 w-4 accent-indigo-600"
                />
                <span>{option}</span>
              </label>
            );
          })}
        </div>
      );
    }

    case 'file':
      return (
        <FileField
          value={value && typeof value === 'object' ? (value as FileRef) : undefined}
          onChange={onChange}
        />
      );
  }
}

/**
 * File input implementing the two-step upload: the moment a file is chosen it's
 * uploaded to the volume; we keep only the returned fileId in answer state and
 * reference it at submit time. Tracks its own upload status for the UI.
 */
function FileField({
  value,
  onChange,
}: {
  value: FileRef | undefined;
  onChange: (value: AnswerValue | undefined) => void;
}) {
  const [status, setStatus] = useState<'idle' | 'uploading' | 'done' | 'error'>(
    value ? 'done' : 'idle',
  );
  const [fileName, setFileName] = useState('');
  const [uploadError, setUploadError] = useState('');

  // Upload immediately on selection; store the fileId (or clear on failure).
  async function handlePick(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setStatus('uploading');
    setUploadError('');
    try {
      const res = await publicApi.uploadFile(file);
      onChange({ fileId: res.fileId });
      setStatus('done');
    } catch (err) {
      setStatus('error');
      setUploadError(err instanceof ApiError ? err.message : 'Upload failed. Please try again.');
      onChange(undefined);
    }
  }

  // Discard the chosen file and reset to the picker.
  function clear() {
    setStatus('idle');
    setFileName('');
    setUploadError('');
    onChange(undefined);
  }

  if (status === 'done') {
    return (
      <div className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2.5 text-sm">
        <span className="truncate text-slate-700">{fileName || 'File uploaded'}</span>
        <button type="button" onClick={clear} className="ml-3 shrink-0 text-slate-500 hover:text-red-700">
          Remove
        </button>
      </div>
    );
  }

  return (
    <div>
      <input
        type="file"
        onChange={handlePick}
        disabled={status === 'uploading'}
        className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-indigo-700 hover:file:bg-indigo-100 disabled:opacity-60"
      />
      {status === 'uploading' && <p className="mt-1.5 text-sm text-slate-500">Uploading {fileName}…</p>}
      {status === 'error' && uploadError && <p className="mt-1.5 text-sm text-red-700">{uploadError}</p>}
    </div>
  );
}

/** Centered single-message layout for loading / unavailable / success states. */
function Centered({ children }: { children: ReactNode }) {
  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 px-4">
      <div className="max-w-md text-center text-slate-500">{children}</div>
    </main>
  );
}

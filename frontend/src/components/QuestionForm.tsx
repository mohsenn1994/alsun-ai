import { useState, type FormEvent } from 'react';
import type { Question, QuestionType, CreateQuestionInput } from '@alsun/schemas';
import { createQuestionSchema } from '@alsun/schemas';
import { useAddQuestion, useUpdateQuestion } from '../queries/questions';
import { TYPE_LABEL } from '../lib/questionMeta';

// Selectable types when adding a question.
const ADD_TYPES: { value: QuestionType; label: string }[] = [
  { value: 'text', label: 'Text' },
  { value: 'multiple_choice', label: 'Multiple choice' },
  { value: 'file', label: 'File upload' },
];

const fieldClass =
  'rounded-lg border border-slate-200 px-3 py-2 outline-none transition focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/25';

/**
 * Dual-purpose controlled form for BOTH adding and editing a question (presence
 * of `question` switches to edit mode). On edit the type is shown but locked
 * (the API rejects type changes). For multiple-choice it renders an options
 * editor. The input is validated with the shared `createQuestionSchema` before
 * the mutation fires, so the same rules apply here as on the server.
 */
export function QuestionForm({
  formId,
  question,
  onDone,
}: {
  formId: string;
  question?: Question;
  onDone?: () => void;
}) {
  const isEdit = !!question;
  const add = useAddQuestion(formId);
  const update = useUpdateQuestion(formId);

  // Controlled fields, seeded from the existing question when editing.
  const [type, setType] = useState<QuestionType>(question?.type ?? 'text');
  const [label, setLabel] = useState(question?.label ?? '');
  const [required, setRequired] = useState(question?.required ?? false);
  const [options, setOptions] = useState<string[]>(
    question?.type === 'multiple_choice' ? question.config.options : [''],
  );
  const [allowMultiple, setAllowMultiple] = useState(
    question?.type === 'multiple_choice' ? question.config.allowMultiple : false,
  );
  const [error, setError] = useState<string | null>(null);

  const pending = add.isPending || update.isPending;

  // Assemble the typed input payload from the current field state.
  function buildInput(): CreateQuestionInput {
    const lbl = label.trim();
    // Note: visibility rules (Phase 6) aren't editable here yet; once they are,
    // this builder must preserve question.visibilityRule on edit.
    if (type === 'multiple_choice') {
      return {
        type: 'multiple_choice',
        label: lbl,
        required,
        config: { options: options.map((o) => o.trim()).filter(Boolean), allowMultiple },
      };
    }
    if (type === 'file') return { type: 'file', label: lbl, required, config: {} };
    return { type: 'text', label: lbl, required, config: {} };
  }

  // Validate with the shared schema, then add or update; reset the form after add.
  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const parsed = createQuestionSchema.safeParse(buildInput());
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Check the question details.');
      return;
    }

    try {
      if (isEdit && question) {
        await update.mutateAsync({ id: question.id, input: parsed.data });
        onDone?.();
      } else {
        await add.mutateAsync(parsed.data);
        setType('text');
        setLabel('');
        setRequired(false);
        setOptions(['']);
        setAllowMultiple(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save. Try again.");
    }
  }

  // MCQ option editor helpers.
  const setOption = (i: number, val: string) =>
    setOptions((prev) => prev.map((o, idx) => (idx === i ? val : o)));
  const addOption = () => setOptions((prev) => [...prev, '']);
  const removeOption = (i: number) => setOptions((prev) => prev.filter((_, idx) => idx !== i));

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-slate-500">Type</span>
          {/* Type is immutable after creation — show a static label when editing. */}
          {isEdit ? (
            <span className="rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-600">
              {TYPE_LABEL[type]}
            </span>
          ) : (
            <select
              value={type}
              onChange={(e) => setType(e.target.value as QuestionType)}
              className={fieldClass}
            >
              {ADD_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          )}
        </label>

        <label className="flex flex-1 flex-col gap-1">
          <span className="text-xs text-slate-500">Label</span>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Question label"
            className={fieldClass}
          />
        </label>

        <label className="flex items-center gap-2 pb-2">
          <input
            type="checkbox"
            checked={required}
            onChange={(e) => setRequired(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
          />
          <span className="text-sm">Required</span>
        </label>
      </div>

      {/* Options editor — only for multiple-choice questions. */}
      {type === 'multiple_choice' && (
        <div className="rounded-lg bg-slate-50 p-3">
          <span className="mb-2 block text-xs font-medium text-slate-500">Options</span>
          <div className="space-y-2">
            {options.map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  value={opt}
                  onChange={(e) => setOption(i, e.target.value)}
                  placeholder={`Option ${i + 1}`}
                  className={`flex-1 bg-white ${fieldClass}`}
                />
                <button
                  type="button"
                  onClick={() => removeOption(i)}
                  className="px-2 text-lg leading-none text-slate-400 hover:text-red-700"
                  aria-label={`Remove option ${i + 1}`}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addOption}
            className="mt-2 text-sm font-medium text-indigo-600 hover:underline"
          >
            + Add option
          </button>
          <label className="mt-3 flex items-center gap-2">
            <input
              type="checkbox"
              checked={allowMultiple}
              onChange={(e) => setAllowMultiple(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-sm">Allow multiple selections</span>
          </label>
        </div>
      )}

      {error && <p className="text-sm text-red-700">{error}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-indigo-600 px-4 py-2 font-semibold text-white transition hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40 disabled:opacity-60"
        >
          {pending ? 'Saving…' : isEdit ? 'Save' : 'Add question'}
        </button>
        {isEdit && (
          <button
            type="button"
            onClick={onDone}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium transition hover:bg-slate-100"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

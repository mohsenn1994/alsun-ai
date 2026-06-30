import { z } from 'zod';
import type { Question } from './question';

/* ---- Per-type answer value shapes (stored in answers.value jsonb) ----
 * The runtime shape of an answer depends on the question type. These are the
 * building blocks validateAnswerValue dispatches to. */

export const textAnswerSchema = z.string();
export const multipleChoiceAnswerSchema = z.array(z.string()); // selected option values
export const fileAnswerSchema = z.object({ fileId: z.uuid() });  // reference to an upload

/* ---- Public submission input ---- */

/**
 * A single answer in a submission. `value` is intentionally `unknown`: the static
 * schema can't know a specific form's question shapes, so the value is validated
 * dynamically against its target question via validateAnswerValue (below).
 */
export const answerInputSchema = z.object({
  questionId: z.uuid(),
  value: z.unknown(),
});
export type AnswerInput = z.infer<typeof answerInputSchema>;

/** The full submission body: a flat list of answers. */
export const createSubmissionSchema = z.object({
  answers: z.array(answerInputSchema),
});
export type CreateSubmissionInput = z.infer<typeof createSubmissionSchema>;

/* ---- Submission views (creator dashboard) ---- */

/** One row in the responses list: identity, timestamp, and how many answers it has. */
export const submissionSummarySchema = z.object({
  id: z.uuid(),
  formId: z.uuid(),
  createdAt: z.string(),
  answerCount: z.number().int().nonnegative(),
});
export type SubmissionSummary = z.infer<typeof submissionSummarySchema>;

/**
 * Shared per-field answer validator. Pure and form-aware: the server runs it at
 * submit time; the client can reuse it for instant feedback. Required-field and
 * visibility orchestration (which questions must be answered) is layered on top
 * of this in the submission route (Phase 3) and the bonus evaluator (Phase 6).
 *
 * Returns a result object (rather than throwing) so a caller can collect every
 * field's error in one pass instead of failing on the first.
 */
export type AnswerValidation =
  | { ok: true; value: unknown }
  | { ok: false; error: string };

export function validateAnswerValue(question: Question, value: unknown): AnswerValidation {
  switch (question.type) {
    // Text: any string is structurally valid (emptiness/required handled by caller).
    case 'text': {
      const r = textAnswerSchema.safeParse(value);
      return r.success ? { ok: true, value: r.data } : { ok: false, error: 'Expected text.' };
    }
    // Multiple choice: must be a string[]; every value must be a known option; and
    // single-select questions may carry at most one selection.
    case 'multiple_choice': {
      const r = multipleChoiceAnswerSchema.safeParse(value);
      if (!r.success) return { ok: false, error: 'Expected a list of selected options.' };
      const allowed = new Set(question.config.options);
      const unknownOpts = r.data.filter((v) => !allowed.has(v));
      if (unknownOpts.length > 0) {
        return { ok: false, error: `Unknown option(s): ${unknownOpts.join(', ')}` };
      }
      if (!question.config.allowMultiple && r.data.length > 1) {
        return { ok: false, error: 'Only one option may be selected.' };
      }
      return { ok: true, value: r.data };
    }
    // File: must be a { fileId: uuid } reference. Existence of the upload is
    // checked separately in the submission route (it needs the DB).
    case 'file': {
      const r = fileAnswerSchema.safeParse(value);
      return r.success
        ? { ok: true, value: r.data }
        : { ok: false, error: 'Expected an uploaded file reference.' };
    }
  }
}

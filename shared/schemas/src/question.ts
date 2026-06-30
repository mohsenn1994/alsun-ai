import { z } from 'zod';

/** The three supported question types. The discriminant for the union below. */
export const questionTypeSchema = z.enum(['text', 'multiple_choice', 'file']);
export type QuestionType = z.infer<typeof questionTypeSchema>;

/* ---- Type-specific configuration (stored in questions.config jsonb) ----
 * Each question type carries a different `config` shape. Keeping these as
 * separate schemas lets the discriminated union below validate the right shape
 * for each type automatically. */

/** Text questions: optional placeholder and an optional multiline hint. */
export const textConfigSchema = z.object({
  placeholder: z.string().max(200).optional(),
  multiline: z.boolean().optional(),
});
export type TextConfig = z.infer<typeof textConfigSchema>;

/** Multiple-choice: at least one option, and whether more than one may be selected. */
export const multipleChoiceConfigSchema = z.object({
  options: z.array(z.string().min(1)).min(1, 'Add at least one option'),
  allowMultiple: z.boolean().default(false),
});
export type MultipleChoiceConfig = z.infer<typeof multipleChoiceConfigSchema>;

/** File uploads: optional accepted MIME types and an optional max size. */
export const fileConfigSchema = z.object({
  acceptedTypes: z.array(z.string()).optional(), // e.g. ['image/png', 'application/pdf']
  maxSizeMb: z.number().int().positive().max(50).optional(),
});
export type FileConfig = z.infer<typeof fileConfigSchema>;

/** Per-question display rule. null means always visible. */
export const visibilityRuleSchema = z.unknown().nullable();

/* ---- Question entity (as returned by the API) ----
 * Fields common to every question type. The per-type `type` + `config` pair is
 * added by each member of the discriminated union below. */
const questionBase = {
  id: z.uuid(),
  formId: z.uuid(),
  label: z.string().min(1).max(500),
  required: z.boolean(),
  position: z.number().int().nonnegative(),
  visibilityRule: visibilityRuleSchema,
};

/**
 * A question, discriminated on `type`. Because it's a discriminated union,
 * narrowing on `question.type` (e.g. === 'multiple_choice') tells TypeScript the
 * exact `config` shape — which is what makes validateAnswerValue type-safe.
 */
export const questionSchema = z.discriminatedUnion('type', [
  z.object({ ...questionBase, type: z.literal('text'), config: textConfigSchema }),
  z.object({ ...questionBase, type: z.literal('multiple_choice'), config: multipleChoiceConfigSchema }),
  z.object({ ...questionBase, type: z.literal('file'), config: fileConfigSchema }),
]);
export type Question = z.infer<typeof questionSchema>;

/* ---- Create / update inputs (server assigns id, formId, position) ----
 * Same per-type shape as the entity, minus the server-owned fields. Config gets
 * a `.default({})` for text/file so a bare `{}` is accepted. */
const createBase = {
  label: z.string().min(1, 'Label is required').max(500),
  required: z.boolean().default(false),
  visibilityRule: visibilityRuleSchema.optional(),
};

export const createQuestionSchema = z.discriminatedUnion('type', [
  z.object({ ...createBase, type: z.literal('text'), config: textConfigSchema.default({}) }),
  z.object({ ...createBase, type: z.literal('multiple_choice'), config: multipleChoiceConfigSchema }),
  z.object({ ...createBase, type: z.literal('file'), config: fileConfigSchema.default({}) }),
]);
export type CreateQuestionInput = z.infer<typeof createQuestionSchema>;

// Editing replaces the question's editable fields. Type is fixed once created,
// but the discriminant is sent so the correct config shape gets validated.
export const updateQuestionSchema = createQuestionSchema;
export type UpdateQuestionInput = z.infer<typeof updateQuestionSchema>;

/** Reorder body: the complete ordered list of this form's question ids. */
export const reorderQuestionsSchema = z.object({
  orderedIds: z.array(z.uuid()).min(1),
});
export type ReorderQuestionsInput = z.infer<typeof reorderQuestionsSchema>;

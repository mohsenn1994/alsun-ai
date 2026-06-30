import { z } from 'zod';

/**
 * Form lifecycle status. A form starts as a `draft` (private, editable) and
 * becomes `published` (reachable via its public token) when the creator publishes it.
 */
export const formStatusSchema = z.enum(['draft', 'published']);
export type FormStatus = z.infer<typeof formStatusSchema>;

/**
 * A form exactly as the API returns it. `publicToken` is null until the form is
 * published for the first time. Timestamps are ISO strings (JSON-serialized Dates).
 */
export const formSchema = z.object({
  id: z.uuid(),
  title: z.string().min(1).max(200),
  status: formStatusSchema,
  publicToken: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Form = z.infer<typeof formSchema>;

/** Body for creating a form — only the title; everything else is server-assigned. */
export const createFormSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
});
export type CreateFormInput = z.infer<typeof createFormSchema>;

/** Body for renaming a form. Title is optional so partial updates are allowed. */
export const updateFormSchema = z.object({
  title: z.string().min(1).max(200).optional(),
});
export type UpdateFormInput = z.infer<typeof updateFormSchema>;

/** Body for the publish toggle: `true` publishes, `false` reverts to draft. */
export const publishFormSchema = z.object({ published: z.boolean() });
export type PublishFormInput = z.infer<typeof publishFormSchema>;

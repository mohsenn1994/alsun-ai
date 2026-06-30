import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { CreateQuestionInput, UpdateQuestionInput } from '@alsun/schemas';
import { questionsApi } from '../lib/api';

// Questions are returned embedded in the form detail, so all of these refresh
// the ['forms', formId] query — one source of truth, no separate questions cache.
const formKey = (id: string) => ['forms', id] as const;

/** Add a question to a form, then refetch the form. */
export function useAddQuestion(formId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateQuestionInput) => questionsApi.add(formId, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: formKey(formId) }),
  });
}

/** Edit a question, then refetch the form. */
export function useUpdateQuestion(formId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateQuestionInput }) =>
      questionsApi.update(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: formKey(formId) }),
  });
}

/** Delete a question, then refetch the form. */
export function useDeleteQuestion(formId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => questionsApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: formKey(formId) }),
  });
}

/** Persist a new question order (full id list), then refetch the form. */
export function useReorderQuestions(formId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (orderedIds: string[]) => questionsApi.reorder(formId, orderedIds),
    onSuccess: () => qc.invalidateQueries({ queryKey: formKey(formId) }),
  });
}

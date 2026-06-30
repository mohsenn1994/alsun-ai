import { useMutation, useQuery } from '@tanstack/react-query';
import type { AnswerInput } from '@alsun/schemas';
import { publicApi } from '../lib/api';

/** Fetch a published form by its public token (respondent side). */
export function usePublicForm(token: string) {
  return useQuery({
    queryKey: ['public-form', token],
    queryFn: () => publicApi.getForm(token),
    enabled: !!token,
    retry: false, // a 404 (draft/unknown token) is definitive — don't retry
  });
}

/** Submit answers for a public form; the page reads its isSuccess/isError state. */
export function useSubmitPublicForm(token: string) {
  return useMutation({
    mutationFn: (answers: AnswerInput[]) => publicApi.submit(token, answers),
  });
}

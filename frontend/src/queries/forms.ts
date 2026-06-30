import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { CreateFormInput, UpdateFormInput } from '@alsun/schemas';
import { formsApi } from '../lib/api';

// Query-cache keys. The list lives under ['forms']; a single form (with its
// embedded questions) under ['forms', id]. Mutations invalidate these to refetch.
const formsKey = ['forms'] as const;
const formKey = (id: string) => ['forms', id] as const;

/** Fetch the list of forms for the dashboard. */
export function useForms() {
  return useQuery({ queryKey: formsKey, queryFn: formsApi.list });
}

/** Fetch one form with its ordered questions (the editor's source of truth). */
export function useForm(id: string) {
  return useQuery({ queryKey: formKey(id), queryFn: () => formsApi.get(id), enabled: !!id });
}

/** Create a form, then refresh the list. */
export function useCreateForm() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateFormInput) => formsApi.create(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: formsKey }),
  });
}

/** Rename/update a form, refreshing both the list and that form's detail. */
export function useUpdateForm() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateFormInput }) =>
      formsApi.update(id, input),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: formsKey });
      qc.invalidateQueries({ queryKey: formKey(id) });
    },
  });
}

/** Delete a form (cascades server-side), then refresh the list. */
export function useDeleteForm() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => formsApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: formsKey }),
  });
}

/** Toggle publish state; refreshes the list (badge) and the form (share link). */
export function usePublishForm() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, published }: { id: string; published: boolean }) =>
      formsApi.publish(id, published),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: formsKey });
      qc.invalidateQueries({ queryKey: formKey(id) });
    },
  });
}

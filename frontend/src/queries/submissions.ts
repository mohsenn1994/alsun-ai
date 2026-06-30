import { useQuery } from '@tanstack/react-query';
import { formsApi, submissionsApi } from '../lib/api';

/** List a form's submissions (dashboard). */
export function useSubmissions(formId: string) {
  return useQuery({
    queryKey: ['submissions', formId],
    queryFn: () => formsApi.submissions(formId),
    enabled: !!formId,
  });
}

/** Fetch a single submission's detail (answers resolved against questions). */
export function useSubmission(id: string) {
  return useQuery({
    queryKey: ['submission', id],
    queryFn: () => submissionsApi.get(id),
    enabled: !!id,
  });
}

import type {
  AuthState,
  Form,
  CreateFormInput,
  UpdateFormInput,
  Question,
  CreateQuestionInput,
  UpdateQuestionInput,
  AnswerInput,
  SubmissionSummary,
} from '@alsun/schemas';

// API origin. Empty in dev (calls are same-origin and proxied by Vite); set to
// the Railway URL in production via VITE_API_URL.
const BASE = import.meta.env.VITE_API_URL ?? '';

/** A single field-level validation error, keyed by question id or field path. */
export interface FieldError {
  path: string;
  message: string;
}

/**
 * Error thrown for any non-2xx response. Carries the HTTP status and the optional
 * `details` array (field errors) so callers can map server validation back onto
 * specific form fields.
 */
export class ApiError extends Error {
  status: number;
  details?: FieldError[];
  constructor(status: number, message: string, details?: FieldError[]) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

/**
 * Core fetch wrapper for JSON endpoints. Always sends the session cookie
 * (`credentials: 'include'`), sets JSON headers, returns `undefined` for 204s,
 * and throws a structured ApiError (with any `details`) on failure.
 */
async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    credentials: 'include', // send/receive the session cookie cross-origin
    headers: {
      // Only set when there's a body — an empty body with this header set
      // makes Fastify's JSON parser reject the request with a 400.
      ...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers ?? {}),
    },
  });

  if (res.status === 204) return undefined as T;

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const message = (data && (data.error as string)) || `Request failed (${res.status})`;
    throw new ApiError(res.status, message, data?.details);
  }
  return data as T;
}

/** Thin verb helpers over `request` — JSON-encode the body where present. */
export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PATCH', body: body === undefined ? undefined : JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};

/** Auth endpoints. */
export const authApi = {
  me: () => api.get<AuthState>('/api/auth/me'),
  login: (username: string, password: string) =>
    api.post<AuthState>('/api/auth/login', { username, password }),
  logout: () => api.post<AuthState>('/api/auth/logout'),
};

/** A form plus its ordered questions, as returned by GET /api/forms/:id. */
export type FormWithQuestions = Form & { questions: Question[] };

/** Form + question-list endpoints (creator side). */
export const formsApi = {
  list: () => api.get<Form[]>('/api/forms'),
  get: (id: string) => api.get<FormWithQuestions>(`/api/forms/${id}`),
  create: (input: CreateFormInput) => api.post<Form>('/api/forms', input),
  update: (id: string, input: UpdateFormInput) => api.patch<Form>(`/api/forms/${id}`, input),
  remove: (id: string) => api.delete<void>(`/api/forms/${id}`),
  publish: (id: string, published: boolean) =>
    api.post<Form>(`/api/forms/${id}/publish`, { published }),
  submissions: (id: string) => api.get<SubmissionSummary[]>(`/api/forms/${id}/submissions`),
};

/** Question endpoints (add is form-scoped; edit/delete/reorder operate by id). */
export const questionsApi = {
  add: (formId: string, input: CreateQuestionInput) =>
    api.post<Question>(`/api/forms/${formId}/questions`, input),
  update: (id: string, input: UpdateQuestionInput) =>
    api.patch<Question>(`/api/questions/${id}`, input),
  remove: (id: string) => api.delete<void>(`/api/questions/${id}`),
  reorder: (formId: string, orderedIds: string[]) =>
    api.post<Question[]>(`/api/forms/${formId}/questions/reorder`, { orderedIds }),
};

/** The shape the public form page consumes (title + questions, no internals). */
export type PublicForm = { id: string; title: string; questions: Question[] };

/** Public (unauthenticated) endpoints used by the respondent page. */
export const publicApi = {
  getForm: (token: string) => api.get<PublicForm>(`/api/public/forms/${token}`),
  submit: (token: string, answers: AnswerInput[]) =>
    api.post<{ id: string }>(`/api/public/forms/${token}/submissions`, { answers }),
  // Multipart upload — must NOT set Content-Type, so the browser adds the
  // boundary itself. Hence a raw fetch rather than the JSON `request` helper.
  uploadFile: async (file: File): Promise<{ fileId: string; originalName: string }> => {
    const body = new FormData();
    body.append('file', file);
    const res = await fetch(`${BASE}/api/public/uploads`, {
      method: 'POST',
      credentials: 'include',
      body,
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      throw new ApiError(res.status, (data && data.error) || `Upload failed (${res.status})`, data?.details);
    }
    return data as { fileId: string; originalName: string };
  },
};

/** One question+answer pair in a submission detail (file carries download metadata). */
export type SubmissionItem = {
  questionId: string;
  label: string;
  type: Question['type'];
  value: unknown;
  file: { id: string; filename: string; size: number } | null;
};

/** Full submission detail returned to the dashboard. */
export type SubmissionDetail = {
  id: string;
  formId: string;
  formTitle: string;
  createdAt: string;
  items: SubmissionItem[];
};

export const submissionsApi = {
  get: (id: string) => api.get<SubmissionDetail>(`/api/submissions/${id}`),
};

/**
 * Direct link to the authenticated download. In dev this is same-origin (proxied);
 * in prod it points at the API host, where the session cookie is first-party.
 */
export function fileDownloadUrl(fileId: string): string {
  return `${BASE}/api/files/${fileId}`;
}

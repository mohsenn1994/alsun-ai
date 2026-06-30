import { z } from 'zod';

/** Login form body. Both fields required; the same schema validates on client and server. */
export const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});
export type LoginInput = z.infer<typeof loginSchema>;

/**
 * Response of /api/auth/me (and login/logout): whether a session is active and,
 * if so, the username. Drives the frontend's AuthContext.
 */
export const authStateSchema = z.object({
  authenticated: z.boolean(),
  username: z.string().optional(),
});
export type AuthState = z.infer<typeof authStateSchema>;

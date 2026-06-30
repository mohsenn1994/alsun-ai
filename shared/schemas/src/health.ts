import { z } from 'zod';

/**
 * Shape of the /health* responses. `status` is always present; `db` appears on
 * the readiness check and `uptime` on the liveness check. Shared so the frontend
 * can type the readiness banner it shows.
 */
export const healthResponseSchema = z.object({
  status: z.enum(['ok', 'degraded']),
  db: z.enum(['up', 'down']).optional(),
  uptime: z.number().optional(),
});
export type HealthResponse = z.infer<typeof healthResponseSchema>;

import type { FastifyReply, FastifyRequest } from 'fastify';
import { getSessionUser } from '../lib/session';

/**
 * Fastify preHandler that gates a route scope to the authenticated creator.
 * Registered via `app.addHook('preHandler', requireAuth)` in protected route files.
 */
export async function requireAuth(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  if (!getSessionUser(request)) {
    return reply.code(401).send({ error: 'Unauthorized' });
  }
}

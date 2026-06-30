import type { FastifyInstance } from 'fastify';
import type { Controllers } from '../composition';
import { healthRoutes } from './health/health.routes';
import { authRoutes } from './auth/auth.routes';
import { formRoutes } from './forms/forms.routes';
import { questionRoutes } from './questions/questions.routes';
import { publicRoutes } from './public/public.routes';
import { submissionRoutes } from './submissions/submissions.routes';
import { fileRoutes } from './files/files.routes';

/**
 * Register every route group under its prefix, wiring each to its (already
 * constructed) controller. Public routes carry no auth.
 */
export async function registerRoutes(app: FastifyInstance, c: Controllers): Promise<void> {
  await app.register(healthRoutes(c.health));
  await app.register(authRoutes(c.auth), { prefix: '/api/auth' });
  await app.register(formRoutes(c.forms), { prefix: '/api/forms' });
  await app.register(questionRoutes(c.questions), { prefix: '/api/questions' });
  await app.register(publicRoutes(c.public), { prefix: '/api/public' });
  await app.register(submissionRoutes(c.submissions), { prefix: '/api/submissions' });
  await app.register(fileRoutes(c.files), { prefix: '/api/files' });
}

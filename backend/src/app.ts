import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import multipart from '@fastify/multipart';
import { config } from './config';
import { registerErrorHandler } from './errors';
import { registerRoutes } from './routes';
import { createControllers, type Controllers } from './composition';

/**
 * Build the Fastify app: plugins first (CORS w/ credentials, signed cookies,
 * multipart with the 10 MB cap), then the central error handler, then routes.
 * Controllers are built by the composition root and can be overridden in tests.
 * Returned without listening so it can also be used by tests (app.inject()).
 */
export async function buildApp(
  controllers: Controllers = createControllers(),
): Promise<FastifyInstance> {
  const app = Fastify({ logger: true });

  await app.register(cors, { origin: config.webOrigin, credentials: true });
  await app.register(cookie, { secret: config.cookieSecret });
  await app.register(multipart, { limits: { fileSize: 10 * 1024 * 1024, files: 1 } });

  registerErrorHandler(app);
  await registerRoutes(app, controllers);

  return app;
}

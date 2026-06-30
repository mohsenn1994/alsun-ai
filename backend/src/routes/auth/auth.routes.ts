import type { FastifyInstance } from 'fastify';
import type { AuthController } from '../../controllers/auth/auth.controller';

export function authRoutes(controller: AuthController) {
  return async (app: FastifyInstance): Promise<void> => {
    app.post('/login', controller.login);
    app.post('/logout', controller.logout);
    app.get('/me', controller.me);
  };
}

import type { FastifyInstance } from 'fastify';
import type { PublicController } from '../../controllers/public/public.controller';

// No auth — these routes are for respondents, who are not logged in.
export function publicRoutes(controller: PublicController) {
  return async (app: FastifyInstance): Promise<void> => {
    app.get('/forms/:token', controller.getForm);
    app.post('/uploads', controller.upload);
    app.post('/forms/:token/submissions', controller.submit);
  };
}

import type { FastifyInstance } from 'fastify';
import type { SubmissionsController } from '../../controllers/submissions/submissions.controller';
import { requireAuth } from '../../middleware/requireAuth';

export function submissionRoutes(controller: SubmissionsController) {
  return async (app: FastifyInstance): Promise<void> => {
    app.addHook('preHandler', requireAuth);
    app.get('/:id', controller.getDetail);
  };
}

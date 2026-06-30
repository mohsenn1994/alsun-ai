import type { FastifyInstance } from 'fastify';
import type { QuestionsController } from '../../controllers/questions/questions.controller';
import { requireAuth } from '../../middleware/requireAuth';

export function questionRoutes(controller: QuestionsController) {
  return async (app: FastifyInstance): Promise<void> => {
    app.addHook('preHandler', requireAuth);
    app.patch('/:id', controller.update);
    app.delete('/:id', controller.remove);
  };
}

import type { FastifyInstance } from 'fastify';
import type { FormsController } from '../../controllers/forms/forms.controller';
import { requireAuth } from '../../middleware/requireAuth';

// All form routes require the creator session.
export function formRoutes(controller: FormsController) {
  return async (app: FastifyInstance): Promise<void> => {
    app.addHook('preHandler', requireAuth);
    app.post('/', controller.create);
    app.get('/', controller.list);
    app.get('/:id', controller.get);
    app.get('/:id/submissions', controller.listSubmissions);
    app.patch('/:id', controller.update);
    app.delete('/:id', controller.remove);
    app.post('/:id/publish', controller.publish);
    app.post('/:id/questions', controller.addQuestion);
    app.post('/:id/questions/reorder', controller.reorderQuestions);
  };
}

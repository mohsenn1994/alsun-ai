import type { FastifyInstance } from 'fastify';
import type { FilesController } from '../../controllers/files/files.controller';
import { requireAuth } from '../../middleware/requireAuth';

export function fileRoutes(controller: FilesController) {
  return async (app: FastifyInstance): Promise<void> => {
    app.addHook('preHandler', requireAuth);
    app.get('/:id', controller.download);
  };
}

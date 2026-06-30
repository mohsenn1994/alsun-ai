import type { FastifyInstance } from 'fastify';
import type { HealthController } from '../../controllers/health/health.controller';

// Liveness has no deps (point the platform healthcheck here); ready/storage verify.
export function healthRoutes(controller: HealthController) {
  return async (app: FastifyInstance): Promise<void> => {
    app.get('/health', controller.liveness);
    app.get('/health/ready', controller.readiness);
    app.get('/health/storage', controller.storage);
  };
}

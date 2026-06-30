import type { FastifyRequest, FastifyReply } from 'fastify';
import type { HealthService } from '../../services/health/health.service';

export class HealthController {
  constructor(private readonly health: HealthService) {}

  liveness = async () => this.health.liveness();

  readiness = async (request: FastifyRequest, reply: FastifyReply) => {
    const result = await this.health.readiness();
    if (!result.ok) {
      request.log.error('readiness check failed');
      return reply.code(503).send(result.body);
    }
    return result.body;
  };

  storage = async (request: FastifyRequest, reply: FastifyReply) => {
    const result = await this.health.storage();
    if (!result.ok) {
      request.log.error(result, 'storage probe failed');
      return reply.code(503).send(result);
    }
    return result;
  };
}

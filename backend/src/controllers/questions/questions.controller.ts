import type { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { updateQuestionSchema } from '@alsun/schemas';
import type { QuestionsService } from '../../services/questions/questions.service';

const idParam = z.object({ id: z.uuid() });

export class QuestionsController {
  constructor(private readonly questions: QuestionsService) {}

  update = async (request: FastifyRequest) => {
    const { id } = idParam.parse(request.params);
    const input = updateQuestionSchema.parse(request.body);
    return this.questions.update(id, input);
  };

  remove = async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = idParam.parse(request.params);
    await this.questions.remove(id);
    return reply.code(204).send();
  };
}

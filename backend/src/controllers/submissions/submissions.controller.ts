import type { FastifyRequest } from 'fastify';
import { z } from 'zod';
import type { SubmissionsService } from '../../services/submissions/submissions.service';

const idParam = z.object({ id: z.uuid() });

export class SubmissionsController {
  constructor(private readonly submissions: SubmissionsService) {}

  getDetail = async (request: FastifyRequest) => {
    const { id } = idParam.parse(request.params);
    return this.submissions.getDetail(id);
  };
}

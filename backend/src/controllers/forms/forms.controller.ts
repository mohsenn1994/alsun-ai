import type { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import {
  createFormSchema,
  updateFormSchema,
  publishFormSchema,
  createQuestionSchema,
  reorderQuestionsSchema,
} from '@alsun/schemas';
import type { FormsService } from '../../services/forms/forms.service';
import type { SubmissionsService } from '../../services/submissions/submissions.service';

const idParam = z.object({ id: z.uuid() });

export class FormsController {
  constructor(
    private readonly forms: FormsService,
    private readonly submissions: SubmissionsService,
  ) {}

  create = async (request: FastifyRequest, reply: FastifyReply) => {
    const input = createFormSchema.parse(request.body);
    return reply.code(201).send(await this.forms.create(input));
  };

  list = async () => this.forms.list();

  get = async (request: FastifyRequest) => {
    const { id } = idParam.parse(request.params);
    return this.forms.get(id);
  };

  listSubmissions = async (request: FastifyRequest) => {
    const { id } = idParam.parse(request.params);
    return this.submissions.listForForm(id);
  };

  update = async (request: FastifyRequest) => {
    const { id } = idParam.parse(request.params);
    const input = updateFormSchema.parse(request.body);
    return this.forms.update(id, input);
  };

  remove = async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = idParam.parse(request.params);
    await this.forms.remove(id);
    return reply.code(204).send();
  };

  publish = async (request: FastifyRequest) => {
    const { id } = idParam.parse(request.params);
    const { published } = publishFormSchema.parse(request.body);
    return this.forms.publish(id, published);
  };

  addQuestion = async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = idParam.parse(request.params);
    const input = createQuestionSchema.parse(request.body);
    return reply.code(201).send(await this.forms.addQuestion(id, input));
  };

  reorderQuestions = async (request: FastifyRequest) => {
    const { id } = idParam.parse(request.params);
    const { orderedIds } = reorderQuestionsSchema.parse(request.body);
    return this.forms.reorderQuestions(id, orderedIds);
  };
}

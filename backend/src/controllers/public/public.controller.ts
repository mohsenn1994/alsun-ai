import type { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { createSubmissionSchema } from '@alsun/schemas';
import type { FormsService } from '../../services/forms/forms.service';
import type { FilesService } from '../../services/files/files.service';
import type { SubmissionsService } from '../../services/submissions/submissions.service';
import { BadRequestError } from '../../errors';

const tokenParam = z.object({ token: z.string().min(1) });

export class PublicController {
  constructor(
    private readonly forms: FormsService,
    private readonly files: FilesService,
    private readonly submissions: SubmissionsService,
  ) {}

  getForm = async (request: FastifyRequest) => {
    const { token } = tokenParam.parse(request.params);
    return this.forms.getPublicForm(token);
  };

  // Read the multipart part (HTTP concern) and hand it to the service.
  upload = async (request: FastifyRequest, reply: FastifyReply) => {
    const data = await request.file();
    if (!data) throw new BadRequestError('No file was provided.');
    const result = await this.files.saveUpload({
      filename: data.filename,
      mimeType: data.mimetype,
      file: data.file,
    });
    return reply.code(201).send(result);
  };

  submit = async (request: FastifyRequest, reply: FastifyReply) => {
    const { token } = tokenParam.parse(request.params);
    const { answers } = createSubmissionSchema.parse(request.body);
    return reply.code(201).send(await this.submissions.create(token, answers));
  };
}

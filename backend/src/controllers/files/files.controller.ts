import type { FastifyRequest, FastifyReply } from 'fastify';
import { createReadStream } from 'node:fs';
import { z } from 'zod';
import type { FilesService } from '../../services/files/files.service';
import { uploadPath } from '../../lib/storage';

const idParam = z.object({ id: z.uuid() });

export class FilesController {
  constructor(private readonly files: FilesService) {}

  // Auth is enforced by the route's preHandler; single creator = owner.
  download = async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = idParam.parse(request.params);
    const file = await this.files.getForDownload(id);
    // Strip characters that could break out of the Content-Disposition header.
    const safeName = file.filename.replace(/[\r\n"]/g, '_');
    reply.header('Content-Type', file.mimeType || 'application/octet-stream');
    reply.header('Content-Disposition', `attachment; filename="${safeName}"`);
    return reply.send(createReadStream(uploadPath(file.storageKey)));
  };
}

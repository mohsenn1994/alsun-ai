import { randomUUID } from 'node:crypto';
import type { Readable } from 'node:stream';
import { saveUploadStream, deleteUpload } from '../../lib/storage';
import type { FilesRepository } from '../../repositories/files/files.repository';
import { NotFoundError, PayloadTooLargeError } from '../../errors';
import type { FileRecord } from '../../repositories/records';

// The slice of a Fastify multipart file part this service depends on.
export interface UploadPart {
  filename: string;
  mimeType: string;
  file: Readable & { truncated: boolean; bytesRead: number };
}

export class FilesService {
  constructor(private readonly files: FilesRepository) {}

  // Step one of the two-step upload: stream to the volume (cap enforced) + record.
  async saveUpload(part: UploadPart): Promise<{ fileId: string; originalName: string }> {
    const storageKey = randomUUID();
    try {
      await saveUploadStream(storageKey, part.file);
    } catch (err) {
      await deleteUpload(storageKey);
      if (part.file.truncated || (err as { code?: string }).code === 'FST_REQ_FILE_TOO_LARGE') {
        throw new PayloadTooLargeError('File exceeds the maximum size (10 MB).');
      }
      throw err;
    }
    // The stream may truncate exactly at the limit without throwing.
    if (part.file.truncated) {
      await deleteUpload(storageKey);
      throw new PayloadTooLargeError('File exceeds the maximum size (10 MB).');
    }
    const record = await this.files.create({
      storageKey,
      filename: part.filename,
      mimeType: part.mimeType,
      size: part.file.bytesRead,
    });
    return { fileId: record.id, originalName: record.filename };
  }

  // Fetch file metadata for download; the controller streams the bytes from disk.
  async getForDownload(id: string): Promise<FileRecord> {
    const file = await this.files.findById(id);
    if (!file) throw new NotFoundError('File not found');
    return file;
  }
}

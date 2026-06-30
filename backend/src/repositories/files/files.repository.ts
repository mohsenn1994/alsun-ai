import type { Db } from '../../db';
import type { FileRecord } from '../records';

/** Data access for uploaded-file rows (bytes live on the volume via lib/storage). */
export class FilesRepository {
  constructor(private readonly db: Db) {}

  // Create an unlinked file row (answerId is set later when the submission saves).
  async create(data: {
    storageKey: string;
    filename: string;
    mimeType: string;
    size: number;
  }): Promise<FileRecord> {
    const f = await this.db.FileUpload.create({
      storageKey: data.storageKey,
      filename: data.filename,
      mimeType: data.mimeType,
      size: data.size,
      answerId: null,
    });
    return f.toJSON() as FileRecord;
  }

  async findById(id: string): Promise<FileRecord | null> {
    const f = await this.db.FileUpload.findByPk(id);
    return f ? (f.toJSON() as FileRecord) : null;
  }
}

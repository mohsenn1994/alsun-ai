import { mkdir, writeFile, readFile, unlink } from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import type { Readable } from 'node:stream';
import { join } from 'node:path';

// Local dir in dev; in production set UPLOAD_DIR=/uploads to point at the mounted
// Railway volume.
export const UPLOAD_DIR = process.env.UPLOAD_DIR ?? './uploads';

export async function ensureUploadDir(): Promise<void> {
  await mkdir(UPLOAD_DIR, { recursive: true });
}

// Resolve the on-disk path for a stored file (used to save and to serve it back).
export function uploadPath(storageKey: string): string {
  return join(UPLOAD_DIR, storageKey);
}

// Stream an incoming upload straight to disk — no buffering the whole file in memory.
export async function saveUploadStream(storageKey: string, source: Readable): Promise<void> {
  await mkdir(UPLOAD_DIR, { recursive: true });
  await pipeline(source, createWriteStream(uploadPath(storageKey)));
}

// Best-effort cleanup (e.g. when an upload is rejected after partial write).
export async function deleteUpload(storageKey: string): Promise<void> {
  await unlink(uploadPath(storageKey)).catch(() => {});
}

export interface StorageProbe {
  ok: boolean;
  dir: string;
  error?: string;
}

/**
 * Write → read → delete a probe file to confirm the upload directory (a mounted
 * volume in production) is writable. Used by GET /health/storage after a deploy.
 */
export async function probeStorage(): Promise<StorageProbe> {
  const probe = join(UPLOAD_DIR, '.storage-probe');
  try {
    await mkdir(UPLOAD_DIR, { recursive: true });
    const token = String(Date.now());
    await writeFile(probe, token, 'utf8');
    const readBack = await readFile(probe, 'utf8');
    await unlink(probe);
    return { ok: readBack === token, dir: UPLOAD_DIR };
  } catch (err) {
    return { ok: false, dir: UPLOAD_DIR, error: err instanceof Error ? err.message : String(err) };
  }
}

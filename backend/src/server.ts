import 'dotenv/config'; // load backend/.env in dev; a no-op when the platform injects env
import { buildApp } from './app';
import { config } from './config';
import { ensureUploadDir } from './lib/storage';

// Entrypoint: build the app, ensure the upload dir/volume exists, then listen.
try {
  const app = await buildApp();
  await ensureUploadDir();
  await app.listen({ port: config.port, host: config.host });
} catch (err) {
  console.error('Fatal startup error:', err);
  process.exit(1);
}

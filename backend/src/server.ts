import 'dotenv/config';
import { buildApp } from './app';
import { config } from './config';
import { ensureUploadDir } from './lib/storage';
import { sequelize } from './db/client';

try {
  const app = await buildApp();
  await ensureUploadDir();
  // Listen first so the /health liveness check passes immediately.
  await app.listen({ port: config.port, host: config.host });
  // Sync DB tables after the server is already listening. buildApp() registered
  // the models via the db import chain; sequelize.sync() just creates the tables.
  sequelize
    .sync()
    .then(() => console.log('Database synced.'))
    .catch(err => console.error('DB sync failed:', err));
} catch (err) {
  console.error('Fatal startup error:', err);
  process.exitCode = 1;
}

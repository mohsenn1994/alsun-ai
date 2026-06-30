import 'dotenv/config';
import { sequelize } from './client';
import './models'; // registers models + associations on the sequelize instance

async function main(): Promise<void> {
  await sequelize.authenticate();
  // Creates any tables that don't yet exist (idempotent). The data model is
  // complete, so no incremental changes are expected; a production project with
  // evolving schema would switch to sequelize-cli / umzug migration files.
  await sequelize.sync();
  console.log('Database synced.');
  await sequelize.close();
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});

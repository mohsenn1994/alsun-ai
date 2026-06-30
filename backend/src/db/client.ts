import { Sequelize } from 'sequelize';

/**
 * The single Sequelize connection used by the whole API. Connection details come
 * from DATABASE_URL (Railway/Neon in prod; a local Postgres in dev). SQL logging
 * is off to keep request logs readable; flip `logging` to `console.log` to debug.
 */
const connectionString =
  process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5432/alsun';

// Railway and most managed Postgres providers require SSL. rejectUnauthorized is
// false because Railway uses a self-signed cert on its internal proxy.
const isProduction = process.env.NODE_ENV === 'production';

export const sequelize = new Sequelize(connectionString, {
  dialect: 'postgres',
  logging: false,
  dialectOptions: isProduction
    ? { ssl: { require: true, rejectUnauthorized: false } }
    : {},
});

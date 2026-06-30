import type { HealthResponse } from '@alsun/schemas';
import type { Db } from '../../db';
import { probeStorage, type StorageProbe } from '../../lib/storage';

/** Health logic: liveness has no deps; readiness pings the DB; storage probes the volume. */
export class HealthService {
  constructor(private readonly db: Db) {}

  liveness(): HealthResponse {
    return { status: 'ok', uptime: process.uptime() };
  }

  async readiness(): Promise<{ ok: boolean; body: HealthResponse }> {
    try {
      await this.db.sequelize.authenticate();
      return { ok: true, body: { status: 'ok', db: 'up' } };
    } catch {
      return { ok: false, body: { status: 'degraded', db: 'down' } };
    }
  }

  storage(): Promise<StorageProbe> {
    return probeStorage();
  }
}

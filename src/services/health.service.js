/** Business rules: health reporting. Keeps the route free of data access (Constitution II). */

import { getDb } from '../db/connection.js';
import * as healthRepo from '../db/repositories/health.repo.js';

export function getHealth() {
  const db = getDb();
  return { status: 'ok', database: 'ok', empty: healthRepo.isEmpty(db) };
}

/** Test helper: a throwaway database per test file. Never touches data/gymtracker.db. */

import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { closeDb, openDatabase, setDb } from '../../src/db/connection.js';
import { migrate } from '../../src/db/migrate.js';

export function createTestDb() {
  const dir = mkdtempSync(join(tmpdir(), 'gymtracker-test-'));
  const path = join(dir, 'test.db');
  const db = setDb(openDatabase(path));
  migrate(db);
  return {
    db,
    path,
    cleanup() {
      closeDb();
      rmSync(dir, { recursive: true, force: true });
    },
  };
}

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { closeDb, openDatabase, setDb } from '../../src/db/connection.js';
import { migrate } from '../../src/db/migrate.js';
import { createTestDb } from '../helpers/test-db.js';

describe('migrations', () => {
  it('applies to an empty database and creates every table', () => {
    const t = createTestDb();
    const tables = t.db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
      .all()
      .map((r) => r.name);
    for (const expected of [
      'body_weights',
      'exercises',
      'foods',
      'goal_sets',
      'meal_entries',
      'schema_migrations',
      'workout_sessions',
      'workout_sets',
    ]) {
      assert.ok(tables.includes(expected), `missing table ${expected}`);
    }
    t.cleanup();
  });

  it('is idempotent on a second run', () => {
    const t = createTestDb();
    assert.equal(migrate(t.db), 0);
    t.cleanup();
  });

  it('enables foreign keys', () => {
    const t = createTestDb();
    assert.equal(t.db.prepare('PRAGMA foreign_keys').get().foreign_keys, 1);
    t.cleanup();
  });
});

describe('durability (FR-035, SC-004)', () => {
  it('keeps records across a close and reopen', () => {
    const dir = mkdtempSync(join(tmpdir(), 'gymtracker-durable-'));
    const path = join(dir, 'test.db');

    let db = setDb(openDatabase(path));
    migrate(db);
    db.prepare(
      "INSERT INTO exercises (name, name_key, muscle_group, created_at) VALUES ('Back Squat','back squat','legs','now')",
    ).run();
    closeDb();

    db = setDb(openDatabase(path));
    migrate(db);
    const row = db.prepare('SELECT name FROM exercises').get();
    assert.equal(row.name, 'Back Squat');

    closeDb();
    rmSync(dir, { recursive: true, force: true });
  });
});

describe('startup failure (FR-035a)', () => {
  it('throws loudly when the database path is not a database', () => {
    const dir = mkdtempSync(join(tmpdir(), 'gymtracker-bad-'));
    const path = join(dir, 'corrupt.db');
    writeFileSync(path, 'this is not a SQLite file, not even close');

    assert.throws(() => {
      const db = openDatabase(path);
      migrate(db);
    });

    rmSync(dir, { recursive: true, force: true });
  });
});

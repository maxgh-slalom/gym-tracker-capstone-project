/** Data layer: owns the SQLite handle. No business rules here. */

import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

let instance = null;

/** FR-035a: any failure here aborts rather than returning a degraded handle. */
export function openDatabase(dbPath) {
  const absolute = resolve(dbPath);
  try {
    mkdirSync(dirname(absolute), { recursive: true });
    const db = new DatabaseSync(absolute);
    db.exec('PRAGMA foreign_keys = ON');
    db.exec('PRAGMA journal_mode = WAL');
    db.exec('PRAGMA busy_timeout = 5000');
    return db;
  } catch (cause) {
    throw new Error(`Cannot open the GymTracker database at ${absolute}: ${cause.message}`, { cause });
  }
}

export function getDb() {
  if (!instance) throw new Error('Database not initialised. Call setDb() during startup.');
  return instance;
}

export function setDb(db) {
  instance = db;
  return db;
}

export function closeDb() {
  if (instance) {
    instance.close();
    instance = null;
  }
}

/** FR-041e: callers that must be all-or-nothing wrap their work in this. */
export function transaction(fn) {
  const db = getDb();
  db.exec('BEGIN');
  try {
    const result = fn(db);
    db.exec('COMMIT');
    return result;
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

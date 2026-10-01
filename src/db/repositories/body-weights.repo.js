/** Data layer: body weight. One row per date, enforced by the primary key. */

import { getDb } from '../connection.js';

const toEntry = (row) => (row ? { date: row.entry_date, weightKg: row.weight_kg } : null);

export function list({ from = null, to = null } = {}) {
  const clauses = [];
  const params = [];
  if (from) {
    clauses.push('entry_date >= ?');
    params.push(from);
  }
  if (to) {
    clauses.push('entry_date <= ?');
    params.push(to);
  }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  return getDb()
    .prepare(`SELECT * FROM body_weights ${where} ORDER BY entry_date DESC`)
    .all(...params)
    .map(toEntry);
}

export function findByDate(date) {
  return toEntry(getDb().prepare('SELECT * FROM body_weights WHERE entry_date = ?').get(date));
}

/** Returns whether an existing value was replaced, so the UI can say so (FR-013a). */
export function upsert(date, weightKg) {
  const existed = Boolean(findByDate(date));
  getDb()
    .prepare(
      `INSERT INTO body_weights (entry_date, weight_kg, created_at, updated_at)
       VALUES (?, ?, strftime('%Y-%m-%dT%H:%M:%fZ','now'), strftime('%Y-%m-%dT%H:%M:%fZ','now'))
       ON CONFLICT(entry_date) DO UPDATE
         SET weight_kg = excluded.weight_kg, updated_at = excluded.updated_at`,
    )
    .run(date, weightKg);
  return { entry: findByDate(date), replaced: existed };
}

export function remove(date) {
  const info = getDb().prepare('DELETE FROM body_weights WHERE entry_date = ?').run(date);
  return info.changes > 0;
}

export function rangePoints(from, to) {
  return getDb()
    .prepare('SELECT * FROM body_weights WHERE entry_date BETWEEN ? AND ? ORDER BY entry_date')
    .all(from, to)
    .map(toEntry);
}

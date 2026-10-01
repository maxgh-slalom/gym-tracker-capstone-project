/**
 * Data layer: workouts. Sole owner of the volume formula (FR-031a, FR-031b);
 * the progress layer consumes these aggregates rather than rewriting them.
 */

import { getDb, transaction } from '../connection.js';

const VOLUME_EXPR = 'SUM(s.reps * s.weight_kg)';

export function list({ from = null, to = null, limit = 50 } = {}) {
  const clauses = [];
  const params = [];
  if (from) {
    clauses.push('w.session_date >= ?');
    params.push(from);
  }
  if (to) {
    clauses.push('w.session_date <= ?');
    params.push(to);
  }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const rows = getDb()
    .prepare(
      `SELECT w.id, w.session_date, w.note,
              COUNT(s.id) AS set_count,
              COALESCE(${VOLUME_EXPR}, 0) AS total_volume
       FROM workout_sessions w
       LEFT JOIN workout_sets s ON s.session_id = w.id
       ${where}
       GROUP BY w.id
       ORDER BY w.session_date DESC, w.id DESC
       LIMIT ?`,
    )
    .all(...params, limit);

  return rows.map((row) => ({
    id: row.id,
    date: row.session_date,
    note: row.note,
    setCount: row.set_count,
    totalVolume: row.total_volume,
    exercises: exerciseNamesFor(row.id),
  }));
}

function exerciseNamesFor(sessionId) {
  return getDb()
    .prepare(
      `SELECT e.name, MIN(s.position) AS first_position FROM workout_sets s
       JOIN exercises e ON e.id = s.exercise_id
       WHERE s.session_id = ? GROUP BY e.id ORDER BY first_position`,
    )
    .all(sessionId)
    .map((r) => r.name);
}

export function findById(id) {
  const session = getDb().prepare('SELECT * FROM workout_sessions WHERE id = ?').get(id);
  if (!session) return null;

  const sets = getDb()
    .prepare(
      `SELECT s.*, e.name AS exercise_name, e.archived_at
       FROM workout_sets s JOIN exercises e ON e.id = s.exercise_id
       WHERE s.session_id = ? ORDER BY s.position, s.id`,
    )
    .all(id);

  const entries = [];
  for (const set of sets) {
    let entry = entries.find((e) => e.exerciseId === set.exercise_id);
    if (!entry) {
      entry = {
        exerciseId: set.exercise_id,
        exerciseName: set.exercise_name,
        exerciseArchived: set.archived_at !== null,
        sets: [],
      };
      entries.push(entry);
    }
    entry.sets.push({ reps: set.reps, weightKg: set.weight_kg });
  }

  return {
    id: session.id,
    date: session.session_date,
    note: session.note,
    totalVolume: sessionVolume(id),
    entries,
  };
}

/** The one place the volume formula is expressed (FR-031a, FR-031b). */
function sessionVolume(sessionId) {
  const row = getDb()
    .prepare(`SELECT COALESCE(${VOLUME_EXPR}, 0) AS volume FROM workout_sets s WHERE s.session_id = ?`)
    .get(sessionId);
  return row.volume;
}

function insertSets(db, sessionId, entries) {
  const stmt = db.prepare(
    'INSERT INTO workout_sets (session_id, exercise_id, position, reps, weight_kg) VALUES (?, ?, ?, ?, ?)',
  );
  let position = 0;
  for (const entry of entries) {
    for (const set of entry.sets) {
      stmt.run(sessionId, entry.exerciseId, position, set.reps, set.weightKg);
      position += 1;
    }
  }
}

export function create({ date, note, entries }) {
  return transaction((db) => {
    const info = db
      .prepare(
        `INSERT INTO workout_sessions (session_date, note, created_at)
         VALUES (?, ?, strftime('%Y-%m-%dT%H:%M:%fZ','now'))`,
      )
      .run(date, note);
    const id = Number(info.lastInsertRowid);
    insertSets(db, id, entries);
    return id;
  });
}

export function replace(id, { date, note, entries }) {
  transaction((db) => {
    db.prepare('UPDATE workout_sessions SET session_date = ?, note = ? WHERE id = ?').run(date, note, id);
    db.prepare('DELETE FROM workout_sets WHERE session_id = ?').run(id);
    insertSets(db, id, entries);
  });
  return findById(id);
}

export function remove(id) {
  getDb().prepare('DELETE FROM workout_sessions WHERE id = ?').run(id);
}

export function exists(id) {
  return Boolean(getDb().prepare('SELECT 1 FROM workout_sessions WHERE id = ?').get(id));
}

// --- Aggregates consumed by the progress layer (FR-031a) ---

export function volumeBySession(from, to) {
  return getDb()
    .prepare(
      `SELECT w.session_date AS date, COALESCE(${VOLUME_EXPR}, 0) AS volume
       FROM workout_sessions w
       LEFT JOIN workout_sets s ON s.session_id = w.id
       WHERE w.session_date BETWEEN ? AND ?
       GROUP BY w.id ORDER BY w.session_date`,
    )
    .all(from, to)
    .map((r) => ({ date: r.date, volume: r.volume }));
}

/** FR-031c: ISO weeks start Monday. SQLite's %w is 0=Sunday, hence the shift. */
export function volumeByWeek(from, to) {
  return getDb()
    .prepare(
      `SELECT date(w.session_date, '-' || ((strftime('%w', w.session_date) + 6) % 7) || ' days') AS week_start,
              COALESCE(${VOLUME_EXPR}, 0) AS volume
       FROM workout_sessions w
       LEFT JOIN workout_sets s ON s.session_id = w.id
       WHERE w.session_date BETWEEN ? AND ?
       GROUP BY week_start ORDER BY week_start`,
    )
    .all(from, to)
    .map((r) => ({ weekStart: r.week_start, volume: r.volume }));
}

/** FR-032a: the max across every set on that date, so multiple sessions collapse correctly. */
export function bestWeightByDate(exerciseId, from, to) {
  return getDb()
    .prepare(
      `SELECT w.session_date AS date, MAX(s.weight_kg) AS best
       FROM workout_sets s JOIN workout_sessions w ON w.id = s.session_id
       WHERE s.exercise_id = ? AND w.session_date BETWEEN ? AND ?
       GROUP BY w.session_date ORDER BY w.session_date`,
    )
    .all(exerciseId, from, to)
    .map((r) => ({ date: r.date, bestWeightKg: r.best }));
}

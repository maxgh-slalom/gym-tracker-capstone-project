/** Data layer: exercises. Parameterized SQL only. */

import { getDb } from '../connection.js';

const nameKey = (name) => name.trim().toLowerCase();

function toExercise(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    muscleGroup: row.muscle_group,
    archived: row.archived_at !== null,
    archivedAt: row.archived_at,
    setCount: row.set_count ?? 0,
  };
}

export function list({ includeArchived = false, muscleGroup = null } = {}) {
  const clauses = [];
  const params = [];
  if (!includeArchived) clauses.push('e.archived_at IS NULL');
  if (muscleGroup) {
    clauses.push('e.muscle_group = ?');
    params.push(muscleGroup);
  }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const rows = getDb()
    .prepare(
      `SELECT e.*, (SELECT COUNT(*) FROM workout_sets s WHERE s.exercise_id = e.id) AS set_count
       FROM exercises e ${where} ORDER BY e.name COLLATE NOCASE`,
    )
    .all(...params);
  return rows.map(toExercise);
}

export function findById(id) {
  const row = getDb()
    .prepare(
      `SELECT e.*, (SELECT COUNT(*) FROM workout_sets s WHERE s.exercise_id = e.id) AS set_count
       FROM exercises e WHERE e.id = ?`,
    )
    .get(id);
  return toExercise(row);
}

export function findByNameKey(name, { excludeId = null } = {}) {
  const row = excludeId
    ? getDb().prepare('SELECT * FROM exercises WHERE name_key = ? AND id != ?').get(nameKey(name), excludeId)
    : getDb().prepare('SELECT * FROM exercises WHERE name_key = ?').get(nameKey(name));
  return toExercise(row);
}

export function create({ name, muscleGroup }) {
  const info = getDb()
    .prepare(
      `INSERT INTO exercises (name, name_key, muscle_group, created_at)
       VALUES (?, ?, ?, strftime('%Y-%m-%dT%H:%M:%fZ','now'))`,
    )
    .run(name, nameKey(name), muscleGroup);
  return findById(Number(info.lastInsertRowid));
}

export function update(id, { name, muscleGroup }) {
  const current = findById(id);
  const nextName = name ?? current.name;
  const nextGroup = muscleGroup ?? current.muscleGroup;
  getDb()
    .prepare('UPDATE exercises SET name = ?, name_key = ?, muscle_group = ? WHERE id = ?')
    .run(nextName, nameKey(nextName), nextGroup, id);
  return findById(id);
}

export function setArchived(id, archived) {
  getDb()
    .prepare(
      `UPDATE exercises SET archived_at = ${archived ? "strftime('%Y-%m-%dT%H:%M:%fZ','now')" : 'NULL'} WHERE id = ?`,
    )
    .run(id);
  return findById(id);
}

export function remove(id) {
  getDb().prepare('DELETE FROM exercises WHERE id = ?').run(id);
}

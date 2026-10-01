/** Data layer: food catalog. */

import { getDb } from '../connection.js';

const nameKey = (name) => name.trim().toLowerCase();

function toFood(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    portionName: row.portion_name,
    portionGrams: row.portion_grams,
    calories: row.calories,
    proteinG: row.protein_g,
    carbsG: row.carbs_g,
    fatG: row.fat_g,
    isBuiltin: row.is_builtin === 1,
    archived: row.archived_at !== null,
    entryCount: row.entry_count ?? 0,
  };
}

const WITH_COUNT = `SELECT f.*, (SELECT COUNT(*) FROM meal_entries m WHERE m.food_id = f.id) AS entry_count FROM foods f`;

/** FR-017a: trimmed, case-insensitive substring on the name, ordered alphabetically. */
export function search({ term = null, includeArchived = false, limit = 25 } = {}) {
  const clauses = [];
  const params = [];
  if (!includeArchived) clauses.push('f.archived_at IS NULL');
  if (term) {
    clauses.push('f.name_key LIKE ?');
    params.push(`%${nameKey(term)}%`);
  }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const rows = getDb()
    .prepare(`${WITH_COUNT} ${where} ORDER BY f.name COLLATE NOCASE LIMIT ?`)
    .all(...params, limit);
  const { total } = getDb()
    .prepare(`SELECT COUNT(*) AS total FROM foods f ${where}`)
    .get(...params);
  return { foods: rows.map(toFood), total };
}

export function findById(id) {
  return toFood(getDb().prepare(`${WITH_COUNT} WHERE f.id = ?`).get(id));
}

export function findByNameKey(name, { excludeId = null } = {}) {
  const sql = excludeId
    ? `${WITH_COUNT} WHERE f.name_key = ? AND f.id != ?`
    : `${WITH_COUNT} WHERE f.name_key = ?`;
  const params = excludeId ? [nameKey(name), excludeId] : [nameKey(name)];
  return toFood(getDb().prepare(sql).get(...params));
}

export function create(food, { isBuiltin = false } = {}) {
  const info = getDb()
    .prepare(
      `INSERT INTO foods (name, name_key, portion_name, portion_grams, calories, protein_g, carbs_g, fat_g, is_builtin, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, strftime('%Y-%m-%dT%H:%M:%fZ','now'))`,
    )
    .run(
      food.name,
      nameKey(food.name),
      food.portionName,
      food.portionGrams,
      food.calories,
      food.proteinG,
      food.carbsG,
      food.fatG,
      isBuiltin ? 1 : 0,
    );
  return findById(Number(info.lastInsertRowid));
}

export function update(id, patch) {
  const current = findById(id);
  const next = { ...current, ...patch };
  getDb()
    .prepare(
      `UPDATE foods SET name = ?, name_key = ?, portion_name = ?, portion_grams = ?,
         calories = ?, protein_g = ?, carbs_g = ?, fat_g = ? WHERE id = ?`,
    )
    .run(
      next.name,
      nameKey(next.name),
      next.portionName,
      next.portionGrams,
      next.calories,
      next.proteinG,
      next.carbsG,
      next.fatG,
      id,
    );
  return findById(id);
}

export function setArchived(id, archived) {
  getDb()
    .prepare(
      `UPDATE foods SET archived_at = ${archived ? "strftime('%Y-%m-%dT%H:%M:%fZ','now')" : 'NULL'} WHERE id = ?`,
    )
    .run(id);
  return findById(id);
}

export function remove(id) {
  getDb().prepare('DELETE FROM foods WHERE id = ?').run(id);
}

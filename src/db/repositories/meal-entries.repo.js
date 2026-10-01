/** Data layer: meal entries. Stores only the resolved gram quantity (FR-020). */

import { getDb } from '../connection.js';

function toEntry(row) {
  if (!row) return null;
  return {
    id: row.id,
    date: row.entry_date,
    mealSlot: row.meal_slot,
    foodId: row.food_id,
    quantityG: row.quantity_g,
    food: {
      name: row.food_name,
      portionName: row.portion_name,
      portionGrams: row.portion_grams,
      calories: row.calories,
      proteinG: row.protein_g,
      carbsG: row.carbs_g,
      fatG: row.fat_g,
      archived: row.archived_at !== null,
    },
  };
}

const JOINED = `
  SELECT m.*, f.name AS food_name, f.portion_name, f.portion_grams,
         f.calories, f.protein_g, f.carbs_g, f.fat_g, f.archived_at
  FROM meal_entries m JOIN foods f ON f.id = m.food_id`;

export function findById(id) {
  return toEntry(getDb().prepare(`${JOINED} WHERE m.id = ?`).get(id));
}

export function listByDate(date) {
  return getDb().prepare(`${JOINED} WHERE m.entry_date = ? ORDER BY m.id`).all(date).map(toEntry);
}

export function listByRange(from, to) {
  return getDb()
    .prepare(`${JOINED} WHERE m.entry_date BETWEEN ? AND ? ORDER BY m.entry_date, m.id`)
    .all(from, to)
    .map(toEntry);
}

export function create({ date, mealSlot, foodId, quantityG }) {
  const info = getDb()
    .prepare(
      `INSERT INTO meal_entries (entry_date, meal_slot, food_id, quantity_g, created_at)
       VALUES (?, ?, ?, ?, strftime('%Y-%m-%dT%H:%M:%fZ','now'))`,
    )
    .run(date, mealSlot, foodId, quantityG);
  return findById(Number(info.lastInsertRowid));
}

export function update(id, patch) {
  const current = findById(id);
  const next = { ...current, ...patch };
  getDb()
    .prepare('UPDATE meal_entries SET entry_date = ?, meal_slot = ?, quantity_g = ? WHERE id = ?')
    .run(next.date, next.mealSlot, next.quantityG, id);
  return findById(id);
}

export function remove(id) {
  const info = getDb().prepare('DELETE FROM meal_entries WHERE id = ?').run(id);
  return info.changes > 0;
}

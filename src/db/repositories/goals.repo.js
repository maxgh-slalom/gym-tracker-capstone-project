/** Data layer: effective-dated goal sets. */

import { getDb } from '../connection.js';

const toGoalSet = (row) =>
  row
    ? {
        effectiveDate: row.effective_date,
        calories: row.calories,
        proteinG: row.protein_g,
        carbsG: row.carbs_g,
        fatG: row.fat_g,
      }
    : null;

export function listAll() {
  return getDb()
    .prepare('SELECT * FROM goal_sets ORDER BY effective_date DESC')
    .all()
    .map(toGoalSet);
}

/** FR-025a: the governing set is the latest one effective on or before the date. */
export function findEffective(date) {
  return toGoalSet(
    getDb()
      .prepare('SELECT * FROM goal_sets WHERE effective_date <= ? ORDER BY effective_date DESC LIMIT 1')
      .get(date),
  );
}

export function upsert(effectiveDate, values) {
  getDb()
    .prepare(
      `INSERT INTO goal_sets (effective_date, calories, protein_g, carbs_g, fat_g, created_at)
       VALUES (?, ?, ?, ?, ?, strftime('%Y-%m-%dT%H:%M:%fZ','now'))
       ON CONFLICT(effective_date) DO UPDATE SET
         calories = excluded.calories, protein_g = excluded.protein_g,
         carbs_g = excluded.carbs_g, fat_g = excluded.fat_g`,
    )
    .run(effectiveDate, values.calories, values.proteinG, values.carbsG, values.fatG);
  return findByDate(effectiveDate);
}

export function findByDate(effectiveDate) {
  return toGoalSet(getDb().prepare('SELECT * FROM goal_sets WHERE effective_date = ?').get(effectiveDate));
}

export function remove(effectiveDate) {
  const info = getDb().prepare('DELETE FROM goal_sets WHERE effective_date = ?').run(effectiveDate);
  return info.changes > 0;
}

/** Data layer: supports the health check only. */

const TABLES = [
  'exercises',
  'workout_sessions',
  'workout_sets',
  'body_weights',
  'foods',
  'meal_entries',
  'goal_sets',
];

export function isEmpty(db) {
  for (const table of TABLES) {
    const { count } = db.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get();
    if (count > 0) return false;
  }
  return true;
}

export function deleteAll(db) {
  // Children first so ON DELETE RESTRICT never fires.
  const order = [
    'workout_sets',
    'workout_sessions',
    'meal_entries',
    'body_weights',
    'goal_sets',
    'exercises',
    'foods',
  ];
  for (const table of order) db.exec(`DELETE FROM ${table}`);
  db.exec("DELETE FROM sqlite_sequence WHERE name IN ('exercises','workout_sessions','workout_sets','foods','meal_entries')");
}

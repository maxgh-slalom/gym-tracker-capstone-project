/** Data layer: bulk inserts for the demo seed. Keeps seed SQL out of the service layer. */

export function insertExercises(db, exercises, timestamp) {
  const stmt = db.prepare(
    `INSERT INTO exercises (name, name_key, muscle_group, archived_at, created_at)
     VALUES (?, ?, ?, ?, ?)`,
  );
  const ids = new Map();
  for (const e of exercises) {
    const info = stmt.run(
      e.name,
      e.name.toLowerCase(),
      e.muscleGroup,
      e.archived ? timestamp : null,
      timestamp,
    );
    ids.set(e.name, Number(info.lastInsertRowid));
  }
  return ids;
}

export function insertFoods(db, foods, timestamp) {
  const stmt = db.prepare(
    `INSERT INTO foods (name, name_key, portion_name, portion_grams, calories, protein_g, carbs_g, fat_g, is_builtin, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
  );
  const ids = new Map();
  for (const f of foods) {
    const info = stmt.run(
      f.name,
      f.name.toLowerCase(),
      f.portionName,
      f.portionGrams,
      f.calories,
      f.proteinG,
      f.carbsG,
      f.fatG,
      timestamp,
    );
    ids.set(f.name, Number(info.lastInsertRowid));
  }
  return ids;
}

export function insertSessions(db, sessions, exerciseIds, timeOfDay) {
  const insertSession = db.prepare(
    'INSERT INTO workout_sessions (session_date, note, created_at) VALUES (?, ?, ?)',
  );
  const insertSet = db.prepare(
    'INSERT INTO workout_sets (session_id, exercise_id, position, reps, weight_kg) VALUES (?, ?, ?, ?, ?)',
  );

  let setCount = 0;
  for (const session of sessions) {
    const info = insertSession.run(session.date, session.note, `${session.date}T${timeOfDay}.000Z`);
    const sessionId = Number(info.lastInsertRowid);
    let position = 0;
    for (const entry of session.entries) {
      for (const set of entry.sets) {
        insertSet.run(sessionId, exerciseIds.get(entry.exerciseName), position, set.reps, set.weightKg);
        position += 1;
        setCount += 1;
      }
    }
  }
  return setCount;
}

export function insertBodyWeights(db, entries, timeOfDay) {
  const stmt = db.prepare(
    'INSERT INTO body_weights (entry_date, weight_kg, created_at, updated_at) VALUES (?, ?, ?, ?)',
  );
  for (const w of entries) {
    const ts = `${w.date}T${timeOfDay}.000Z`;
    stmt.run(w.date, w.weightKg, ts, ts);
  }
}

export function insertMealEntries(db, entries, foodIds, portionGramsByName, timeOfDay) {
  const stmt = db.prepare(
    'INSERT INTO meal_entries (entry_date, meal_slot, food_id, quantity_g, created_at) VALUES (?, ?, ?, ?, ?)',
  );
  for (const m of entries) {
    stmt.run(
      m.date,
      m.mealSlot,
      foodIds.get(m.foodName),
      m.servings * portionGramsByName.get(m.foodName),
      `${m.date}T${timeOfDay}.000Z`,
    );
  }
}

export function insertGoalSets(db, goalSets, timeOfDay) {
  const stmt = db.prepare(
    'INSERT INTO goal_sets (effective_date, calories, protein_g, carbs_g, fat_g, created_at) VALUES (?, ?, ?, ?, ?, ?)',
  );
  for (const g of goalSets) {
    stmt.run(
      g.effectiveDate,
      g.calories,
      g.proteinG,
      g.carbsG,
      g.fatG,
      `${g.effectiveDate}T${timeOfDay}.000Z`,
    );
  }
}

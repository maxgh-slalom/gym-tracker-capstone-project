/** Business rules: the demo reset. The only path by which seed data enters the database (FR-043). */

import { transaction } from '../db/connection.js';
import * as healthRepo from '../db/repositories/health.repo.js';
import * as seedRepo from '../db/repositories/seed.repo.js';
import { generate } from '../seed/generate.js';
import { todayIso } from '../validation/primitives.js';

/**
 * FR-041/FR-041e: erases everything, then loads the seed, all inside one transaction
 * so a failure leaves the database exactly as it was.
 *
 * Seeded rows take timestamps derived from the record's own date rather than the wall
 * clock, so two resets on the same day are byte-identical (SC-008a).
 */
export function resetDemo() {
  const today = todayIso();
  const data = generate(today);
  const createdAt = `${today}T00:00:00.000Z`;

  return transaction((db) => {
    healthRepo.deleteAll(db);

    const exerciseIds = seedRepo.insertExercises(db, data.exercises, createdAt);
    const foodIds = seedRepo.insertFoods(db, data.foods, createdAt);
    const setCount = seedRepo.insertSessions(db, data.sessions, exerciseIds, '18:00:00');

    seedRepo.insertBodyWeights(db, data.bodyWeights, '07:00:00');

    const portionGrams = new Map(data.foods.map((f) => [f.name, f.portionGrams]));
    seedRepo.insertMealEntries(db, data.mealEntries, foodIds, portionGrams, '12:00:00');
    seedRepo.insertGoalSets(db, data.goalSets, '00:00:00');

    return {
      exercises: data.exercises.length,
      sessions: data.sessions.length,
      sets: setCount,
      bodyWeights: data.bodyWeights.length,
      foods: data.foods.length,
      mealEntries: data.mealEntries.length,
      goalSets: data.goalSets.length,
    };
  });
}

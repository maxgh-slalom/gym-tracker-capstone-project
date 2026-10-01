/** Business rules: assembles the four trend series for a date range. */

import * as progressRepo from '../db/repositories/progress.repo.js';
import * as workoutsRepo from '../db/repositories/workouts.repo.js';
import * as exercisesRepo from '../db/repositories/exercises.repo.js';
import * as goalsService from './goals.service.js';
import * as nutritionService from './nutrition.service.js';
import { roundKcal, roundMass } from './nutrition-math.js';
import { ValidationError } from '../errors.js';

export function build({ from, to, exerciseId = null }) {
  const points = progressRepo.bodyWeightPoints(from, to);

  // FR-030c: undefined rather than fabricated when a trend cannot be drawn.
  const netChangeKg =
    points.length >= 2 ? roundMass(points.at(-1).weightKg - points[0].weightKg) : null;

  let exerciseBest = null;
  if (exerciseId !== null) {
    const exercise = exercisesRepo.findById(exerciseId);
    if (!exercise) throw new ValidationError(`No exercise with id ${exerciseId}`, 'exerciseId');
    exerciseBest = {
      exerciseId,
      exerciseName: exercise.name,
      points: workoutsRepo.bestWeightByDate(exerciseId, from, to),
    };
  }

  return {
    range: { from, to },
    bodyWeight: { points, netChangeKg },
    volumeBySession: { points: workoutsRepo.volumeBySession(from, to) },
    volumeByWeek: { points: workoutsRepo.volumeByWeek(from, to) },
    exerciseBest,
    caloriesVsGoal: { points: caloriesVsGoal(from, to) },
  };
}

/** FR-033: each day compares against the goal in effect on that day, not today's goal. */
function caloriesVsGoal(from, to) {
  const caloriesByDate = nutritionService.dailyCalories(from, to);
  const goalsByDate = goalsService.effectiveForRange(from, to);

  const points = [];
  for (const [date, scaled] of caloriesByDate) {
    const goalSet = goalsByDate.get(date);
    points.push({
      date,
      calories: roundKcal(scaled.reduce((sum, n) => sum + n.calories, 0)),
      goalCalories: goalSet ? goalSet.calories : null,
    });
  }
  return points.sort((a, b) => a.date.localeCompare(b.date));
}

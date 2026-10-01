/** Business rules: the nutrition day view — totals, goals in effect, and the comparison. */

import * as mealsRepo from '../db/repositories/meal-entries.repo.js';
import * as goalsService from './goals.service.js';
import { present } from './meal-entries.service.js';
import { scaleNutrition, sumThenRound } from './nutrition-math.js';
import { MEAL_SLOTS } from '../validation/schemas/meal-entries.js';
import { roundMass } from './nutrition-math.js';

/** FR-027a: exceeded is strictly consumed > goal, so hitting a goal exactly is not over. */
function compare(consumed, goal) {
  return {
    goal,
    consumed,
    remaining: roundMass(goal - consumed),
    exceeded: consumed > goal,
  };
}

export function dayView(date) {
  const entries = mealsRepo.listByDate(date);

  // FR-045: sum the unrounded scaled values, round once.
  const totals = sumThenRound(entries.map((e) => scaleNutrition(e.food, e.quantityG)));

  const goals = goalsService.effectiveFor(date);

  const meals = Object.fromEntries(MEAL_SLOTS.map((slot) => [slot, []]));
  for (const entry of entries) meals[entry.mealSlot].push(present(entry));

  return {
    date,
    goals,
    // FR-028: null rather than zero-filled, so the UI cannot show a fake 0 kcal target.
    comparison: goals
      ? {
          calories: compare(totals.calories, goals.calories),
          proteinG: compare(totals.proteinG, goals.proteinG),
          carbsG: compare(totals.carbsG, goals.carbsG),
          fatG: compare(totals.fatG, goals.fatG),
        }
      : null,
    totals,
    meals,
  };
}

/** Daily calorie totals across a range, for the progress view. */
export function dailyCalories(from, to) {
  const entries = mealsRepo.listByRange(from, to);
  const byDate = new Map();
  for (const entry of entries) {
    const list = byDate.get(entry.date) ?? [];
    list.push(scaleNutrition(entry.food, entry.quantityG));
    byDate.set(entry.date, list);
  }
  return byDate;
}

/** Business rules: meal entries. Resolves servings or grams to one stored quantity. */

import { NotFoundError, ValidationError } from '../errors.js';
import * as repo from '../db/repositories/meal-entries.repo.js';
import * as foodsRepo from '../db/repositories/foods.repo.js';
import { gramsToServings, roundNutrition, scaleNutrition, roundMass } from './nutrition-math.js';

function usableFood(foodId, field = 'foodId') {
  const food = foodsRepo.findById(foodId);
  if (!food) throw new ValidationError(`No food with id ${foodId}`, field);
  if (food.archived) {
    throw new ValidationError(`"${food.name}" is archived and cannot be logged`, field);
  }
  return food;
}

/** FR-020: whichever unit the user chose, one gram quantity is what gets stored. */
function resolveGrams(input, food) {
  return input.grams !== undefined ? input.grams : input.servings * food.portionGrams;
}

export function present(entry) {
  const scaled = scaleNutrition(entry.food, entry.quantityG);
  return {
    id: entry.id,
    date: entry.date,
    mealSlot: entry.mealSlot,
    foodId: entry.foodId,
    foodName: entry.food.name,
    foodArchived: entry.food.archived,
    quantityG: roundMass(entry.quantityG),
    servings: roundMass(gramsToServings(entry.quantityG, entry.food.portionGrams)),
    ...roundNutrition(scaled),
  };
}

export function create(input) {
  const food = usableFood(input.foodId);
  const quantityG = resolveGrams(input, food);
  return present(repo.create({ ...input, quantityG }));
}

export function update(id, patch) {
  const existing = repo.findById(id);
  if (!existing) throw new NotFoundError(`No meal entry with id ${id}`);

  const next = { ...patch };
  if (patch.servings !== undefined || patch.grams !== undefined) {
    const food = usableFood(existing.foodId);
    next.quantityG = resolveGrams(patch, food);
    delete next.servings;
    delete next.grams;
  }
  return present(repo.update(id, next));
}

export function remove(id) {
  if (!repo.remove(id)) throw new NotFoundError(`No meal entry with id ${id}`);
}

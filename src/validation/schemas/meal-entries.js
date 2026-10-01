/** Boundary validation for meal entry requests. */

import { exactlyOneOf, integer, isoDate, oneOf, positiveNumber } from '../primitives.js';

export const MEAL_SLOTS = ['breakfast', 'lunch', 'dinner', 'snack']; // FR-022a, fixed order
const MAX_QUANTITY = 100000; // FR-036a

/** FR-019: servings or grams, never both and never neither. */
function validateQuantity(body) {
  const chosen = exactlyOneOf(body, ['servings', 'grams'], 'quantity');
  return chosen === 'servings'
    ? { servings: positiveNumber(body.servings, 'servings', { max: MAX_QUANTITY }) }
    : { grams: positiveNumber(body.grams, 'grams', { max: MAX_QUANTITY }) };
}

export function validateCreate(body) {
  return {
    date: isoDate(body.date, 'date', { maxToday: true }),
    mealSlot: oneOf(body.mealSlot, 'mealSlot', MEAL_SLOTS),
    foodId: integer(body.foodId, 'foodId', { min: 1 }),
    ...validateQuantity(body),
  };
}

export function validateUpdate(body) {
  const patch = {};
  if (body.date !== undefined) patch.date = isoDate(body.date, 'date', { maxToday: true });
  if (body.mealSlot !== undefined) patch.mealSlot = oneOf(body.mealSlot, 'mealSlot', MEAL_SLOTS);
  if (body.servings !== undefined || body.grams !== undefined) {
    Object.assign(patch, validateQuantity(body));
  }
  return patch;
}

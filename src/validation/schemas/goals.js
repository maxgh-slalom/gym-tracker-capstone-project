/** Boundary validation for goal requests. */

import { nonNegativeNumber } from '../primitives.js';

const MAX_GOAL = 100000; // FR-036a

export function validateGoalSet(body) {
  return {
    calories: nonNegativeNumber(body.calories, 'calories', { max: MAX_GOAL }),
    proteinG: nonNegativeNumber(body.proteinG, 'proteinG', { max: MAX_GOAL }),
    carbsG: nonNegativeNumber(body.carbsG, 'carbsG', { max: MAX_GOAL }),
    fatG: nonNegativeNumber(body.fatG, 'fatG', { max: MAX_GOAL }),
  };
}

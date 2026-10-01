/** Boundary validation for food requests. */

import { nonNegativeNumber, positiveNumber, text } from '../primitives.js';

const MAX_NUTRIENT = 100000; // FR-036a
const MAX_PORTION = 100000;

export function validateCreate(body) {
  return {
    name: text(body.name, 'name', 1, 120),
    portionName: text(body.portionName, 'portionName', 1, 60),
    portionGrams: positiveNumber(body.portionGrams, 'portionGrams', { max: MAX_PORTION }),
    calories: nonNegativeNumber(body.calories, 'calories', { max: MAX_NUTRIENT }),
    proteinG: nonNegativeNumber(body.proteinG, 'proteinG', { max: MAX_NUTRIENT }),
    carbsG: nonNegativeNumber(body.carbsG, 'carbsG', { max: MAX_NUTRIENT }),
    fatG: nonNegativeNumber(body.fatG, 'fatG', { max: MAX_NUTRIENT }),
  };
}

export function validateUpdate(body) {
  const patch = {};
  if (body.name !== undefined) patch.name = text(body.name, 'name', 1, 120);
  if (body.portionName !== undefined) patch.portionName = text(body.portionName, 'portionName', 1, 60);
  if (body.portionGrams !== undefined) {
    patch.portionGrams = positiveNumber(body.portionGrams, 'portionGrams', { max: MAX_PORTION });
  }
  for (const field of ['calories', 'proteinG', 'carbsG', 'fatG']) {
    if (body[field] !== undefined) {
      patch[field] = nonNegativeNumber(body[field], field, { max: MAX_NUTRIENT });
    }
  }
  return patch;
}

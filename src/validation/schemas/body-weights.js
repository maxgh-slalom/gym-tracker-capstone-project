/** Boundary validation for body weight requests. */

import { positiveNumber } from '../primitives.js';

const MAX_BODY_WEIGHT = 1000; // FR-036a

export function validateWeight(body) {
  return { weightKg: positiveNumber(body.weightKg, 'weightKg', { max: MAX_BODY_WEIGHT }) };
}

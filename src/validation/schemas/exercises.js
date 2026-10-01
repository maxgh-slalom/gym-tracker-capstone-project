/** Boundary validation for exercise requests. */

import { oneOf, text } from '../primitives.js';

export const MUSCLE_GROUPS = [
  'chest',
  'back',
  'legs',
  'shoulders',
  'arms',
  'core',
  'full_body',
  'other',
];

export function validateCreate(body) {
  return {
    name: text(body.name, 'name', 1, 80),
    muscleGroup: oneOf(body.muscleGroup, 'muscleGroup', MUSCLE_GROUPS),
  };
}

export function validateUpdate(body) {
  const patch = {};
  if (body.name !== undefined) patch.name = text(body.name, 'name', 1, 80);
  if (body.muscleGroup !== undefined) {
    patch.muscleGroup = oneOf(body.muscleGroup, 'muscleGroup', MUSCLE_GROUPS);
  }
  return patch;
}

/** Business rules: workout sessions. Volume comes from the repository, never recomputed here. */

import { NotFoundError, ValidationError } from '../errors.js';
import * as repo from '../db/repositories/workouts.repo.js';
import * as exercisesRepo from '../db/repositories/exercises.repo.js';

/** Archived exercises stay readable in history but must not enter new entries (FR-004d). */
function assertUsableExercises(entries) {
  for (const [i, entry] of entries.entries()) {
    const exercise = exercisesRepo.findById(entry.exerciseId);
    if (!exercise) {
      throw new ValidationError(`No exercise with id ${entry.exerciseId}`, `entries[${i}].exerciseId`);
    }
    if (exercise.archived) {
      throw new ValidationError(
        `"${exercise.name}" is archived and cannot be used in a new entry`,
        `entries[${i}].exerciseId`,
      );
    }
  }
}

export function list(options) {
  return repo.list(options);
}

export function get(id) {
  const session = repo.findById(id);
  if (!session) throw new NotFoundError(`No workout session with id ${id}`);
  return session;
}

export function create(input) {
  assertUsableExercises(input.entries);
  const id = repo.create(input);
  return repo.findById(id);
}

/** FR-005b: emptying a session is rejected; deleting it is the supported path. */
export function replace(id, input) {
  if (!repo.exists(id)) throw new NotFoundError(`No workout session with id ${id}`);
  assertUsableExercises(input.entries);
  return repo.replace(id, input);
}

export function remove(id) {
  if (!repo.exists(id)) throw new NotFoundError(`No workout session with id ${id}`);
  repo.remove(id);
}

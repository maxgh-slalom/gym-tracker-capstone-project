/** Business rules: exercise lifecycle. Duplicate names, archiving, guarded deletion. */

import { ConflictError, NotFoundError } from '../errors.js';
import * as repo from '../db/repositories/exercises.repo.js';

function requireExercise(id) {
  const exercise = repo.findById(id);
  if (!exercise) throw new NotFoundError(`No exercise with id ${id}`);
  return exercise;
}

export function list(options) {
  return repo.list(options);
}

export function create({ name, muscleGroup }) {
  if (repo.findByNameKey(name)) {
    throw new ConflictError(`An exercise named "${name}" already exists`, 'name');
  }
  return repo.create({ name, muscleGroup });
}

export function update(id, patch) {
  requireExercise(id);
  if (patch.name && repo.findByNameKey(patch.name, { excludeId: id })) {
    throw new ConflictError(`An exercise named "${patch.name}" already exists`, 'name');
  }
  return repo.update(id, patch);
}

export function archive(id) {
  requireExercise(id);
  return repo.setArchived(id, true);
}

/** FR-004e: restoring must not resurrect a name an active exercise has since taken. */
export function restore(id) {
  const exercise = requireExercise(id);
  const clash = repo.findByNameKey(exercise.name, { excludeId: id });
  if (clash && !clash.archived) {
    throw new ConflictError(
      `Cannot restore "${exercise.name}": an active exercise now uses that name`,
      'name',
    );
  }
  return repo.setArchived(id, false);
}

/** FR-004c: deletion is only for items nothing references; otherwise archive. */
export function remove(id) {
  const exercise = requireExercise(id);
  if (exercise.setCount > 0) {
    throw new ConflictError(
      `Exercise is used by ${exercise.setCount} logged set(s). Archive it instead.`,
    );
  }
  repo.remove(id);
}

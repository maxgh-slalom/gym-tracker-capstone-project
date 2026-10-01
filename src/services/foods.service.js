/** Business rules: food catalog, including the FR-024c lock on referenced nutrition values. */

import { ConflictError, NotFoundError } from '../errors.js';
import * as repo from '../db/repositories/foods.repo.js';

/** Changing any of these rewrites every past entry's reported nutrition, so they lock. */
const LOCKED_FIELDS = ['portionGrams', 'calories', 'proteinG', 'carbsG', 'fatG'];

function requireFood(id) {
  const food = repo.findById(id);
  if (!food) throw new NotFoundError(`No food with id ${id}`);
  return food;
}

export function search(options) {
  return repo.search(options);
}

export function get(id) {
  return requireFood(id);
}

export function create(input) {
  if (repo.findByNameKey(input.name)) {
    throw new ConflictError(`A food named "${input.name}" already exists`, 'name');
  }
  return repo.create(input);
}

export function update(id, patch) {
  const food = requireFood(id);

  if (food.entryCount > 0) {
    for (const field of LOCKED_FIELDS) {
      if (patch[field] !== undefined && patch[field] !== food[field]) {
        const plural = food.entryCount === 1 ? 'entry' : 'entries';
        throw new ConflictError(
          `Nutrition values are locked: ${food.entryCount} meal ${plural} already reference this food. Create a new food instead.`,
          field,
        );
      }
    }
  }

  if (patch.name && repo.findByNameKey(patch.name, { excludeId: id })) {
    throw new ConflictError(`A food named "${patch.name}" already exists`, 'name');
  }
  return repo.update(id, patch);
}

export function archive(id) {
  requireFood(id);
  return repo.setArchived(id, true);
}

export function restore(id) {
  const food = requireFood(id);
  const clash = repo.findByNameKey(food.name, { excludeId: id });
  if (clash && !clash.archived) {
    throw new ConflictError(`Cannot restore "${food.name}": an active food now uses that name`, 'name');
  }
  return repo.setArchived(id, false);
}

export function remove(id) {
  const food = requireFood(id);
  if (food.entryCount > 0) {
    throw new ConflictError(
      `Food is used by ${food.entryCount} meal entries. Archive it instead.`,
    );
  }
  repo.remove(id);
}

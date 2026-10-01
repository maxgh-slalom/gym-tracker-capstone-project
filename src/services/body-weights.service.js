/** Business rules: body weight. One entry per date; writing an existing date replaces it. */

import { NotFoundError } from '../errors.js';
import * as repo from '../db/repositories/body-weights.repo.js';

export function list(options) {
  return repo.list(options);
}

export function upsert(date, weightKg) {
  const { entry, replaced } = repo.upsert(date, weightKg);
  return { ...entry, replaced };
}

export function remove(date) {
  if (!repo.remove(date)) throw new NotFoundError(`No body weight entry for ${date}`);
}

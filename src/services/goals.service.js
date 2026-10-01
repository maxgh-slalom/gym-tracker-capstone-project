/** Business rules: goal effective-dating (research R5). */

import { NotFoundError } from '../errors.js';
import * as repo from '../db/repositories/goals.repo.js';

export function listAll() {
  return repo.listAll();
}

export function effectiveFor(date) {
  return repo.findEffective(date);
}

/**
 * Resolves the governing goal set for every day in a range.
 * Loads the (few) goal sets once and walks them alongside the days, rather than
 * running a correlated subquery per day.
 */
export function effectiveForRange(from, to) {
  const sets = repo.listAll().slice().reverse(); // oldest first
  const result = new Map();
  let index = -1;
  for (const date of eachDate(from, to)) {
    while (index + 1 < sets.length && sets[index + 1].effectiveDate <= date) index += 1;
    result.set(date, index >= 0 ? sets[index] : null);
  }
  return result;
}

export function* eachDate(from, to) {
  const cursor = new Date(`${from}T00:00:00Z`);
  const end = new Date(`${to}T00:00:00Z`);
  while (cursor <= end) {
    yield cursor.toISOString().slice(0, 10);
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
}

export function upsert(effectiveDate, values) {
  return repo.upsert(effectiveDate, values);
}

export function remove(effectiveDate) {
  if (!repo.remove(effectiveDate)) {
    throw new NotFoundError(`No goal set effective ${effectiveDate}`);
  }
}

/** Boundary validation for the progress range. */

import { ValidationError } from '../../errors.js';
import { isoDate } from '../primitives.js';

export function validateRange(query) {
  const from = isoDate(query.from, 'from');
  const to = isoDate(query.to, 'to');
  // FR-030b: reported against `from`, so the UI can mark the field the user should fix.
  if (from > to) throw new ValidationError('from must not be later than to', 'from');
  return { from, to };
}

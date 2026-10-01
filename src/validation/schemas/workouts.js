/** Boundary validation for workout requests. Field paths follow entries[i].sets[j].field. */

import { integer, isoDate, nonNegativeNumber, optionalText, requireArray } from '../primitives.js';

const MAX_REPS = 1000; // FR-036a
const MAX_WEIGHT = 1000;

export function validateSession(body) {
  const date = isoDate(body.date, 'date', { maxToday: true });
  const note = optionalText(body.note, 'note', 500);
  const entries = requireArray(body.entries, 'entries', { min: 1 });

  const parsed = entries.map((entry, i) => {
    const exerciseId = integer(entry?.exerciseId, `entries[${i}].exerciseId`, { min: 1 });
    const sets = requireArray(entry?.sets, `entries[${i}].sets`, { min: 1 });
    return {
      exerciseId,
      sets: sets.map((set, j) => ({
        reps: integer(set?.reps, `entries[${i}].sets[${j}].reps`, { min: 1, max: MAX_REPS }),
        weightKg: nonNegativeNumber(set?.weightKg, `entries[${i}].sets[${j}].weightKg`, {
          max: MAX_WEIGHT,
        }),
      })),
    };
  });

  return { date, note, entries: parsed };
}

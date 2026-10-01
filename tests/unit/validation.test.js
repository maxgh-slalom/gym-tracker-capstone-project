import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  decimals,
  exactlyOneOf,
  integer,
  isoDate,
  nonNegativeNumber,
  oneOf,
  positiveNumber,
  requireArray,
  text,
  todayIso,
} from '../../src/validation/primitives.js';

const throwsField = (fn, field) =>
  assert.throws(fn, (err) => err.code === 'VALIDATION_ERROR' && err.field === field);

describe('isoDate', () => {
  it('accepts a real date', () => {
    assert.equal(isoDate('2026-02-28', 'date'), '2026-02-28');
  });

  it('rejects a malformed date', () => {
    throwsField(() => isoDate('28/02/2026', 'date'), 'date');
  });

  it('rejects a date that does not exist', () => {
    throwsField(() => isoDate('2026-02-30', 'date'), 'date');
  });

  it('rejects a future date when maxToday is set (FR-049)', () => {
    const future = new Date();
    future.setFullYear(future.getFullYear() + 1);
    throwsField(() => isoDate(future.toISOString().slice(0, 10), 'date', { maxToday: true }), 'date');
  });

  it('allows a future date when maxToday is not set (goal effective dates)', () => {
    assert.equal(isoDate('2099-01-01', 'effectiveDate'), '2099-01-01');
  });

  it('rejects dates before 1900-01-01 (FR-037a)', () => {
    throwsField(() => isoDate('1899-12-31', 'date'), 'date');
  });

  it('accepts today', () => {
    assert.equal(isoDate(todayIso(), 'date', { maxToday: true }), todayIso());
  });
});

describe('numbers', () => {
  it('rejects a comma decimal separator (FR-047)', () => {
    throwsField(() => positiveNumber('72,5', 'weightKg'), 'weightKg');
  });

  it('accepts a dot decimal separator', () => {
    assert.equal(positiveNumber('72.5', 'weightKg'), 72.5);
  });

  it('rejects more than one decimal place on input (FR-046)', () => {
    throwsField(() => positiveNumber(72.55, 'weightKg'), 'weightKg');
  });

  it('allows exactly one decimal place', () => {
    assert.equal(decimals(72.5, 'weightKg'), 72.5);
  });

  it('rejects zero for a positive number', () => {
    throwsField(() => positiveNumber(0, 'quantity'), 'quantity');
  });

  it('allows zero for a non-negative number (FR-007 bodyweight sets)', () => {
    assert.equal(nonNegativeNumber(0, 'weightKg'), 0);
  });

  it('rejects negatives', () => {
    throwsField(() => nonNegativeNumber(-1, 'weightKg'), 'weightKg');
  });

  it('enforces the upper bound (FR-036a)', () => {
    throwsField(() => nonNegativeNumber(1001, 'weightKg', { max: 1000 }), 'weightKg');
  });

  it('rejects non-numeric input', () => {
    throwsField(() => positiveNumber('heavy', 'weightKg'), 'weightKg');
  });
});

describe('integer', () => {
  it('rejects a fractional value', () => {
    throwsField(() => integer(5.5, 'reps'), 'reps');
  });

  it('rejects below the minimum', () => {
    throwsField(() => integer(0, 'reps', { min: 1 }), 'reps');
  });

  it('accepts a valid value', () => {
    assert.equal(integer('8', 'reps', { min: 1 }), 8);
  });
});

describe('oneOf and text', () => {
  it('rejects an unknown enum value', () => {
    throwsField(() => oneOf('cardio', 'muscleGroup', ['chest', 'legs']), 'muscleGroup');
  });

  it('trims text', () => {
    assert.equal(text('  Back Squat  ', 'name', 1, 80), 'Back Squat');
  });

  it('rejects blank text', () => {
    throwsField(() => text('   ', 'name', 1, 80), 'name');
  });

  it('rejects over-long text', () => {
    throwsField(() => text('x'.repeat(81), 'name', 1, 80), 'name');
  });
});

describe('exactlyOneOf', () => {
  it('rejects both present (FR-019)', () => {
    throwsField(() => exactlyOneOf({ servings: 1, grams: 100 }, ['servings', 'grams'], 'quantity'), 'quantity');
  });

  it('rejects neither present', () => {
    throwsField(() => exactlyOneOf({}, ['servings', 'grams'], 'quantity'), 'quantity');
  });

  it('accepts exactly one', () => {
    assert.equal(exactlyOneOf({ grams: 100 }, ['servings', 'grams'], 'quantity'), 'grams');
  });
});

describe('requireArray', () => {
  it('rejects an empty list when a minimum is set (FR-005b)', () => {
    throwsField(() => requireArray([], 'entries', { min: 1 }), 'entries');
  });

  it('rejects a non-array', () => {
    throwsField(() => requireArray('nope', 'entries'), 'entries');
  });
});

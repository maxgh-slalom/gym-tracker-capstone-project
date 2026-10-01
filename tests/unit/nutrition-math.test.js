import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  gramsToServings,
  roundKcal,
  roundMass,
  scaleNutrition,
  servingsToGrams,
  sumThenRound,
} from '../../src/services/nutrition-math.js';

const yogurt = { portionGrams: 227, calories: 146, proteinG: 20, carbsG: 8, fatG: 4 };

describe('rounding (FR-044)', () => {
  it('rounds energy to whole kcal', () => {
    assert.equal(roundKcal(146.4), 146);
    assert.equal(roundKcal(146.5), 147);
  });

  it('rounds masses to one decimal place', () => {
    assert.equal(roundMass(20.04), 20);
    assert.equal(roundMass(20.06), 20.1);
  });
});

describe('servings and grams (FR-020, SC-006b)', () => {
  it('converts servings to grams', () => {
    assert.equal(servingsToGrams(1.5, 227), 340.5);
  });

  it('round-trips back to servings', () => {
    assert.equal(gramsToServings(340.5, 227), 1.5);
  });

  it('produces identical nutrition from either unit', () => {
    const viaServings = scaleNutrition(yogurt, servingsToGrams(2, yogurt.portionGrams));
    const viaGrams = scaleNutrition(yogurt, 454);
    assert.deepEqual(viaServings, viaGrams);
  });
});

describe('scaling (FR-020a)', () => {
  it('scales every nutrient by the same factor', () => {
    const scaled = scaleNutrition(yogurt, 113.5); // half a portion
    assert.equal(roundKcal(scaled.calories), 73);
    assert.equal(roundMass(scaled.proteinG), 10);
    assert.equal(roundMass(scaled.carbsG), 4);
    assert.equal(roundMass(scaled.fatG), 2);
  });

  it('scales to zero for a zero quantity', () => {
    assert.equal(scaleNutrition(yogurt, 0).calories, 0);
  });
});

describe('sumThenRound (FR-045)', () => {
  it('sums unrounded values and rounds once', () => {
    const entries = [
      { calories: 0.4, proteinG: 0.04, carbsG: 0.04, fatG: 0.04 },
      { calories: 0.4, proteinG: 0.04, carbsG: 0.04, fatG: 0.04 },
      { calories: 0.4, proteinG: 0.04, carbsG: 0.04, fatG: 0.04 },
    ];
    const total = sumThenRound(entries);

    // Rounding each entry first would give 0; summing first gives 1.2 -> 1.
    assert.equal(total.calories, 1);
    assert.equal(total.proteinG, 0.1);
  });

  it('matches the sum of a day of real entries', () => {
    const entries = [
      scaleNutrition(yogurt, 227),
      scaleNutrition(yogurt, 113.5),
      scaleNutrition(yogurt, 340.5),
    ];
    const total = sumThenRound(entries);
    const expected = entries.reduce((sum, e) => sum + e.calories, 0);
    assert.equal(total.calories, Math.round(expected));
  });

  it('returns zeros for an empty day', () => {
    assert.deepEqual(sumThenRound([]), { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 });
  });
});

/** Business rules: the single owner of nutrition scaling and of the FR-044 rounding policy. */

/** FR-044: energy to whole kcal. */
export function roundKcal(value) {
  return Math.round(value);
}

/** FR-044: masses to one decimal place. */
export function roundMass(value) {
  return Math.round(value * 10) / 10;
}

export function servingsToGrams(servings, portionGrams) {
  return servings * portionGrams;
}

export function gramsToServings(grams, portionGrams) {
  return grams / portionGrams;
}

/** FR-020a: one scaling expression, applied identically to energy and every macro. */
export function scaleNutrition(food, quantityG) {
  const factor = quantityG / food.portionGrams;
  return {
    calories: food.calories * factor,
    proteinG: food.proteinG * factor,
    carbsG: food.carbsG * factor,
    fatG: food.fatG * factor,
  };
}

/**
 * FR-045: sums the unrounded values, then rounds once. Rounding each entry first
 * is what makes a displayed total disagree with the entries beneath it.
 */
export function sumThenRound(entries) {
  const total = entries.reduce(
    (acc, e) => ({
      calories: acc.calories + e.calories,
      proteinG: acc.proteinG + e.proteinG,
      carbsG: acc.carbsG + e.carbsG,
      fatG: acc.fatG + e.fatG,
    }),
    { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 },
  );
  return {
    calories: roundKcal(total.calories),
    proteinG: roundMass(total.proteinG),
    carbsG: roundMass(total.carbsG),
    fatG: roundMass(total.fatG),
  };
}

export function roundNutrition(n) {
  return {
    calories: roundKcal(n.calories),
    proteinG: roundMass(n.proteinG),
    carbsG: roundMass(n.carbsG),
    fatG: roundMass(n.fatG),
  };
}

/**
 * Deterministic seed generator. Given the same date it produces identical records,
 * so two resets on one day are indistinguishable (SC-008a). No Math.random().
 */

import { EXERCISES, FOODS, GOAL_SETS, SPLIT, START_WEIGHTS } from './catalog.js';

const SEED = 0x5eed1234;

/** Mulberry32: tiny, fast, and fully reproducible from a fixed constant. */
function createRandom(seed = SEED) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shiftDays(iso, days) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

const round1 = (n) => Math.round(n * 10) / 10;

export function generate(todayIso) {
  const random = createRandom();

  const exercises = EXERCISES.map((e) => ({ ...e }));

  const foods = FOODS.map(([name, portionName, portionGrams, calories, proteinG, carbsG, fatG]) => ({
    name,
    portionName,
    portionGrams,
    calories,
    proteinG,
    carbsG,
    fatG,
  }));

  const goalSets = GOAL_SETS.map((g) => ({
    effectiveDate: shiftDays(todayIso, -g.weeksAgo * 7),
    calories: g.calories,
    proteinG: g.proteinG,
    carbsG: g.carbsG,
    fatG: g.fatG,
  }));

  // 8 weeks of training, 4 sessions a week, ending yesterday.
  const sessions = [];
  for (let week = 7; week >= 0; week -= 1) {
    for (let slot = 0; slot < 4; slot += 1) {
      const daysAgo = week * 7 - slot * 2 + 1;
      if (daysAgo < 1) continue;
      const date = shiftDays(todayIso, -daysAgo);
      const progression = (7 - week) * 2.5; // steady overload across the block

      const entries = SPLIT[slot].map((name) => {
        const base = START_WEIGHTS[name] + progression;
        const setCount = 3 + (random() < 0.35 ? 1 : 0);
        const sets = [];
        for (let s = 0; s < setCount; s += 1) {
          sets.push({
            reps: 5 + Math.floor(random() * 4),
            weightKg: round1(Math.max(0, base + Math.floor(random() * 3 - 1) * 2.5)),
          });
        }
        return { exerciseName: name, sets };
      });

      sessions.push({ date, note: week === 0 && slot === 0 ? 'Felt strong' : null, entries });
    }
  }

  // Daily weigh-ins over the same window, trending gently down with plausible noise.
  const bodyWeights = [];
  const startWeight = 80.5;
  for (let daysAgo = 56; daysAgo >= 0; daysAgo -= 1) {
    const trend = startWeight - (56 - daysAgo) * 0.03;
    const noise = (random() - 0.5) * 0.8;
    bodyWeights.push({ date: shiftDays(todayIso, -daysAgo), weightKg: round1(trend + noise) });
  }

  // 6 weeks of meals, 2-3 items per slot.
  const slots = ['breakfast', 'lunch', 'dinner', 'snack'];
  const slotFoods = {
    breakfast: ['Rolled Oats, dry', 'Whole Egg, large', 'Greek Yogurt 2%', 'Banana', 'Blueberries'],
    lunch: ['Chicken Breast, grilled', 'White Rice, cooked', 'Broccoli, steamed', 'Olive Oil', 'Apple'],
    dinner: ['Salmon Fillet, baked', 'Sweet Potato, baked', 'Mixed Salad Greens', 'Avocado', 'Brown Rice, cooked'],
    snack: ['Whey Protein Powder', 'Almonds', 'Peanut Butter', 'Protein Bar', 'Dark Chocolate 70%'],
  };

  const mealEntries = [];
  for (let daysAgo = 41; daysAgo >= 0; daysAgo -= 1) {
    const date = shiftDays(todayIso, -daysAgo);
    for (const slot of slots) {
      const choices = slotFoods[slot];
      const count = 2 + (random() < 0.5 ? 1 : 0);
      const picked = new Set();
      while (picked.size < count) picked.add(choices[Math.floor(random() * choices.length)]);
      for (const foodName of picked) {
        mealEntries.push({
          date,
          mealSlot: slot,
          foodName,
          servings: round1(0.5 + Math.floor(random() * 3) * 0.5),
        });
      }
    }
  }

  return { exercises, foods, goalSets, sessions, bodyWeights, mealEntries };
}

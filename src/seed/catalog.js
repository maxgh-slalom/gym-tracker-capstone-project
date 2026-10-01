/** Fixed catalog shipped with the demo seed. Values are plausible, not authoritative. */

export const EXERCISES = [
  { name: 'Back Squat', muscleGroup: 'legs' },
  { name: 'Romanian Deadlift', muscleGroup: 'legs' },
  { name: 'Leg Press', muscleGroup: 'legs' },
  { name: 'Bench Press', muscleGroup: 'chest' },
  { name: 'Incline Dumbbell Press', muscleGroup: 'chest' },
  { name: 'Barbell Row', muscleGroup: 'back' },
  { name: 'Lat Pulldown', muscleGroup: 'back' },
  { name: 'Pull-Up', muscleGroup: 'back' },
  { name: 'Overhead Press', muscleGroup: 'shoulders' },
  { name: 'Lateral Raise', muscleGroup: 'shoulders' },
  { name: 'Barbell Curl', muscleGroup: 'arms' },
  { name: 'Cable Crunch', muscleGroup: 'core', archived: true },
];

// name, portionName, portionGrams, calories, protein, carbs, fat (per reference portion)
export const FOODS = [
  ['Chicken Breast, grilled', '100 g', 100, 165, 31, 0, 3.6],
  ['Ground Beef 90/10, cooked', '100 g', 100, 217, 26, 0, 11.8],
  ['Salmon Fillet, baked', '100 g', 100, 206, 22, 0, 12.4],
  ['Tuna, canned in water', '1 can', 142, 191, 42, 0, 1.4],
  ['Whole Egg, large', '1 egg', 50, 72, 6.3, 0.4, 4.8],
  ['Egg White', '1 white', 33, 17, 3.6, 0.2, 0.1],
  ['Greek Yogurt 2%', '1 cup', 227, 146, 20, 8, 4],
  ['Cottage Cheese 2%', '1 cup', 226, 183, 24, 9.7, 5.1],
  ['Whole Milk', '1 cup', 244, 149, 7.7, 11.7, 8],
  ['Cheddar Cheese', '1 slice', 28, 113, 7, 0.4, 9.3],
  ['Whey Protein Powder', '1 scoop', 30, 120, 24, 3, 1.5],
  ['White Rice, cooked', '1 cup', 186, 242, 4.4, 53.2, 0.4],
  ['Brown Rice, cooked', '1 cup', 195, 216, 5, 45, 1.8],
  ['Pasta, cooked', '1 cup', 140, 221, 8.1, 43.2, 1.3],
  ['Rolled Oats, dry', '0.5 cup', 40, 150, 5, 27, 3],
  ['Sweet Potato, baked', '1 medium', 150, 135, 2.5, 31.1, 0.2],
  ['Potato, baked', '1 medium', 173, 161, 4.3, 36.6, 0.2],
  ['Whole Wheat Bread', '1 slice', 43, 110, 5.4, 18.6, 1.9],
  ['Bagel, plain', '1 bagel', 105, 289, 11.1, 56.1, 1.7],
  ['Tortilla, flour', '1 tortilla', 49, 146, 3.9, 24.5, 3.5],
  ['Black Beans, cooked', '1 cup', 172, 227, 15.2, 40.8, 0.9],
  ['Lentils, cooked', '1 cup', 198, 230, 17.9, 39.9, 0.8],
  ['Chickpeas, cooked', '1 cup', 164, 269, 14.5, 45, 4.2],
  ['Tofu, firm', '100 g', 100, 144, 17.3, 2.8, 8.7],
  ['Broccoli, steamed', '1 cup', 156, 55, 3.7, 11.2, 0.6],
  ['Spinach, raw', '1 cup', 30, 7, 0.9, 1.1, 0.1],
  ['Mixed Salad Greens', '2 cups', 72, 13, 1.1, 2.3, 0.2],
  ['Carrot, raw', '1 medium', 61, 25, 0.6, 5.8, 0.1],
  ['Banana', '1 medium', 118, 105, 1.3, 27, 0.4],
  ['Apple', '1 medium', 182, 95, 0.5, 25.1, 0.3],
  ['Blueberries', '1 cup', 148, 84, 1.1, 21.4, 0.5],
  ['Orange', '1 medium', 131, 62, 1.2, 15.4, 0.2],
  ['Avocado', '0.5 fruit', 100, 160, 2, 8.5, 14.7],
  ['Almonds', '1 oz', 28, 164, 6, 6.1, 14.2],
  ['Peanut Butter', '2 tbsp', 32, 188, 8, 6.9, 16],
  ['Olive Oil', '1 tbsp', 14, 119, 0, 0, 13.5],
  ['Butter', '1 tbsp', 14, 102, 0.1, 0, 11.5],
  ['Honey', '1 tbsp', 21, 64, 0.1, 17.3, 0],
  ['Dark Chocolate 70%', '1 oz', 28, 170, 2.2, 13, 12.1],
  ['Protein Bar', '1 bar', 60, 220, 20, 23, 7],
];

export const GOAL_SETS = [
  { weeksAgo: 8, calories: 2200, proteinG: 165, carbsG: 220, fatG: 65 },
  { weeksAgo: 3, calories: 2400, proteinG: 180, carbsG: 240, fatG: 70 },
];

/** Exercises chosen per weekday slot, so sessions look like a real split. */
export const SPLIT = [
  ['Back Squat', 'Romanian Deadlift', 'Leg Press'],
  ['Bench Press', 'Incline Dumbbell Press', 'Lateral Raise'],
  ['Barbell Row', 'Lat Pulldown', 'Barbell Curl'],
  ['Overhead Press', 'Pull-Up', 'Bench Press'],
];

/** Starting working weight per exercise, in kg. */
export const START_WEIGHTS = {
  'Back Squat': 80,
  'Romanian Deadlift': 70,
  'Leg Press': 120,
  'Bench Press': 60,
  'Incline Dumbbell Press': 22,
  'Barbell Row': 55,
  'Lat Pulldown': 50,
  'Pull-Up': 0,
  'Overhead Press': 35,
  'Lateral Raise': 10,
  'Barbell Curl': 25,
};

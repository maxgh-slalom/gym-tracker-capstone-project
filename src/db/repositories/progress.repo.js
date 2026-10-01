/** Data layer: progress aggregates that no other repository owns. Workout math lives in workouts.repo.js. */

import * as bodyWeightsRepo from './body-weights.repo.js';

export function bodyWeightPoints(from, to) {
  return bodyWeightsRepo.rangePoints(from, to);
}

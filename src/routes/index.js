/** HTTP layer: mounts every router under /api. Routes only — no data access here. */

import { Router } from 'express';
import { getHealth } from '../services/health.service.js';
import { exercisesRouter } from './exercises.routes.js';
import { workoutsRouter } from './workouts.routes.js';
import { bodyWeightsRouter } from './body-weights.routes.js';
import { foodsRouter } from './foods.routes.js';
import { mealEntriesRouter } from './meal-entries.routes.js';
import { nutritionRouter } from './nutrition.routes.js';
import { goalsRouter } from './goals.routes.js';
import { progressRouter } from './progress.routes.js';
import { demoRouter } from './demo.routes.js';

export const apiRouter = Router();

apiRouter.get('/health', (_req, res, next) => {
  try {
    res.json(getHealth());
  } catch (err) {
    next(err);
  }
});

apiRouter.use('/exercises', exercisesRouter);
apiRouter.use('/workouts', workoutsRouter);
apiRouter.use('/body-weights', bodyWeightsRouter);
apiRouter.use('/foods', foodsRouter);
apiRouter.use('/meal-entries', mealEntriesRouter);
apiRouter.use('/nutrition', nutritionRouter);
apiRouter.use('/goals', goalsRouter);
apiRouter.use('/progress', progressRouter);
apiRouter.use('/demo', demoRouter);

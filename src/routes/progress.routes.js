/** HTTP layer: progress trends. */

import { Router } from 'express';
import * as service from '../services/progress.service.js';
import { validateRange } from '../validation/schemas/progress.js';
import { integer } from '../validation/primitives.js';

export const progressRouter = Router();

progressRouter.get('/', (req, res, next) => {
  try {
    const { from, to } = validateRange(req.query);
    const exerciseId = req.query.exerciseId
      ? integer(req.query.exerciseId, 'exerciseId', { min: 1 })
      : null;
    res.json(service.build({ from, to, exerciseId }));
  } catch (err) {
    next(err);
  }
});

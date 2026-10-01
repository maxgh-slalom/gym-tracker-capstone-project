/** HTTP layer: the nutrition day view. */

import { Router } from 'express';
import * as service from '../services/nutrition.service.js';
import { isoDate } from '../validation/primitives.js';

export const nutritionRouter = Router();

nutritionRouter.get('/day/:date', (req, res, next) => {
  try {
    res.json(service.dayView(isoDate(req.params.date, 'date')));
  } catch (err) {
    next(err);
  }
});

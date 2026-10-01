/** HTTP layer: goals. Addressed by effective date. */

import { Router } from 'express';
import * as service from '../services/goals.service.js';
import { validateGoalSet } from '../validation/schemas/goals.js';
import { isoDate } from '../validation/primitives.js';

export const goalsRouter = Router();

goalsRouter.get('/', (_req, res, next) => {
  try {
    res.json({ goalSets: service.listAll() });
  } catch (err) {
    next(err);
  }
});

goalsRouter.get('/effective/:date', (req, res, next) => {
  try {
    res.json({ goalSet: service.effectiveFor(isoDate(req.params.date, 'date')) });
  } catch (err) {
    next(err);
  }
});

// FR-049 exception: scheduling a goal change ahead of time is legitimate, so no maxToday.
goalsRouter.put('/:effectiveDate', (req, res, next) => {
  try {
    const effectiveDate = isoDate(req.params.effectiveDate, 'effectiveDate');
    res.json(service.upsert(effectiveDate, validateGoalSet(req.body ?? {})));
  } catch (err) {
    next(err);
  }
});

goalsRouter.delete('/:effectiveDate', (req, res, next) => {
  try {
    service.remove(isoDate(req.params.effectiveDate, 'effectiveDate'));
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

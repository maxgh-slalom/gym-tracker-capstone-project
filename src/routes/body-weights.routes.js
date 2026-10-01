/** HTTP layer: body weight. Addressed by date, because the date is the identity. */

import { Router } from 'express';
import * as service from '../services/body-weights.service.js';
import { validateWeight } from '../validation/schemas/body-weights.js';
import { isoDate } from '../validation/primitives.js';

export const bodyWeightsRouter = Router();

bodyWeightsRouter.get('/', (req, res, next) => {
  try {
    const from = req.query.from ? isoDate(req.query.from, 'from') : null;
    const to = req.query.to ? isoDate(req.query.to, 'to') : null;
    res.json({ entries: service.list({ from, to }) });
  } catch (err) {
    next(err);
  }
});

bodyWeightsRouter.put('/:date', (req, res, next) => {
  try {
    const date = isoDate(req.params.date, 'date', { maxToday: true });
    const { weightKg } = validateWeight(req.body ?? {});
    res.json(service.upsert(date, weightKg));
  } catch (err) {
    next(err);
  }
});

bodyWeightsRouter.delete('/:date', (req, res, next) => {
  try {
    service.remove(isoDate(req.params.date, 'date'));
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

/** HTTP layer: workout sessions. */

import { Router } from 'express';
import * as service from '../services/workouts.service.js';
import { validateSession } from '../validation/schemas/workouts.js';
import { integer, isoDate } from '../validation/primitives.js';

export const workoutsRouter = Router();

workoutsRouter.get('/', (req, res, next) => {
  try {
    const from = req.query.from ? isoDate(req.query.from, 'from') : null;
    const to = req.query.to ? isoDate(req.query.to, 'to') : null;
    const limit = req.query.limit ? integer(req.query.limit, 'limit', { min: 1, max: 200 }) : 50;
    res.json({ sessions: service.list({ from, to, limit }) });
  } catch (err) {
    next(err);
  }
});

workoutsRouter.get('/:id', (req, res, next) => {
  try {
    res.json(service.get(integer(req.params.id, 'id', { min: 1 })));
  } catch (err) {
    next(err);
  }
});

workoutsRouter.post('/', (req, res, next) => {
  try {
    res.status(201).json(service.create(validateSession(req.body ?? {})));
  } catch (err) {
    next(err);
  }
});

workoutsRouter.put('/:id', (req, res, next) => {
  try {
    const id = integer(req.params.id, 'id', { min: 1 });
    res.json(service.replace(id, validateSession(req.body ?? {})));
  } catch (err) {
    next(err);
  }
});

workoutsRouter.delete('/:id', (req, res, next) => {
  try {
    service.remove(integer(req.params.id, 'id', { min: 1 }));
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

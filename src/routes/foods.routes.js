/** HTTP layer: foods. */

import { Router } from 'express';
import * as service from '../services/foods.service.js';
import { validateCreate, validateUpdate } from '../validation/schemas/foods.js';
import { integer } from '../validation/primitives.js';

export const foodsRouter = Router();

foodsRouter.get('/', (req, res, next) => {
  try {
    const limit = req.query.limit ? integer(req.query.limit, 'limit', { min: 1, max: 100 }) : 25;
    res.json(
      service.search({
        term: req.query.search ?? null,
        includeArchived: req.query.includeArchived === 'true',
        limit,
      }),
    );
  } catch (err) {
    next(err);
  }
});

foodsRouter.post('/', (req, res, next) => {
  try {
    res.status(201).json(service.create(validateCreate(req.body ?? {})));
  } catch (err) {
    next(err);
  }
});

foodsRouter.patch('/:id', (req, res, next) => {
  try {
    const id = integer(req.params.id, 'id', { min: 1 });
    res.json(service.update(id, validateUpdate(req.body ?? {})));
  } catch (err) {
    next(err);
  }
});

foodsRouter.post('/:id/archive', (req, res, next) => {
  try {
    res.json(service.archive(integer(req.params.id, 'id', { min: 1 })));
  } catch (err) {
    next(err);
  }
});

foodsRouter.post('/:id/restore', (req, res, next) => {
  try {
    res.json(service.restore(integer(req.params.id, 'id', { min: 1 })));
  } catch (err) {
    next(err);
  }
});

foodsRouter.delete('/:id', (req, res, next) => {
  try {
    service.remove(integer(req.params.id, 'id', { min: 1 }));
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

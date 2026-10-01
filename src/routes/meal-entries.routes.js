/** HTTP layer: meal entries. */

import { Router } from 'express';
import * as service from '../services/meal-entries.service.js';
import { validateCreate, validateUpdate } from '../validation/schemas/meal-entries.js';
import { integer } from '../validation/primitives.js';

export const mealEntriesRouter = Router();

mealEntriesRouter.post('/', (req, res, next) => {
  try {
    res.status(201).json(service.create(validateCreate(req.body ?? {})));
  } catch (err) {
    next(err);
  }
});

mealEntriesRouter.patch('/:id', (req, res, next) => {
  try {
    const id = integer(req.params.id, 'id', { min: 1 });
    res.json(service.update(id, validateUpdate(req.body ?? {})));
  } catch (err) {
    next(err);
  }
});

mealEntriesRouter.delete('/:id', (req, res, next) => {
  try {
    service.remove(integer(req.params.id, 'id', { min: 1 }));
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

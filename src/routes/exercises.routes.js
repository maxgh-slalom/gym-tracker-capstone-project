/** HTTP layer: exercises. Validates, delegates, shapes the response. */

import { Router } from 'express';
import * as service from '../services/exercises.service.js';
import { validateCreate, validateUpdate, MUSCLE_GROUPS } from '../validation/schemas/exercises.js';
import { integer, oneOf } from '../validation/primitives.js';

export const exercisesRouter = Router();

exercisesRouter.get('/', (req, res, next) => {
  try {
    const includeArchived = req.query.includeArchived === 'true';
    const muscleGroup = req.query.muscleGroup
      ? oneOf(req.query.muscleGroup, 'muscleGroup', MUSCLE_GROUPS)
      : null;
    res.json({ exercises: service.list({ includeArchived, muscleGroup }) });
  } catch (err) {
    next(err);
  }
});

exercisesRouter.post('/', (req, res, next) => {
  try {
    res.status(201).json(service.create(validateCreate(req.body ?? {})));
  } catch (err) {
    next(err);
  }
});

exercisesRouter.patch('/:id', (req, res, next) => {
  try {
    const id = integer(req.params.id, 'id', { min: 1 });
    res.json(service.update(id, validateUpdate(req.body ?? {})));
  } catch (err) {
    next(err);
  }
});

exercisesRouter.post('/:id/archive', (req, res, next) => {
  try {
    res.json(service.archive(integer(req.params.id, 'id', { min: 1 })));
  } catch (err) {
    next(err);
  }
});

exercisesRouter.post('/:id/restore', (req, res, next) => {
  try {
    res.json(service.restore(integer(req.params.id, 'id', { min: 1 })));
  } catch (err) {
    next(err);
  }
});

exercisesRouter.delete('/:id', (req, res, next) => {
  try {
    service.remove(integer(req.params.id, 'id', { min: 1 }));
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

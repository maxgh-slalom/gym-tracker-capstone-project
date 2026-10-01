/** HTTP layer: the destructive demo reset. */

import { Router } from 'express';
import * as service from '../services/demo.service.js';
import { ValidationError } from '../errors.js';

export const demoRouter = Router();

// FR-041d: the exact, case-sensitive token is the contract-level guard.
demoRouter.post('/reset', (req, res, next) => {
  try {
    if ((req.body ?? {}).confirm !== 'RESET') {
      throw new ValidationError('Send {"confirm":"RESET"} to erase all data and reload the demo', 'confirm');
    }
    res.json({ reset: true, counts: service.resetDemo() });
  } catch (err) {
    next(err);
  }
});

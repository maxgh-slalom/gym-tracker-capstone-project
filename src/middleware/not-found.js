/** HTTP layer: unmatched /api paths get JSON, never the SPA shell. */

import { NotFoundError } from '../errors.js';

export function notFound(req, _res, next) {
  next(new NotFoundError(`No API route matches ${req.method} ${req.originalUrl}`));
}

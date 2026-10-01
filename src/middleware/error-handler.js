/** HTTP layer: the single exit point for every error. Logs fully, responds minimally. */

import { AppError } from '../errors.js';

// eslint-disable-next-line no-unused-vars -- Express identifies error middleware by arity
export function errorHandler(err, req, res, _next) {
  const known = err instanceof AppError;
  const statusCode = known ? err.statusCode : 500;

  // FR-038f/FR-038g: full context server-side, nothing internal in the response.
  console.error(
    `[gymtracker] ${req.method} ${req.originalUrl} -> ${statusCode} ${known ? err.code : 'INTERNAL_ERROR'}: ${err.message}`,
  );
  if (!known) console.error(err.stack);

  res.status(statusCode).json({
    error: {
      code: known ? err.code : 'INTERNAL_ERROR',
      message: known ? err.message : 'An unexpected error occurred. See the server log for details.',
      field: known ? err.field : null,
    },
  });
}

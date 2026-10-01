/** HTTP layer: FR-036e — only JSON bodies are accepted. */

import { ValidationError } from '../errors.js';

const METHODS_WITH_BODY = new Set(['POST', 'PUT', 'PATCH']);

export function requireJson(req, _res, next) {
  if (!METHODS_WITH_BODY.has(req.method)) return next();

  const length = req.get('content-length');
  if (!length || length === '0') return next(); // bodyless POST, e.g. /archive

  const type = req.get('content-type') ?? '';
  if (!type.toLowerCase().startsWith('application/json')) {
    return next(
      new ValidationError(
        `Request bodies must be application/json; received "${type || 'none'}"`,
        'content-type',
      ),
    );
  }
  return next();
}

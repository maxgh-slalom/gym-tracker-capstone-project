/** Builds the Express app without listening, so tests can start it on an ephemeral port. */

import express from 'express';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { apiRouter } from './routes/index.js';
import { errorHandler } from './middleware/error-handler.js';
import { notFound } from './middleware/not-found.js';

const PUBLIC_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');

export function createApp() {
  const app = express();

  app.use(express.json({ limit: '1mb' })); // FR-036e
  app.use(express.static(PUBLIC_DIR));
  app.use('/api', apiRouter);
  app.use('/api', notFound);
  app.use(errorHandler);

  return app;
}

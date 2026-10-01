/** Entry point: migrate, then listen. Never writes application data (FR-043). */

import { config } from './src/config.js';
import { openDatabase, setDb } from './src/db/connection.js';
import { migrate } from './src/db/migrate.js';
import { isEmpty } from './src/db/repositories/health.repo.js';
import { createApp } from './src/app.js';

try {
  const db = setDb(openDatabase(config.dbPath));
  console.log(`gymtracker: database ${config.dbPath}`);

  const applied = migrate(db);
  console.log(`gymtracker: migrations applied (${applied})`);

  if (isEmpty(db)) {
    console.log('gymtracker: database is empty — use "Load demo data" or POST /api/demo/reset');
  }

  createApp().listen(config.port, config.host, () => {
    console.log(`gymtracker: listening on http://${config.host}:${config.port}`);
  });
} catch (error) {
  // FR-035a: fail loudly at startup rather than serving a broken app.
  console.error(`gymtracker: startup failed — ${error.message}`);
  if (error.cause) console.error(error.cause);
  process.exit(1);
}

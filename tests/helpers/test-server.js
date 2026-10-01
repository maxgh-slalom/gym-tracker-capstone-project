/** Test helper: the real app on an ephemeral port, exercised over real HTTP. */

import { createApp } from '../../src/app.js';
import { createTestDb } from './test-db.js';

export async function startTestServer() {
  const testDb = createTestDb();
  const server = createApp().listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  async function api(method, path, body) {
    const res = await fetch(`${baseUrl}${path}`, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : {},
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    return { status: res.status, body: text ? JSON.parse(text) : null };
  }

  return {
    api,
    baseUrl,
    async close() {
      await new Promise((resolve) => server.close(resolve));
      testDb.cleanup();
    },
  };
}

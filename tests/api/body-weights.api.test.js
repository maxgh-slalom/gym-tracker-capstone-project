import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { startTestServer } from '../helpers/test-server.js';

let server;
let api;
before(async () => {
  server = await startTestServer();
  api = server.api;
});
after(async () => server.close());

describe('body weights API', () => {
  it('records an entry', async () => {
    const res = await api('PUT', '/api/body-weights/2026-09-01', { weightKg: 80.5 });
    assert.equal(res.status, 200);
    assert.equal(res.body.weightKg, 80.5);
    assert.equal(res.body.replaced, false);
  });

  it('replaces the value for an existing date (FR-013)', async () => {
    const res = await api('PUT', '/api/body-weights/2026-09-01', { weightKg: 79.9 });
    assert.equal(res.body.replaced, true);

    const list = await api('GET', '/api/body-weights');
    assert.equal(list.body.entries.filter((e) => e.date === '2026-09-01').length, 1);
  });

  it('rejects zero, negative, and non-numeric weights (FR-014)', async () => {
    for (const weightKg of [0, -5, 'heavy']) {
      const res = await api('PUT', '/api/body-weights/2026-09-02', { weightKg });
      assert.equal(res.status, 400);
      assert.equal(res.body.error.field, 'weightKg');
    }
  });

  it('rejects a comma decimal separator (FR-047)', async () => {
    const res = await api('PUT', '/api/body-weights/2026-09-02', { weightKg: '80,5' });
    assert.equal(res.status, 400);
    assert.equal(res.body.error.field, 'weightKg');
  });

  it('rejects two decimal places on input (FR-046)', async () => {
    const res = await api('PUT', '/api/body-weights/2026-09-02', { weightKg: 80.55 });
    assert.equal(res.status, 400);
  });

  it('rejects a future date (FR-049)', async () => {
    const future = new Date();
    future.setFullYear(future.getFullYear() + 1);
    const res = await api('PUT', `/api/body-weights/${future.toISOString().slice(0, 10)}`, {
      weightKg: 80,
    });
    assert.equal(res.status, 400);
    assert.equal(res.body.error.field, 'date');
  });

  it('rejects a date before 1900 (FR-037a)', async () => {
    const res = await api('PUT', '/api/body-weights/1899-01-01', { weightKg: 80 });
    assert.equal(res.status, 400);
  });

  it('deletes with 204 and 404s on a missing date', async () => {
    assert.equal((await api('DELETE', '/api/body-weights/2026-09-01')).status, 204);
    assert.equal((await api('DELETE', '/api/body-weights/2026-09-01')).status, 404);
  });
});

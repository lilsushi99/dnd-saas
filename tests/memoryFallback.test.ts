import test from 'node:test';
import assert from 'node:assert/strict';
import { isMemoryFallbackAllowed } from '../server/database/db';

test('in-memory database fallback is opt-in and can never run in production', () => {
  const prev = { a: process.env.ALLOW_MEMORY_DB, n: process.env.NODE_ENV };
  try {
    delete process.env.ALLOW_MEMORY_DB;
    assert.equal(isMemoryFallbackAllowed(), false, 'off by default');
    process.env.ALLOW_MEMORY_DB = 'false';
    assert.equal(isMemoryFallbackAllowed(), false);
    process.env.ALLOW_MEMORY_DB = 'true';
    process.env.NODE_ENV = 'test';
    assert.equal(isMemoryFallbackAllowed(), true, 'explicit dev opt-in works');
    process.env.NODE_ENV = 'production';
    assert.equal(isMemoryFallbackAllowed(), false, 'ignored in production even when the flag is set');
  } finally {
    if (prev.a === undefined) delete process.env.ALLOW_MEMORY_DB; else process.env.ALLOW_MEMORY_DB = prev.a;
    process.env.NODE_ENV = prev.n;
  }
});

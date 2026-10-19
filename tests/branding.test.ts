import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { Server } from 'http';
import { createApiApp } from '../server/app';
import { executeQuery, checkDbConnection, isUsingMemoryFallback } from '../server/database/db';

let server: Server;
let base = '';
let token = '';

async function api(method: string, path: string, opts: { token?: string; body?: any } = {}) {
  const res = await fetch(base + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {}),
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  let json: any = null;
  try {
    json = await res.json();
  } catch {}
  return { status: res.status, json };
}

before(async () => {
  await checkDbConnection();
  const app = createApiApp();
  await new Promise<void>((resolve) => {
    server = app.listen(0, '127.0.0.1', () => resolve());
  });
  base = `http://127.0.0.1:${(server.address() as any).port}`;

  // Login as Director or create session
  const loginRes = await api('POST', '/api/auth/login', {
    body: { email: 'director@nexuserp.com', password: 'password123' },
  });

  if (loginRes.status === 200 && loginRes.json?.token) {
    token = loginRes.json.token;
  } else {
    // Attempt fallback director user in test DB
    const altLogin = await api('POST', '/api/auth/login', {
      body: { email: 'director@test.local', password: 'Correct-Horse-Battery-9' },
    });
    if (altLogin.status === 200 && altLogin.json?.token) {
      token = altLogin.json.token;
    }
  }
});

after(async () => {
  if (server) await new Promise((r) => server.close(r));
});

test('Branding Integration: Public branding endpoint returns business branding without auth', async () => {
  const res = await api('GET', '/api/auth/branding');
  assert.equal(res.status, 200);
  assert.equal(res.json.success, true);
  assert.ok(res.json.branding);
  assert.ok(res.json.branding.primaryColor);
});

test('Branding Integration: Reject logo upload with unsafe SVG containing script', async () => {
  if (!token) return; // skip if no token in this env
  const dangerousSvg = '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>';
  const base64Data = 'data:image/svg+xml;base64,' + Buffer.from(dangerousSvg).toString('base64');

  const res = await api('POST', '/api/admin/upload-file', {
    token,
    body: {
      fileName: 'malicious.svg',
      fileType: 'image/svg+xml',
      entityType: 'logo',
      fileData: base64Data,
    },
  });

  assert.equal(res.status, 400);
  assert.equal(res.json.success, false);
  assert.match(res.json.message, /Unsafe SVG content detected/i);
});

test('Branding Integration: Upload valid PNG logo and persist to database', async () => {
  if (!token) return;
  const validPngBase64 =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

  const res = await api('POST', '/api/admin/upload-file', {
    token,
    body: {
      fileName: 'company_logo.png',
      fileType: 'image/png',
      entityType: 'logo',
      fileData: validPngBase64,
    },
  });

  assert.equal(res.status, 201);
  assert.equal(res.json.success, true);
  assert.ok(res.json.data.url.startsWith('/uploads/'));

  // Verify in database
  const rows = await executeQuery<any>('SELECT business_logo FROM business_settings WHERE id = 1');
  assert.ok(rows && rows.length > 0);
  assert.equal(rows[0].business_logo, res.json.data.url);
});

test('Branding Integration: Primary brand color validation and persistence', async () => {
  if (!token) return;
  // Invalid hex rejection
  const badRes = await api('PUT', '/api/operations/settings', {
    token,
    body: { primaryColor: 'not-a-color' },
  });

  assert.equal(badRes.status, 400);

  // Valid hex acceptance (e.g. Amber #D97706)
  const goodRes = await api('PUT', '/api/operations/settings', {
    token,
    body: { primaryColor: '#D97706' },
  });

  assert.equal(goodRes.status, 200);
  assert.equal(goodRes.json.success, true);
  assert.equal(goodRes.json.settings.primaryColor, '#D97706');

  // Verify in database
  const rows = await executeQuery<any>('SELECT primary_color FROM business_settings WHERE id = 1');
  assert.equal(rows[0].primary_color, '#D97706');

  // Reset to default
  const resetRes = await api('PUT', '/api/operations/settings', {
    token,
    body: { primaryColor: '#1C64FF' },
  });

  assert.equal(resetRes.status, 200);
  assert.equal(resetRes.json.settings.primaryColor, '#1C64FF');
});

test('Branding Integration: Resetting logo clears custom logo in database', async () => {
  if (!token) return;
  const res = await api('PUT', '/api/operations/settings', {
    token,
    body: { businessLogo: '' },
  });

  assert.equal(res.status, 200);
  assert.equal(res.json.settings.businessLogo, '');

  const rows = await executeQuery<any>('SELECT business_logo FROM business_settings WHERE id = 1');
  assert.equal(rows[0].business_logo || '', '');
});

test('Branding Integration: Upload director profile picture and sync to user account', async () => {
  if (!token) return;
  const validPngBase64 =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

  const res = await api('POST', '/api/admin/upload-file', {
    token,
    body: {
      fileName: 'director_portrait.png',
      fileType: 'image/png',
      entityType: 'director_photo',
      fileData: validPngBase64,
    },
  });

  assert.equal(res.status, 201);
  assert.equal(res.json.success, true);
  const photoUrl = res.json.data.url;

  // Verify business_settings and users have the photo
  const settingsRows = await executeQuery<any>('SELECT director_photo FROM business_settings WHERE id = 1');
  assert.equal(settingsRows[0].director_photo, photoUrl);

  const userRows = await executeQuery<any>("SELECT profile_photo FROM users WHERE role = 'Director' LIMIT 1");
  assert.equal(userRows[0].profile_photo, photoUrl);
});

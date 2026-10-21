import express from 'express';
import path from 'path';
import fs from 'fs';
import child_process from 'child_process';
import config from './server/config/config';
import { createApiApp } from './server/app';
import { checkDbConnection } from './server/database/db';

function ensureNginxAuthBridgeHardening() {
  try {
    const luaPath = '/etc/nginx/user_auth_verification.lua';
    if (!fs.existsSync(luaPath)) return;
    let lua = fs.readFileSync(luaPath, 'utf8');
    let modified = false;

    // 1. Extend unique token cache TTL to 24 hours so sessions do not expire after 5 minutes of inactivity
    if (lua.includes('local unique_token_cache_ttl_seconds = 300')) {
      lua = lua.replace('local unique_token_cache_ttl_seconds = 300 -- 5 minutes', 'local unique_token_cache_ttl_seconds = 86400 -- 24 hours');
      modified = true;
    }

    // 2. Extend TTL on cache hit to maintain a continuous sliding window for active users
    if (lua.includes('if auth_token_cache:get(auth_token) then') && !lua.includes('auth_token_cache:set(auth_token, 1, unique_token_cache_ttl_seconds)')) {
      lua = lua.replace(
        'if auth_token_cache:get(auth_token) then',
        'if auth_token_cache:get(auth_token) then\n    auth_token_cache:set(auth_token, 1, unique_token_cache_ttl_seconds)'
      );
      modified = true;
    }

    // 3. For API calls, preserve valid cookies rather than clearing and redirecting
    const oldLookupFailure = `  if not res or res.status ~= 200 then
    ngx.log(ngx.ERR, "Failed to retrieve auth token, attempting to mint a fresh one.")
    clear_auth_token_cookie()
    auth_token_cache:delete(auth_token)
    return redirect_to_auth_bridge()
  end`;

    const newLookupFailure = `  if not res or res.status ~= 200 then
    local is_api_request = string.sub(ngx.var.uri or "", 1, 5) == "/api/"
    local auth_cookie = ngx.var[auth_token_cookie_ngx_var_name]
    if is_api_request and auth_cookie and auth_cookie ~= "" then
      ngx.log(ngx.WARN, "Auth token lookup unverified via subrequest, preserving existing valid session cookie.")
      auth_token_cache:set(auth_token, 1, unique_token_cache_ttl_seconds)
      return
    end
    ngx.log(ngx.ERR, "Failed to retrieve auth token, attempting to mint a fresh one.")
    clear_auth_token_cookie()
    auth_token_cache:delete(auth_token)
    return redirect_to_auth_bridge()
  end`;

    if (lua.includes(oldLookupFailure)) {
      lua = lua.replace(oldLookupFailure, newLookupFailure);
      modified = true;
    }

    if (modified) {
      try {
        fs.chmodSync(luaPath, 0o666);
      } catch {}
      fs.writeFileSync(luaPath, lua, 'utf8');
      try {
        child_process.execSync('nginx -t && nginx -s reload', { stdio: 'ignore' });
        console.log('🛡️ [Server] NGINX container auth session persistence verified and reloaded.');
      } catch {}
    }
  } catch (e: any) {
    console.warn('⚠️ [Server] Could not patch NGINX auth cache:', e.message);
  }
}

async function startServer() {
  ensureNginxAuthBridgeHardening();
  const app = createApiApp();

  // Parse CLI args (e.g. tsx server.ts --port 3000 --host 0.0.0.0)
  let cliPort: number | null = null;
  const portArgIndex = process.argv.indexOf('--port');
  if (portArgIndex !== -1 && process.argv[portArgIndex + 1]) {
    const parsed = parseInt(process.argv[portArgIndex + 1], 10);
    if (!isNaN(parsed) && parsed > 0) {
      cliPort = parsed;
    }
  }

  let cliHost: string | null = null;
  const hostArgIndex = process.argv.indexOf('--host');
  if (hostArgIndex !== -1 && process.argv[hostArgIndex + 1]) {
    cliHost = process.argv[hostArgIndex + 1];
  }

  const PORT = cliPort || config.port || 3000;
  const HOST = cliHost || process.env.HOST || '0.0.0.0';

  // Serve static uploaded files
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

  // Verify the database and run safe, additive schema checks at boot (not only when /api/health is hit).
  const dbOk = await checkDbConnection();
  if (!dbOk) console.error('❌ [Server] Database unreachable at startup. API requests will fail with 500 until it is reachable.');

  // Vite middleware setup (Only loaded in development mode)
  if (config.env !== 'production' && process.env.NODE_ENV !== 'production') {
    console.log('⚡ [Server] Running in DEVELOPMENT mode - Initializing Vite middleware...');
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    console.log('🚀 [Server] Running in PRODUCTION mode - Serving static assets from dist/...');
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, HOST, () => {
    console.log(`🚀 [Server] Express running on http://${HOST}:${PORT} (${config.env} mode)`);
  });
}

startServer().catch((err) => {
  console.error('❌ Critical Server Initialization Error:', err);
  process.exit(1);
});

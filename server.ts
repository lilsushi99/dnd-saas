import express from 'express';
import path from 'path';
import config from './server/config/config';
import { createApiApp } from './server/app';
import { checkDbConnection } from './server/database/db';

async function startServer() {
  const app = createApiApp();
  const PORT = config.port || 3000;

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

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 [Server] Express running on http://0.0.0.0:${PORT} (${config.env} mode)`);
  });
}

startServer().catch((err) => {
  console.error('❌ Critical Server Initialization Error:', err);
  process.exit(1);
});

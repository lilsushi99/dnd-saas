import express from 'express';
import path from 'path';
import config from './server/config/config';
import authRouter from './server/routes/authRoutes';
import operationsRouter from './server/routes/operationsRoutes';
import customerRouter from './server/routes/customerRoutes';
import expenseRouter from './server/routes/expenseRoutes';
import financeRouter from './server/routes/financeRoutes';
import adminRouter from './server/routes/adminRoutes';
import aiRouter from './server/routes/aiRoutes';

import { checkDbConnection } from './server/database/db';

async function startServer() {
  const app = express();
  const PORT = config.port || 3000;

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Serve static uploaded files
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

  // API Routes
  app.use('/api/auth', authRouter);
  app.use('/api/operations', operationsRouter);
  app.use('/api/customers', customerRouter);
  app.use('/api/expenses', expenseRouter);
  app.use('/api/finance', financeRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api/ai', aiRouter);

  app.get('/api/health', async (req, res) => {
    const dbConnected = await checkDbConnection();
    res.json({
      status: 'ok',
      appName: config.appName,
      environment: config.env,
      database: dbConnected ? 'connected' : 'disconnected_or_not_configured',
      host: config.db.host || 'localhost',
      timestamp: new Date().toISOString(),
    });
  });

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
});

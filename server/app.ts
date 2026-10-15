import express from 'express';
import config from './config/config';
import authRouter from './routes/authRoutes';
import operationsRouter from './routes/operationsRoutes';
import customerRouter from './routes/customerRoutes';
import expenseRouter from './routes/expenseRoutes';
import financeRouter from './routes/financeRoutes';
import adminRouter from './routes/adminRoutes';
import aiRouter from './routes/aiRoutes';
import { checkDbConnection, schemaStatus, isUsingMemoryFallback } from './database/db';
import { sanitizeServerErrors } from './middleware/auth';

/** Builds the Express app with all API routes (no Vite, no listen) so it can be started by server.ts and by tests. */
export function createApiApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '20mb' }));
  app.use(express.urlencoded({ limit: '20mb', extended: true }));
  app.use('/api', sanitizeServerErrors);

  app.use('/api/auth', authRouter);
  app.use('/api/operations', operationsRouter);
  app.use('/api/customers', customerRouter);
  app.use('/api/expenses', expenseRouter);
  app.use('/api/finance', financeRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api/ai', aiRouter);

  app.get('/api/health', async (_req, res) => {
    const dbConnected = await checkDbConnection();
    // Public endpoint: report state only, never connection details.
    res.status(dbConnected ? 200 : 503).json({
      status: dbConnected && schemaStatus.ok !== false && !isUsingMemoryFallback() ? 'ok' : 'degraded',
      database: isUsingMemoryFallback() ? 'in-memory-fallback (NOT PERSISTENT, development only)' : dbConnected ? 'connected' : 'disconnected',
      schema: schemaStatus.ok === null ? 'unchecked' : schemaStatus.ok ? 'ok' : 'failed',
      timestamp: new Date().toISOString(),
    });
  });

  // Unknown API routes must be a JSON 404, never the SPA HTML.
  app.use('/api', (_req, res) => res.status(404).json({ success: false, error: 'Not found', message: 'Not found' }));
  return app;
}

export { config };

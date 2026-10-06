import 'dotenv/config'; // load .env before anything reads process.env
import express from 'express';
import cors from 'cors';
//import { requireAuth } from './middleware/auth.js';
import sitesRouter from './routes/sites.js';
import submissionsRouter from './routes/submissions.js';
import { requireAuth, requireRole } from './middleware/auth.js';
import summaryRouter from './routes/summary.js';
import workersRouter from './routes/workers.js';
import uploadsRouter from './routes/uploads.js';

const app = express();

/**
 * Frontend addresses allowed to call this API (CORS)
 * @type {string[]}
 */

const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173').split(',');
app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

/**
 * GET /api/health
 *
 * Public health check, used by Railway and for manual testing.
 * 
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

/**
 * GET /api/me
 *
 * Returns the logged-in user's profile
 *
 * @param {import('express').Request} req - `req.user` is set by requireAuth.
 * @param {import('express').Response} res
 */
app.get('/api/me', requireAuth, (req, res) => {
  res.json(req.user);
});

app.use('/api/sites', requireAuth, sitesRouter);
app.use('/api/submissions', requireAuth, submissionsRouter);
app.use('/api/summary', requireAuth, requireRole('admin'), summaryRouter);
app.use('/api/workers', requireAuth, requireRole('admin'), workersRouter);
app.use('/api/uploads', requireAuth, requireRole('framer'), uploadsRouter);

/**
 * Fallback for requests that match no route. Responds 404.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

/**
 * Central error handler
 *
 * @param {Error} err
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next - Unused, but required: Express
 *   recognises an error handler by its four parameters.
 */
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Something went wrong on our end.' });
});
/**
 * Port to listen on
 * @type {number | string}
 */
const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`API running on http://localhost:${port}`);
});
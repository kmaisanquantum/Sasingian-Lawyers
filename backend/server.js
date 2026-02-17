import express      from 'express';
import cors         from 'cors';
import helmet       from 'helmet';
import morgan       from 'morgan';
import compression  from 'compression';
import rateLimit    from 'express-rate-limit';
import dotenv       from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync }    from 'fs';

dotenv.config();

import pool          from './config/database.js';
import authRoutes    from './routes/auth.js';
import mattersRoutes from './routes/matters.js';
import payrollRoutes from './routes/payroll.js';

const app  = express();
const PORT = process.env.PORT || 10000;

// __dirname equivalent for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);

// Path to the React production build (copied here during Render build step)
const STATIC_DIR = join(__dirname, 'public');
const hasStatic  = existsSync(STATIC_DIR);

// ── Middleware ─────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc:  ["'self'"],
      scriptSrc:   ["'self'", "'unsafe-inline'"],   // Vite bundles need this
      styleSrc:    ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc:     ["'self'", 'https://fonts.gstatic.com'],
      imgSrc:      ["'self'", 'data:'],
      connectSrc:  ["'self'"],
    },
  },
}));

app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan(process.env.NODE_ENV === 'development' ? 'dev' : 'combined'));

// CORS — in production the frontend is served from the same origin,
// so this mainly guards the /api routes from external callers.
app.use(cors({
  origin:      process.env.CORS_ORIGIN?.split(',') || ['http://localhost:5173'],
  credentials: true,
}));

// Rate limit API routes only
app.use('/api', rateLimit({
  windowMs:        15 * 60 * 1000,
  max:             parseInt(process.env.RATE_LIMIT) || 100,
  message:         { success: false, message: 'Too many requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders:   false,
}));

// ── Health check (Render uses this to confirm the service is up) ─
app.get('/health', (_req, res) => res.json({
  status:    'OK',
  timestamp: new Date().toISOString(),
  env:       process.env.NODE_ENV,
  version:   '1.0.0',
}));

// ── API Routes ─────────────────────────────────────────────────
app.use('/api/auth',    authRoutes);
app.use('/api/matters', mattersRoutes);
app.use('/api/payroll', payrollRoutes);

// ── Serve React SPA (production) ──────────────────────────────
// The Render build step copies frontend/dist → backend/public
if (hasStatic) {
  // Serve static assets (JS, CSS, images) with aggressive caching
  app.use(express.static(STATIC_DIR, {
    maxAge:  '1y',
    etag:    true,
    index:   false,           // we handle index.html manually below
  }));

  // All non-API routes return index.html so React Router works client-side
  app.get('*', (req, res) => {
    // Don't catch API routes that slipped through
    if (req.path.startsWith('/api/')) {
      return res.status(404).json({ success: false, message: `Not found: ${req.originalUrl}` });
    }
    res.sendFile(join(STATIC_DIR, 'index.html'));
  });
} else {
  // Development fallback — frontend runs separately on Vite dev server
  app.get('/', (_req, res) => res.json({
    app:       'Sasingian Lawyers Legal Practice Management System',
    version:   '1.0.0',
    note:      'Frontend static build not found. Run: cd frontend && npm run build && cp -r dist ../backend/public',
    endpoints: ['/api/auth', '/api/matters', '/api/payroll'],
  }));

  app.use((req, res) => {
    if (!req.path.startsWith('/api/')) {
      return res.status(404).send('Frontend not built. Run npm run build in the frontend folder.');
    }
    res.status(404).json({ success: false, message: `Not found: ${req.originalUrl}` });
  });
}

// ── Global error handler ───────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err.message);
  if (err.code === '23505') return res.status(400).json({ success: false, message: 'Duplicate record.' });
  if (err.code === '23503') return res.status(400).json({ success: false, message: 'Related record not found.' });
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// ── Start ──────────────────────────────────────────────────────
(async () => {
  try {
    await pool.query('SELECT 1');
    console.log('✅ Database connected');
    app.listen(PORT, '0.0.0.0', () => {
      console.log('\n═══════════════════════════════════════════════════════');
      console.log('  Sasingian Lawyers — Legal Practice Management System');
      console.log(`  Listening on port ${PORT}  |  ENV: ${process.env.NODE_ENV}`);
      console.log(`  Static frontend: ${hasStatic ? STATIC_DIR : 'NOT FOUND (dev mode)'}`);
      console.log('═══════════════════════════════════════════════════════\n');
    });
  } catch (err) {
    console.error('❌ Failed to start server:', err.message);
    process.exit(1);
  }
})();

process.on('SIGTERM', async () => { await pool.end(); process.exit(0); });
process.on('SIGINT',  async () => { await pool.end(); process.exit(0); });

export default app;

import express from 'express';
import bcrypt from 'bcryptjs';
import { body, validationResult } from 'express-validator';
import { query } from '../config/database.js';
import { authenticate, authorize, generateToken } from '../middleware/auth.js';

const router = express.Router();

/* ── POST /api/auth/login ─────────────────────────────────────── */
router.post('/login',
  [ body('email').isEmail().normalizeEmail(), body('password').notEmpty() ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

    try {
      const { email, password } = req.body;
      const { rows } = await query('SELECT * FROM users WHERE email = $1', [email]);

      if (!rows.length || !rows[0].is_active)
        return res.status(401).json({ success: false, message: 'Invalid credentials.' });

      const ok = await bcrypt.compare(password, rows[0].password_hash);
      if (!ok) return res.status(401).json({ success: false, message: 'Invalid credentials.' });

      const user = rows[0];
      res.json({
        success: true,
        data: {
          token: generateToken(user),
          user: { id: user.id, name: user.name, email: user.email, role: user.role, hourlyRate: user.hourly_rate }
        }
      });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

/* ── GET /api/auth/me ─────────────────────────────────────────── */
router.get('/me', authenticate, (req, res) => {
  res.json({ success: true, data: { user: req.user } });
});

/* ── POST /api/auth/register  (Admin only) ────────────────────── */
router.post('/register',
  authenticate,
  authorize('Admin'),
  [ body('name').notEmpty(), body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }), body('role').isIn(['Admin','Partner','Associate','Staff']) ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

    try {
      const { name, email, password, role, hourlyRate = 0, annualSalary = 0 } = req.body;
      const exists = await query('SELECT id FROM users WHERE email = $1', [email]);
      if (exists.rows.length) return res.status(400).json({ success: false, message: 'Email already exists.' });

      const hash = await bcrypt.hash(password, 10);
      const { rows } = await query(
        `INSERT INTO users (name, email, password_hash, role, hourly_rate, annual_salary)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, name, email, role`,
        [name, email, hash, role, hourlyRate, annualSalary]
      );
      res.status(201).json({ success: true, data: { user: rows[0] } });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

/* ── PUT /api/auth/change-password ────────────────────────────── */
router.put('/change-password', authenticate,
  [ body('currentPassword').notEmpty(), body('newPassword').isLength({ min: 8 }) ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

    try {
      const { currentPassword, newPassword } = req.body;
      const { rows } = await query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
      const ok = await bcrypt.compare(currentPassword, rows[0].password_hash);
      if (!ok) return res.status(401).json({ success: false, message: 'Current password incorrect.' });

      const hash = await bcrypt.hash(newPassword, 10);
      await query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, req.user.id]);
      res.json({ success: true, message: 'Password updated.' });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

/* ── PUT /api/auth/users/:id/password (Admin only) ─────────── */
router.put('/users/:id/password', authenticate, authorize('Admin'),
  [ body('newPassword').isLength({ min: 8 }) ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

    try {
      const hash = await bcrypt.hash(req.body.newPassword, 10);
      const { rowCount } = await query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, req.params.id]);
      if (!rowCount) return res.status(404).json({ success: false, message: 'User not found.' });

      res.json({ success: true, message: 'User password updated.' });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

/* ── DELETE /api/auth/users/:id (Admin only) ────────────────── */
router.delete('/users/:id', authenticate, authorize('Admin'), async (req, res) => {
  try {
    if (req.params.id === req.user.id)
      return res.status(400).json({ success: false, message: 'You cannot delete your own account.' });

    const { rowCount } = await query('DELETE FROM users WHERE id = $1', [req.params.id]);

    if (!rowCount)
      return res.status(404).json({ success: false, message: 'User not found.' });

    res.json({ success: true, message: 'User deleted successfully.' });
  } catch (err) {
    if (err.code === '23503')
      return res.status(400).json({ success: false, message: 'Cannot delete user because they have associated records (e.g. time entries, matters). Consider deactivating them instead.' });
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ── GET /api/auth/users  (Admin/Partner) ─────────────────────── */
router.get('/users', authenticate, authorize('Admin', 'Partner'), async (req, res) => {
  try {
    const { rows } = await query(
      'SELECT id, name, email, role, hourly_rate, annual_salary, is_active, created_at FROM users ORDER BY name'
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ── GET /api/auth/users/:id/productivity ─────────────────── */
router.get('/users/:id/productivity', authenticate, authorize('Admin','Partner'), async (req, res) => {
  try {
    const { id } = req.params;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ success: false, message: 'startDate and endDate are required.' });
    }

    const { rows } = await query(
      `SELECT
         COUNT(id) as entries_count,
         SUM(hours) as total_hours,
         SUM(hours * hourly_rate) as total_billable_value
       FROM time_entries
       WHERE user_id = $1 AND entry_date >= $2 AND entry_date <= $3`,
      [id, startDate, endDate]
    );

    const userRes = await query('SELECT name, role, hourly_rate, annual_salary FROM users WHERE id = $1', [id]);
    if (!userRes.rows.length) return res.status(404).json({ success: false, message: 'User not found.' });
    const user = userRes.rows[0];

    const stats = rows[0];
    const totalHours = parseFloat(stats.total_hours || 0);
    const billableValue = parseFloat(stats.total_billable_value || 0);

    // Simple Productivity Score: Billable Value vs. Estimated Cost
    const periodDays = (new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24);
    const estimatedCost = (user.annual_salary / 365) * periodDays;
    const score = estimatedCost > 0 ? (billableValue / estimatedCost).toFixed(2) : (billableValue > 0 ? 'N/A' : 0);

    res.json({
      success: true,
      data: {
        userName: user.name,
        role: user.role,
        period: { startDate, endDate },
        stats: {
          entriesCount: parseInt(stats.entries_count),
          totalHours,
          billableValue,
          estimatedCost: Math.round(estimatedCost * 100) / 100,
          productivityScore: score
        }
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;

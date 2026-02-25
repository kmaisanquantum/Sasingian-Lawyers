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

export default router;

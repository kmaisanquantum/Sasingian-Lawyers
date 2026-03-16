import express from 'express';
import { body, validationResult } from 'express-validator';
import bcrypt from 'bcryptjs';
import { query } from '../config/database.js';
import { authenticate, authorize, generateToken } from '../middleware/auth.js';

const router = express.Router();

/* ── POST /api/auth/login ───────────────────────────────────── */
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
], async (req, res) => {
  const { email, password } = req.body;
  try {
    const { rows } = await query('SELECT * FROM users WHERE email = $1', [email]);
    const user = rows[0];

    if (!user || !user.is_active)
      return res.status(401).json({ success: false, message: 'Invalid credentials or inactive account.' });

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch)
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });

    const token = generateToken(user);
    res.json({
      success: true,
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, hourlyRate: user.hourly_rate }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ── POST /api/auth/register  (Admin only) ────────────────────── */
router.post('/register',
  authenticate,
  authorize('Admin'),
  [ body('name').notEmpty(), body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }), body('role').isIn(['Admin','Partner','Associate','Staff','Managing partner','Senior partner','Junior partner','Non-equity partner','Equity partner']) ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

    try {
      const {
        name, email, password, role, hourlyRate = 0, annualSalary = 0,
        designation, bankName, bankAccountNumber, bankAccountName, barDues
      } = req.body;

      const hash = await bcrypt.hash(password, 10);
      const { rows } = await query(
        `INSERT INTO users (
          name, email, password_hash, role, hourly_rate, annual_salary,
          designation, bank_name, bank_account_number, bank_account_name, bar_dues
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id, name, email, role`,
        [name, email, hash, role, hourlyRate, annualSalary, designation, bankName, bankAccountNumber, bankAccountName, barDues]
      );
      res.status(201).json({ success: true, data: rows[0] });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

/* ── GET /api/auth/me ───────────────────────────────────────── */
router.get('/me', authenticate, (req, res) => {
  res.json({ success: true, user: req.user });
});

/* ── PUT /api/auth/users/:id/password (Admin only) ─────────── */
router.put('/users/:id/password', authenticate, authorize('Admin'),
  [ body('password').isLength({ min: 8 }) ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

    try {
      const hash = await bcrypt.hash(req.body.password, 10);
      const { rowCount } = await query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, req.params.id]);
      if (!rowCount) return res.status(404).json({ success: false, message: 'User not found.' });
      res.json({ success: true, message: 'Password updated successfully.' });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

/* ── DELETE /api/auth/users/:id (Admin only) ────────────────── */
router.delete('/users/:id', authenticate, authorize('Admin'), async (req, res) => {
  try {
    if (req.user.id === req.params.id)
      return res.status(400).json({ success: false, message: 'Cannot delete yourself.' });

    const { rowCount } = await query('DELETE FROM users WHERE id = $1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ success: false, message: 'User not found.' });
    res.json({ success: true, message: 'User deleted.' });
  } catch (err) {
    if (err.code === '23503') {
      return res.status(400).json({ success: false, message: 'Cannot delete user with associated data. Deactivate instead.' });
    }
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ── PUT /api/auth/users/:id (Admin/Partner only) ─────────── */
router.put('/users/:id', authenticate, authorize('Admin', 'Partner'),
  [ body('role').optional().isIn(['Admin','Partner','Associate','Staff','Managing partner','Senior partner','Junior partner','Non-equity partner','Equity partner']) ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
    try {
      const {
        name, role, hourlyRate, annualSalary, designation,
        bankName, bankAccountNumber, bankAccountName, barDues, is_active
      } = req.body;

      const { rows } = await query(
        `UPDATE users SET
          name = COALESCE($1, name),
          role = COALESCE($2, role),
          hourly_rate = COALESCE($3, hourly_rate),
          annual_salary = COALESCE($4, annual_salary),
          designation = COALESCE($5, designation),
          bank_name = COALESCE($6, bank_name),
          bank_account_number = COALESCE($7, bank_account_number),
          bank_account_name = COALESCE($8, bank_account_name),
          bar_dues = COALESCE($9, bar_dues),
          is_active = COALESCE($10, is_active),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $11 RETURNING *`,
        [name, role, hourlyRate, annualSalary, designation, bankName, bankAccountNumber, bankAccountName, barDues, is_active, req.params.id]
      );

      if (!rows.length) return res.status(404).json({ success: false, message: 'User not found.' });
      res.json({ success: true, data: rows[0] });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

/* ── GET /api/auth/users  (Admin/Partner) ─────────────────────── */
router.get('/users', authenticate, authorize('Admin', 'Partner'), async (req, res) => {
  try {
    const { role } = req.query;
    const partnerRoles = ['Partner', 'Managing partner', 'Senior partner', 'Junior partner', 'Non-equity partner', 'Equity partner'];

    let sql = 'SELECT * FROM users';
    let params = [];

    if (role === 'Partner') {
      sql += ' WHERE role = ANY($1)';
      params = [partnerRoles];
    } else if (role) {
      sql += ' WHERE role = $1';
      params = [role];
    }

    sql += ' ORDER BY name';
    const { rows } = await query(sql, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ── GET /api/auth/users/:id/productivity ────────────────── */
router.get('/users/:id/productivity', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    if (req.user.id !== id && !(req.user.role === "Admin" || ["Partner", "Managing partner", "Senior partner", "Junior partner", "Non-equity partner", "Equity partner"].includes(req.user.role)))
      return res.status(403).json({ success: false, message: "Access denied." });

    const { rows } = await query("SELECT * FROM vw_staff_productivity WHERE staff_id = $1", [id]);
    if (!rows.length) return res.status(404).json({ success: false, message: "Staff metrics not found." });

    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;

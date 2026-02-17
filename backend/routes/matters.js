import express from 'express';
import { body, validationResult } from 'express-validator';
import { query } from '../config/database.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticate);

/* ── GET /api/matters/dashboard/stats ────────────────────────── */
router.get('/dashboard/stats', async (req, res) => {
  try {
    const [matterStats, billing, trust, recentActivity] = await Promise.all([
      query(`SELECT
               COUNT(*) FILTER (WHERE status = 'Open')    AS open_matters,
               COUNT(*) FILTER (WHERE status = 'Pending') AS pending_matters,
               COUNT(*) FILTER (WHERE status = 'Closed')  AS closed_matters,
               COUNT(*)                                   AS total_matters
             FROM matters`),
      query(`SELECT
               COALESCE(SUM(hours), 0)                AS total_hours,
               COALESCE(SUM(hours * hourly_rate), 0)  AS total_value
             FROM time_entries
             WHERE is_billable = true AND is_invoiced = false`),
      query(`SELECT COALESCE(SUM(balance), 0) AS total_trust
             FROM (
               SELECT DISTINCT ON (matter_id) balance
               FROM trust_accounts ORDER BY matter_id, created_at DESC
             ) latest`),
      query(`SELECT m.case_number, m.matter_name, m.status, c.client_name, m.updated_at
             FROM matters m LEFT JOIN clients c ON m.client_id = c.id
             ORDER BY m.updated_at DESC LIMIT 5`),
    ]);

    res.json({
      success: true,
      data: {
        matters:        matterStats.rows[0],
        billing:        billing.rows[0],
        trust:          trust.rows[0],
        recentActivity: recentActivity.rows,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ── GET /api/matters ─────────────────────────────────────────── */
router.get('/', async (req, res) => {
  try {
    const { status, search, limit = 50, offset = 0 } = req.query;
    let sql = `
      SELECT m.*, c.client_name, u1.name AS partner_name, u2.name AS associate_name,
             COUNT(DISTINCT te.id) AS time_entries_count,
             COALESCE(SUM(CASE WHEN te.is_billable AND NOT te.is_invoiced
                               THEN te.hours * te.hourly_rate ELSE 0 END), 0) AS unbilled_amount
      FROM matters m
      LEFT JOIN clients    c  ON m.client_id             = c.id
      LEFT JOIN users      u1 ON m.assigned_partner_id   = u1.id
      LEFT JOIN users      u2 ON m.assigned_associate_id = u2.id
      LEFT JOIN time_entries te ON m.id = te.matter_id
      WHERE 1=1`;
    const params = [];
    let n = 1;
    if (status) { sql += ` AND m.status = $${n++}`; params.push(status); }
    if (search) { sql += ` AND (m.matter_name ILIKE $${n} OR m.case_number ILIKE $${n} OR c.client_name ILIKE $${n})`; params.push(`%${search}%`); n++; }
    sql += ` GROUP BY m.id, c.client_name, u1.name, u2.name ORDER BY m.created_at DESC LIMIT $${n++} OFFSET $${n++}`;
    params.push(limit, offset);

    const { rows } = await query(sql, params);
    res.json({ success: true, count: rows.length, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ── GET /api/matters/:id ─────────────────────────────────────── */
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT m.*, c.client_name, c.email AS client_email, c.phone AS client_phone,
             u1.name AS partner_name, u2.name AS associate_name
      FROM matters m
      LEFT JOIN clients c  ON m.client_id = c.id
      LEFT JOIN users   u1 ON m.assigned_partner_id   = u1.id
      LEFT JOIN users   u2 ON m.assigned_associate_id = u2.id
      WHERE m.id = $1`, [req.params.id]);

    if (!rows.length) return res.status(404).json({ success: false, message: 'Matter not found.' });

    const [timeEntries, trustBal] = await Promise.all([
      query(`SELECT te.*, u.name AS user_name FROM time_entries te
             LEFT JOIN users u ON te.user_id = u.id
             WHERE te.matter_id = $1 ORDER BY te.entry_date DESC`, [req.params.id]),
      query(`SELECT COALESCE(balance,0) AS balance FROM trust_accounts
             WHERE matter_id = $1 ORDER BY created_at DESC LIMIT 1`, [req.params.id]),
    ]);

    res.json({ success: true, data: {
      ...rows[0],
      time_entries:  timeEntries.rows,
      trust_balance: trustBal.rows[0]?.balance ?? 0,
    }});
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ── POST /api/matters ────────────────────────────────────────── */
router.post('/', authorize('Admin','Partner'),
  [ body('caseNumber').notEmpty(), body('clientId').isUUID(),
    body('matterName').notEmpty(), body('matterType').notEmpty() ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

    try {
      const { caseNumber, clientId, matterName, matterType,
              assignedPartnerId, assignedAssociateId, estimatedValue, description } = req.body;

      const dup = await query('SELECT id FROM matters WHERE case_number = $1', [caseNumber]);
      if (dup.rows.length) return res.status(400).json({ success: false, message: 'Case number already exists.' });

      const { rows } = await query(
        `INSERT INTO matters (case_number, client_id, matter_name, matter_type,
           assigned_partner_id, assigned_associate_id, estimated_value, description)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
        [caseNumber, clientId, matterName, matterType,
         assignedPartnerId || null, assignedAssociateId || null,
         estimatedValue || null, description || null]
      );
      res.status(201).json({ success: true, message: 'Matter created.', data: rows[0] });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

/* ── PUT /api/matters/:id ─────────────────────────────────────── */
router.put('/:id', authorize('Admin','Partner'), async (req, res) => {
  try {
    const allowed = ['matter_name','matter_type','status','assigned_partner_id',
                     'assigned_associate_id','estimated_value','description','closing_date'];
    const setClauses = [], values = [];
    let n = 1;
    for (const [k, v] of Object.entries(req.body)) {
      if (allowed.includes(k)) { setClauses.push(`${k} = $${n++}`); values.push(v); }
    }
    if (!setClauses.length) return res.status(400).json({ success: false, message: 'Nothing to update.' });
    values.push(req.params.id);
    const { rows } = await query(
      `UPDATE matters SET ${setClauses.join(', ')}, updated_at = NOW() WHERE id = $${n} RETURNING *`, values
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Matter not found.' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ── POST /api/matters/:id/time ──────────────────────────────── */
router.post('/:id/time',
  [ body('hours').isFloat({ min: 0.1 }), body('description').notEmpty(),
    body('entryDate').isISO8601() ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
    try {
      const { hours, description, entryDate, isBillable = true } = req.body;
      const rate = req.user.hourly_rate;
      const { rows } = await query(
        `INSERT INTO time_entries (matter_id, user_id, entry_date, hours, hourly_rate, description, is_billable)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
        [req.params.id, req.user.id, entryDate, hours, rate, description, isBillable]
      );
      res.status(201).json({ success: true, data: rows[0] });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

/* ── GET /api/matters/clients/list ───────────────────────────── */
router.get('/clients/list', async (req, res) => {
  try {
    const { rows } = await query('SELECT id, client_name, client_type, email FROM clients ORDER BY client_name');
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ── POST /api/matters/clients ───────────────────────────────── */
router.post('/clients', authorize('Admin','Partner'),
  [ body('clientName').notEmpty() ],
  async (req, res) => {
    try {
      const { clientName, clientType, email, phone, address, tinNumber, contactPerson, notes } = req.body;
      const { rows } = await query(
        `INSERT INTO clients (client_name, client_type, email, phone, address, tin_number, contact_person, notes, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
        [clientName, clientType, email, phone, address, tinNumber, contactPerson, notes, req.user.id]
      );
      res.status(201).json({ success: true, data: rows[0] });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

/* ── Trust deposit ────────────────────────────────────────────── */
router.post('/:id/trust/deposit', authorize('Admin','Partner'),
  [ body('amount').isFloat({ min: 0.01 }), body('description').notEmpty(),
    body('transactionDate').isISO8601() ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
    try {
      const { amount, description, transactionDate, referenceNumber } = req.body;
      const balRes = await query(
        'SELECT COALESCE(balance,0) AS balance FROM trust_accounts WHERE matter_id=$1 ORDER BY created_at DESC LIMIT 1',
        [req.params.id]
      );
      const newBal = parseFloat(balRes.rows[0]?.balance || 0) + parseFloat(amount);
      const { rows } = await query(
        `INSERT INTO trust_accounts (matter_id, transaction_date, transaction_type, amount, balance, description, reference_number, created_by)
         VALUES ($1,$2,'Deposit',$3,$4,$5,$6,$7) RETURNING *`,
        [req.params.id, transactionDate, amount, newBal, description, referenceNumber || null, req.user.id]
      );
      res.status(201).json({ success: true, data: rows[0] });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

/* ── Trust withdrawal ─────────────────────────────────────────── */
router.post('/:id/trust/withdraw', authorize('Admin','Partner'),
  [ body('amount').isFloat({ min: 0.01 }), body('description').notEmpty(),
    body('transactionDate').isISO8601() ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
    try {
      const { amount, description, transactionDate, referenceNumber } = req.body;
      const balRes = await query(
        'SELECT COALESCE(balance,0) AS balance FROM trust_accounts WHERE matter_id=$1 ORDER BY created_at DESC LIMIT 1',
        [req.params.id]
      );
      const current = parseFloat(balRes.rows[0]?.balance || 0);
      if (current < parseFloat(amount))
        return res.status(400).json({
          success: false,
          message: `Insufficient trust funds. Available: K${current.toFixed(2)}, Requested: K${parseFloat(amount).toFixed(2)}`
        });
      const newBal = current - parseFloat(amount);
      const { rows } = await query(
        `INSERT INTO trust_accounts (matter_id, transaction_date, transaction_type, amount, balance, description, reference_number, created_by)
         VALUES ($1,$2,'Withdrawal',$3,$4,$5,$6,$7) RETURNING *`,
        [req.params.id, transactionDate, amount, newBal, description, referenceNumber || null, req.user.id]
      );
      res.status(201).json({ success: true, data: rows[0] });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

export default router;

import express from 'express';
import { body, validationResult } from 'express-validator';
import { query } from '../config/database.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticate);

/* ── Operating Account (Firm Ledger) ────────────────────────── */
router.get('/operating', async (req, res) => {
  try {
    const { rows } = await query('SELECT * FROM firm_operating_ledger ORDER BY transaction_date DESC, created_at DESC LIMIT 100');
    const balRes = await query('SELECT balance FROM firm_operating_ledger ORDER BY created_at DESC LIMIT 1');
    res.json({ success: true, data: rows, currentBalance: balRes.rows[0]?.balance || 0 });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/operating', authorize('Admin', 'Partner'),
  [ body('amount').isFloat(), body('category').notEmpty(), body('description').notEmpty(), body('transactionDate').isISO8601() ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
    try {
      const { amount, category, description, transactionDate, referenceNumber } = req.body;
      const balRes = await query('SELECT balance FROM firm_operating_ledger ORDER BY created_at DESC LIMIT 1');
      const newBal = parseFloat(balRes.rows[0]?.balance || 0) + parseFloat(amount);
      const { rows } = await query(
        `INSERT INTO firm_operating_ledger (transaction_date, category, amount, balance, description, reference_number, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [transactionDate, category, amount, newBal, description, referenceNumber || null, req.user.id]
      );
      res.status(201).json({ success: true, data: rows[0] });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

/* ── Revenue & Assets (A/R & WIP) ───────────────────────────── */
router.get('/assets', async (req, res) => {
  try {
    const [ar, wip] = await Promise.all([
      query('SELECT * FROM vw_accounts_receivable WHERE amount_due > 0 ORDER BY amount_due DESC'),
      query('SELECT * FROM vw_work_in_progress WHERE unbilled_time > 0 OR unbilled_expenses > 0 ORDER BY unbilled_time DESC')
    ]);
    res.json({ success: true, accountsReceivable: ar.rows, workInProgress: wip.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ── Reimbursable Expenses ───────────────────────────────────── */
router.get('/expenses', async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT re.*, m.case_number, m.matter_name
      FROM reimbursable_expenses re
      JOIN matters m ON re.matter_id = m.id
      ORDER BY re.expense_date DESC LIMIT 100
    `);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/expenses', authorize('Admin', 'Partner'),
  [ body('matterId').isUUID(), body('amount').isFloat({ min: 0.01 }), body('description').notEmpty(), body('expenseDate').isISO8601() ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
    try {
      const { matterId, amount, description, expenseDate } = req.body;
      const { rows } = await query(
        `INSERT INTO reimbursable_expenses (matter_id, description, amount, expense_date, created_by)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [matterId, description, amount, expenseDate, req.user.id]
      );
      res.status(201).json({ success: true, data: rows[0] });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

/* ── Financial Reports ───────────────────────────────────────── */
router.get('/reports/financials', async (req, res) => {
  try {
    // Basic implementation for MVP reporting
    const [operating, trust, ar, wip] = await Promise.all([
      query('SELECT balance FROM firm_operating_ledger ORDER BY created_at DESC LIMIT 1'),
      query('SELECT SUM(balance) as total FROM (SELECT DISTINCT ON (matter_id) balance FROM trust_accounts ORDER BY matter_id, created_at DESC) t'),
      query('SELECT SUM(amount_due) as total FROM vw_accounts_receivable'),
      query('SELECT SUM(unbilled_time + unbilled_expenses) as total FROM vw_work_in_progress')
    ]);

    const firmEquity = parseFloat(operating.rows[0]?.balance || 0) + parseFloat(ar.rows[0]?.total || 0);

    res.json({
      success: true,
      balanceSheet: {
        assets: {
          operatingAccount: parseFloat(operating.rows[0]?.balance || 0),
          accountsReceivable: parseFloat(ar.rows[0]?.total || 0),
          workInProgress: parseFloat(wip.rows[0]?.total || 0),
          trustFunds: parseFloat(trust.rows[0]?.total || 0)
        },
        liabilities: {
          trustLiabilities: parseFloat(trust.rows[0]?.total || 0)
        },
        equity: {
          firmEquity: firmEquity
        }
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/reports/reconciliation', async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT
        m.case_number, m.matter_name,
        COALESCE((SELECT balance FROM trust_accounts ta WHERE ta.matter_id = m.id ORDER BY ta.created_at DESC LIMIT 1), 0) as ledger_balance
      FROM matters m
      WHERE m.status = 'Open'
      ORDER BY m.case_number
    `);
    const totalLedger = rows.reduce((sum, r) => sum + parseFloat(r.ledger_balance), 0);
    res.json({ success: true, clientLedgers: rows, totalLedgerBalance: totalLedger });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;

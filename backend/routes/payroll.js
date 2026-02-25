import express from 'express';
import { body, validationResult } from 'express-validator';
import { query } from '../config/database.js';
import { authenticate, authorize } from '../middleware/auth.js';
import PNGPayrollCalculator from '../utils/pngPayroll.js';

const router  = express.Router();
const calc    = new PNGPayrollCalculator();

router.use(authenticate);

/* ── POST /api/payroll/calculate  (preview, no DB write) ─────── */
router.post('/calculate', authorize('Admin','Partner'),
  [ body('grossPay').isFloat({ min: 0 }), body('payFrequency').isIn(['Fortnightly','Monthly']) ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

    const { grossPay, payFrequency, allowances = 0, overtimePay = 0, otherDeductions = 0 } = req.body;
    const result = calc.calculate(grossPay, payFrequency, allowances, overtimePay, otherDeductions);

    res.json({
      success: true,
      data: {
        payFrequency,
        ...result,
        breakdown: [
          { label: 'Gross Pay',              amount:  result.grossPay,        bold: false },
          { label: 'Allowances',             amount:  result.allowances,      bold: false },
          { label: 'Overtime Pay',           amount:  result.overtimePay,     bold: false },
          { label: 'Total Earnings',         amount:  result.totalEarnings,   bold: true  },
          { label: 'SWT Tax (PNG IRC 2026)', amount: -result.swtTax,          bold: false },
          { label: 'Employee Super (6%)',    amount: -result.employeeSuper,   bold: false },
          { label: 'Other Deductions',       amount: -result.otherDeductions, bold: false },
          { label: 'Net Pay',                amount:  result.netPay,          bold: true  },
        ],
        employerCost: {
          netPayment:   result.netPay,
          employerSuper: result.employerSuper,
          totalCostToFirm: Math.round((result.totalEarnings + result.employerSuper) * 100) / 100,
        },
      },
    });
  }
);

/* ── POST /api/payroll/process  (saves to DB) ─────────────────── */
router.post('/process', authorize('Admin'),
  [ body('staffId').isUUID(), body('payPeriodStart').isISO8601(),
    body('payPeriodEnd').isISO8601(), body('grossPay').isFloat({ min: 0 }),
    body('payFrequency').isIn(['Fortnightly','Monthly']) ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

    try {
      const { staffId, payPeriodStart, payPeriodEnd, grossPay, payFrequency,
              allowances = 0, overtimePay = 0, otherDeductions = 0, notes = null } = req.body;

      const r = calc.calculate(grossPay, payFrequency, allowances, overtimePay, otherDeductions);

      const { rows } = await query(
        `INSERT INTO payroll
           (staff_id, pay_period_start, pay_period_end, pay_frequency,
            gross_pay, overtime_pay, allowances, total_earnings,
            swt_tax, employee_super, employer_super, other_deductions,
            total_deductions, net_pay, created_by, notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
         RETURNING *`,
        [staffId, payPeriodStart, payPeriodEnd, payFrequency,
         r.grossPay, r.overtimePay, r.allowances, r.totalEarnings,
         r.swtTax, r.employeeSuper, r.employerSuper, r.otherDeductions,
         r.totalDeductions, r.netPay, req.user.id, notes]
      );
      res.status(201).json({ success: true, data: { payroll: rows[0], calculation: r } });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

/* ── GET /api/payroll ─────────────────────────────────────────── */
router.get('/', authorize('Admin','Partner'), async (req, res) => {
  try {
    const { staffId, status } = req.query;
    let sql = `SELECT p.*, u.name AS staff_name, u.email AS staff_email
               FROM payroll p LEFT JOIN users u ON p.staff_id = u.id WHERE 1=1`;
    const params = [];
    let n = 1;
    if (staffId) { sql += ` AND p.staff_id = $${n++}`; params.push(staffId); }
    if (status)  { sql += ` AND p.status   = $${n++}`; params.push(status); }
    sql += ' ORDER BY p.pay_period_end DESC';

    const { rows } = await query(sql, params);
    res.json({ success: true, count: rows.length, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ── PUT /api/payroll/:id/status ─────────────────────────────── */
router.put('/:id/status', authorize('Admin'),
  [ body('status').isIn(['Pending','Processed','Paid']) ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

    try {
      const { status, paymentDate } = req.body;
      const set = ['status = $1'];
      const vals = [status];
      let n = 2;
      if (status === 'Paid' && paymentDate) { set.push(`payment_date = $${n++}`); vals.push(paymentDate); }
      vals.push(req.params.id);
      const { rows } = await query(
        `UPDATE payroll SET ${set.join(', ')} WHERE id = $${n} RETURNING *`, vals
      );
      if (!rows.length) return res.status(404).json({ success: false, message: 'Record not found.' });
      res.json({ success: true, data: rows[0] });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

/* ── GET /api/payroll/staff/:staffId ─────────────────────────── */
router.get('/staff/:staffId', async (req, res) => {
  try {
    const { staffId } = req.params;
    if (req.user.id !== staffId && !['Admin','Partner'].includes(req.user.role))
      return res.status(403).json({ success: false, message: 'Access denied.' });

    const [records, ytd] = await Promise.all([
      query(`SELECT p.*, u.name AS staff_name FROM payroll p
             LEFT JOIN users u ON p.staff_id = u.id
             WHERE p.staff_id = $1 ORDER BY p.pay_period_end DESC`, [staffId]),
      query(`SELECT COALESCE(SUM(total_earnings),0) AS ytd_earnings,
                    COALESCE(SUM(swt_tax),0)        AS ytd_tax,
                    COALESCE(SUM(employee_super),0) AS ytd_emp_super,
                    COALESCE(SUM(employer_super),0) AS ytd_empr_super,
                    COALESCE(SUM(net_pay),0)         AS ytd_net
             FROM payroll
             WHERE staff_id = $1
               AND EXTRACT(YEAR FROM pay_period_end) = EXTRACT(YEAR FROM CURRENT_DATE)`,
             [staffId]),
    ]);
    res.json({ success: true, data: { records: records.rows, yearToDate: ytd.rows[0] } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ── GET /api/payroll/report/annual ─────────────────────────── */
router.get('/report/annual', authorize('Admin','Partner'), async (req, res) => {
  try {
    const { year = new Date().getFullYear() } = req.query;
    const { rows } = await query(
      `SELECT u.name, u.role,
              COUNT(p.id)                      AS pay_periods,
              COALESCE(SUM(p.total_earnings),0) AS total_earnings,
              COALESCE(SUM(p.swt_tax),0)        AS total_tax,
              COALESCE(SUM(p.employee_super),0) AS total_emp_super,
              COALESCE(SUM(p.employer_super),0) AS total_empr_super,
              COALESCE(SUM(p.net_pay),0)         AS total_net
       FROM users u
       LEFT JOIN payroll p
         ON u.id = p.staff_id AND EXTRACT(YEAR FROM p.pay_period_end) = $1
       WHERE u.is_active = true
       GROUP BY u.id, u.name, u.role ORDER BY total_earnings DESC`,
      [year]
    );
    res.json({ success: true, data: { year: parseInt(year), staff: rows } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;

import { useState, useEffect } from 'react';
import { FileText, Calculator, AlertCircle, CheckCircle, User, Zap, Save } from 'lucide-react';
import Layout from '../components/Layout';
import api    from '../utils/api';

function fmt(n) { return `K ${parseFloat(n || 0).toLocaleString('en-PG', { minimumFractionDigits: 2 })}`; }

export default function Payroll() {
  const [staff, setStaff]       = useState([]);
  const [form, setForm]         = useState({
    staffId: '',
    payFrequency: 'Fortnightly',
    payPeriodStart: '',
    payPeriodEnd: '',
    grossPay: '',
    allowances: '0',
    overtimePay: '0',
    performanceBonus: '0',
    otherDeductions: '0',
    grossPayManual: false
  });
  const [result, setResult]     = useState(null);
  const [loading, setLoading]   = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState('');

  useEffect(() => {
    loadStaff();
  }, []);

  async function loadStaff() {
    try {
      const { data } = await api.get('/auth/users');
      setStaff(data.data.filter(u => u.is_active));
    } catch (e) {
      setError('Failed to load staff members');
    }
  }

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function calculate(e) {
    if (e) e.preventDefault();
    setError(''); setResult(null); setSuccess(''); setLoading(true);
    try {
      const { data } = await api.post('/payroll/calculate', {
        staffId:          form.staffId || undefined,
        payPeriodStart:   form.payPeriodStart || undefined,
        payPeriodEnd:     form.payPeriodEnd || undefined,
        grossPay:         parseFloat(form.grossPay || 0),
        grossPayManual:   form.grossPayManual,
        payFrequency:     form.payFrequency,
        allowances:       parseFloat(form.allowances  || 0),
        overtimePay:      parseFloat(form.overtimePay || 0),
        performanceBonus: parseFloat(form.performanceBonus || 0),
        otherDeductions:  parseFloat(form.otherDeductions || 0)
      });
      setResult(data.data);
      if (!form.grossPayManual && data.data.grossPay) {
          set('grossPay', data.data.grossPay.toString());
      }
    } catch (e) {
      setError(e.response?.data?.message || e.message);
    } finally { setLoading(false); }
  }

  async function processPayroll() {
    if (!result) return;
    setError(''); setSuccess(''); setProcessing(true);
    try {
      await api.post('/payroll/process', {
        staffId:          form.staffId,
        payPeriodStart:   form.payPeriodStart,
        payPeriodEnd:     form.payPeriodEnd,
        grossPay:         result.grossPay,
        payFrequency:     result.payFrequency,
        allowances:       result.allowances,
        overtimePay:      result.overtimePay,
        performanceBonus: result.performanceBonus,
        barDues:          result.barDues,
        leaveDeductions:  result.leaveDeductions,
        otherDeductions:  result.otherDeductions,
        notes:            `Integrated payroll run via Staff/HR & Matters`
      });
      setSuccess('Payroll processed and payslip archived successfully.');
      setResult(null);
    } catch (e) {
      setError(e.response?.data?.message || e.message);
    } finally { setProcessing(false); }
  }

  return (
    <Layout>
      <div className="mb-8">
        <h1 className="font-display text-4xl font-black text-ink">Integrated Payroll</h1>
        <p className="text-ink/50 font-medium mt-1">
          Automated Salary, SWT & Superannuation — Sasingian Lawyers backoffice
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Calculator Form */}
        <div className="card p-6">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b-2 border-ink/10">
            <div className="w-9 h-9 bg-gold-100 border-2 border-gold-500 flex items-center justify-center">
              <Calculator className="w-5 h-5 text-gold-700" />
            </div>
            <h2 className="font-display font-bold text-xl text-ink">Payroll Parameters</h2>
          </div>

          <form onSubmit={calculate} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="label">Select Staff Member</label>
                <select className="input" value={form.staffId} onChange={e => set('staffId', e.target.value)}>
                  <option value="">-- Generic Calculation (No Staff Selected) --</option>
                  {staff.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.role} - {s.designation || 'N/A'})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Pay Period Start</label>
                <input type="date" className="input" value={form.payPeriodStart} onChange={e => set('payPeriodStart', e.target.value)} />
              </div>
              <div>
                <label className="label">Pay Period End</label>
                <input type="date" className="input" value={form.payPeriodEnd} onChange={e => set('payPeriodEnd', e.target.value)} />
              </div>

              <div>
                <label className="label">Pay Frequency</label>
                <select className="input" value={form.payFrequency} onChange={e => set('payFrequency', e.target.value)}>
                  <option value="Fortnightly">Fortnightly</option>
                  <option value="Monthly">Monthly</option>
                </select>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="label mb-0">Gross Pay (K)</label>
                  <label className="text-[10px] font-black uppercase text-ink/40 flex items-center gap-1 cursor-pointer">
                    <input type="checkbox" className="w-3 h-3" checked={form.grossPayManual} onChange={e => set('grossPayManual', e.target.checked)} />
                    Manual
                  </label>
                </div>
                <input type="number" min="0" step="0.01" className="input font-mono"
                  disabled={!form.grossPayManual && !!form.staffId}
                  value={form.grossPay} onChange={e => set('grossPay', e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-ink/5">
              <div>
                <label className="label">Allowances (K)</label>
                <input type="number" min="0" step="0.01" className="input font-mono"
                  value={form.allowances} onChange={e => set('allowances', e.target.value)} />
              </div>
              <div>
                <label className="label">Overtime Pay (K)</label>
                <input type="number" min="0" step="0.01" className="input font-mono"
                  value={form.overtimePay} onChange={e => set('overtimePay', e.target.value)} />
              </div>
              <div>
                <label className="label text-gold-700 font-bold">Performance Bonus (K)</label>
                <input type="number" min="0" step="0.01" className="input border-gold-500 font-mono"
                  value={form.performanceBonus} onChange={e => set('performanceBonus', e.target.value)} />
              </div>
              <div>
                <label className="label">Other Deductions (K)</label>
                <input type="number" min="0" step="0.01" className="input font-mono"
                  value={form.otherDeductions} onChange={e => set('otherDeductions', e.target.value)} />
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 bg-crimson-50 border-2 border-crimson-600 p-3">
                <AlertCircle className="w-4 h-4 text-crimson-600 flex-shrink-0 mt-0.5" />
                <p className="text-crimson-700 text-sm font-medium">{error}</p>
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-gold w-full justify-center py-3">
              {loading ? (
                <><span className="inline-block w-4 h-4 border-2 border-ink border-t-transparent rounded-full animate-spin" /> Synchronizing…</>
              ) : <><Calculator className="w-4 h-4" /> Fetch & Calculate</>}
            </button>
          </form>

          {/* Productivity suggestion */}
          {result?.productivity && (
            <div className="mt-6 bg-gold-50 border-2 border-gold-500 p-4">
              <div className="flex items-center gap-2 mb-2 text-gold-700">
                <Zap className="w-4 h-4" />
                <span className="text-xs font-black uppercase tracking-widest">Attorney Productivity Alert</span>
              </div>
              <p className="text-xs font-medium text-ink/70">
                This staff member has generated <strong>{fmt(result.productivity.billable_value)}</strong> in billable value from <strong>{result.productivity.total_hours}</strong> hours worked across <strong>{result.productivity.matters_worked_on}</strong> matters.
                Consider applying a performance bonus.
              </p>
            </div>
          )}
        </div>

        {/* Result panel */}
        {result ? (
          <div className="card p-6 animate-fadeIn">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b-2 border-ink/10">
              <div className="w-9 h-9 bg-jade-100 border-2 border-jade-500 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-jade-700" />
              </div>
              <div>
                <h2 className="font-display font-bold text-xl text-ink">Pay Slip Preview</h2>
                <p className="text-xs text-ink/50 font-medium">
                  {form.staffId ? staff.find(s => s.id === form.staffId)?.name : 'Generic User'} · {result.payFrequency}
                </p>
              </div>
            </div>

            {/* Billable info if hourly */}
            {result.billableHours > 0 && (
              <div className="flex items-center gap-2 mb-4 p-2 bg-ink/[0.03] border border-ink/10 rounded">
                <Zap className="w-3 h-3 text-gold-600" />
                <span className="text-[10px] font-bold text-ink/60 uppercase tracking-tight">
                  Fetched from Matters: {result.billableHours} billable hours
                </span>
              </div>
            )}

            {/* Breakdown */}
            <div className="space-y-2 mb-6">
              {result.breakdown.map((row, i) => (
                <div key={i} className={`flex justify-between items-center py-2
                  ${row.bold ? 'border-t-2 border-b-2 border-ink/20 my-3' : 'border-b border-ink/5'}`}>
                  <span className={`text-sm ${row.bold ? 'font-black text-ink' : 'text-ink/70 font-medium'}`}>
                    {row.label}
                  </span>
                  <span className={`font-mono text-sm
                    ${row.bold ? 'font-black text-ink text-base' : ''}
                    ${row.amount < 0 ? 'text-crimson-600' : 'text-ink'}`}>
                    {row.amount < 0 ? `- ${fmt(Math.abs(row.amount))}` : fmt(row.amount)}
                  </span>
                </div>
              ))}
            </div>

            {/* Net pay highlight */}
            <div className="bg-jade-50 border-2 border-jade-500 p-4 mb-5">
              <div className="flex justify-between items-center">
                <div>
                  <div className="text-xs font-black uppercase tracking-widest text-jade-700 mb-1">
                    Employee Net Pay
                  </div>
                  <div className="font-display text-3xl font-black text-jade-700">
                    {fmt(result.netPay)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-jade-600 font-medium">Take-home</div>
                  <div className="font-black text-jade-700 text-xl">{result.takeHomePct}</div>
                </div>
              </div>
            </div>

            {/* Employer cost */}
            <div className="bg-gold-50 border-2 border-gold-500 p-4 mb-5">
              <div className="text-xs font-black uppercase tracking-widest text-gold-700 mb-2">
                Employer Total Cost (Outflow)
              </div>
              <div className="flex justify-between text-sm font-medium text-ink/70">
                <span>Total Earnings</span>
                <span className="font-mono">{fmt(result.totalEarnings)}</span>
              </div>
              <div className="flex justify-between text-sm font-medium text-ink/70 mt-1">
                <span>Employer Super (8.4%)</span>
                <span className="font-mono">{fmt(result.employerSuper)}</span>
              </div>
              <div className="flex justify-between font-black text-ink border-t-2 border-gold-400 mt-2 pt-2">
                <span>Total Firm Liability</span>
                <span className="font-mono">{fmt(result.employerCost?.totalCostToFirm)}</span>
              </div>
            </div>

            <button
                onClick={processPayroll}
                disabled={processing || !form.staffId || !form.payPeriodStart || !form.payPeriodEnd}
                className="btn-gold w-full justify-center py-3 bg-jade-600 border-jade-700 hover:bg-jade-700"
            >
              {processing ? 'Processing...' : <><Save className="w-4 h-4" /> Process & Archive Payslip</>}
            </button>
            {!form.staffId && <p className="text-[10px] text-center text-ink/40 mt-2">Select a staff member to process payroll</p>}

            {success && (
              <div className="mt-4 p-3 bg-jade-50 border border-jade-200 text-jade-700 text-sm font-bold text-center">
                {success}
              </div>
            )}
          </div>
        ) : (
          <div className="card p-6 flex items-center justify-center min-h-[300px]">
            <div className="text-center text-ink/30">
              <FileText className="w-16 h-16 mx-auto mb-3" strokeWidth={1} />
              <p className="font-bold uppercase tracking-wide text-sm">
                Select staff and dates to generate<br />the integrated pay run
              </p>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

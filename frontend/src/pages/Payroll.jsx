import { useState, useEffect } from 'react';
import { Calculator, FileText, CheckCircle, AlertCircle, Users, Clock, TrendingUp } from 'lucide-react';
import Layout from '../components/Layout';
import api from '../utils/api';

const fmt = (v) => new Intl.NumberFormat('en-PG', { style: 'currency', currency: 'PGK' }).format(v);

export default function Payroll() {
  const [form, setForm] = useState({
    staffId: '',
    payFrequency: 'Fortnightly',
    grossPay: '',
    allowances: '0',
    overtimePay: '0',
    otherDeductions: '0',
    payPeriodStart: '',
    payPeriodEnd: new Date().toISOString().split('T')[0]
  });

  const [staff, setStaff] = useState([]);
  const [payData, setPayData] = useState(null);
  const [productivity, setProductivity] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadStaff();
  }, []);

  async function loadStaff() {
    try {
      const { data } = await api.get('/auth/users');
      setStaff(data.data || []);
    } catch (e) {
      setError('Failed to load staff members.');
    }
  }

  async function loadStaffPayData(staffId) {
    if (!staffId || !form.payPeriodStart || !form.payPeriodEnd) return;
    setLoading(true);
    try {
      const [payRes, prodRes] = await Promise.all([
        api.get(`/payroll/staff/${staffId}/pay-data`, {
          params: { startDate: form.payPeriodStart, endDate: form.payPeriodEnd }
        }),
        api.get(`/auth/users/${staffId}/productivity`, {
          params: { startDate: form.payPeriodStart, endDate: form.payPeriodEnd }
        })
      ]);

      const d = payRes.data.data;
      setPayData(d);
      setProductivity(prodRes.data.data);

      setForm(f => ({
        ...f,
        grossPay: d.suggestedGrossPay,
        otherDeductions: (parseFloat(d.leaveDeduction || 0) + parseFloat(d.mandatoryDeductions || 0)).toString()
      }));
    } catch (e) {
      setError('Failed to fetch automated pay data.');
    } finally {
      setLoading(false);
    }
  }

  const set = (k, v) => {
    setForm(f => ({ ...f, [k]: v }));
    if (k === 'staffId' && v) loadStaffPayData(v);
  };

  async function calculate(e) {
    e.preventDefault();
    setError(''); setResult(null); setLoading(true);
    try {
      const { data } = await api.post('/payroll/calculate', {
        grossPay: parseFloat(form.grossPay),
        payFrequency: form.payFrequency,
        allowances: parseFloat(form.allowances || 0),
        overtimePay: parseFloat(form.overtimePay || 0),
        otherDeductions: parseFloat(form.otherDeductions || 0)
      });
      setResult(data.data);
    } catch (e) {
      setError(e.response?.data?.message || e.message);
    } finally { setLoading(false); }
  }

  async function processPayroll() {
    if (!result || !form.staffId) return;
    setLoading(true); setError(''); setSuccess('');
    try {
      await api.post('/payroll/process', {
        staffId: form.staffId,
        payPeriodStart: form.payPeriodStart,
        payPeriodEnd: form.payPeriodEnd,
        payFrequency: form.payFrequency,
        grossPay: parseFloat(form.grossPay),
        allowances: parseFloat(form.allowances || 0),
        overtimePay: parseFloat(form.overtimePay || 0),
        otherDeductions: parseFloat(form.otherDeductions || 0),
        notes: `Automated run. Productivity Score: ${productivity?.stats?.productivityScore}`
      });
      setSuccess('Payroll processed successfully and recorded in Operating Ledger.');
      setResult(null);
    } catch (e) {
      setError(e.response?.data?.message || e.message);
    } finally { setLoading(false); }
  }

  return (
    <Layout>
      <div className="mb-8">
        <h1 className="font-display text-4xl font-black text-ink">PNG Payroll</h1>
        <p className="text-ink/50 font-medium mt-1">
          Automated Salary, SWT & Superannuation management
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          {/* Configuration Card */}
          <div className="card p-6">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b-2 border-ink/10">
              <Users className="w-5 h-5 text-gold-600" />
              <h2 className="font-display font-bold text-xl text-ink">1. Select Staff & Period</h2>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="label">Staff Member</label>
                <select className="input" value={form.staffId} onChange={e => set('staffId', e.target.value)}>
                  <option value="">-- Select Staff --</option>
                  {staff.map(s => <option key={s.id} value={s.id}>{s.name} ({s.role})</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Period Start</label>
                  <input type="date" className="input" value={form.payPeriodStart} onChange={e => set('payPeriodStart', e.target.value)} />
                </div>
                <div>
                  <label className="label">Period End</label>
                  <input type="date" className="input" value={form.payPeriodEnd} onChange={e => set('payPeriodEnd', e.target.value)} />
                </div>
              </div>
            </div>
          </div>

          {/* Productivity Insights */}
          {productivity && (
            <div className="card p-6 border-l-4 border-jade-500">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-ink flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-jade-600" />
                  Attorney Productivity
                </h3>
                <span className="badge badge-open text-xs">Score: {productivity.stats.productivityScore}</span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-ink/50">Billable Hours</p>
                  <p className="font-black text-ink">{productivity.stats.totalHours} hrs</p>
                </div>
                <div>
                  <p className="text-ink/50">Billable Value</p>
                  <p className="font-black text-ink">{fmt(productivity.stats.billableValue)}</p>
                </div>
              </div>
            </div>
          )}

          {/* Calculator Form */}
          <div className="card p-6">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b-2 border-ink/10">
              <Calculator className="w-5 h-5 text-gold-600" />
              <h2 className="font-display font-bold text-xl text-ink">2. Compensation Details</h2>
            </div>

            <form onSubmit={calculate} className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Pay Frequency</label>
                  <select className="input" value={form.payFrequency} onChange={e => set('payFrequency', e.target.value)}>
                    <option value="Fortnightly">Fortnightly</option>
                    <option value="Monthly">Monthly</option>
                  </select>
                </div>
                <div>
                  <label className="label">Gross Pay (K)</label>
                  <input type="number" step="0.01" required className="input font-mono"
                    value={form.grossPay} onChange={e => set('grossPay', e.target.value)} />
                </div>
              </div>

              {payData && payData.billableHours > 0 && (
                <div className="bg-gold-50 p-3 border border-gold-200 text-xs font-medium flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gold-600" />
                  Auto-loaded {payData.billableHours} billable hours from timesheets.
                </div>
              )}

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="label">Allowances</label>
                  <input type="number" step="0.01" className="input font-mono text-sm"
                    value={form.allowances} onChange={e => set('allowances', e.target.value)} />
                </div>
                <div>
                  <label className="label">Overtime</label>
                  <input type="number" step="0.01" className="input font-mono text-sm"
                    value={form.overtimePay} onChange={e => set('overtimePay', e.target.value)} />
                </div>
                <div>
                  <label className="label">Deductions</label>
                  <input type="number" step="0.01" className="input font-mono text-sm"
                    value={form.otherDeductions} onChange={e => set('otherDeductions', e.target.value)} />
                </div>
              </div>

              {payData && (payData.leaveDeduction > 0 || payData.mandatoryDeductions > 0) && (
                <div className="text-[10px] text-ink/40 uppercase font-black tracking-widest flex flex-wrap gap-x-4">
                   {payData.leaveDeduction > 0 && <span>Unpaid Leave: -{fmt(payData.leaveDeduction)}</span>}
                   {payData.mandatoryDeductions > 0 && <span>Professional Dues: -{fmt(payData.mandatoryDeductions)}</span>}
                </div>
              )}

              {error && (
                <div className="flex items-start gap-2 bg-crimson-50 border-2 border-crimson-600 p-3">
                  <AlertCircle className="w-4 h-4 text-crimson-600 flex-shrink-0 mt-0.5" />
                  <p className="text-crimson-700 text-sm font-medium">{error}</p>
                </div>
              )}

              {success && (
                <div className="flex items-start gap-2 bg-jade-50 border-2 border-jade-600 p-3">
                  <CheckCircle className="w-4 h-4 text-jade-600 flex-shrink-0 mt-0.5" />
                  <p className="text-jade-700 text-sm font-medium">{success}</p>
                </div>
              )}

              <button type="submit" disabled={loading || !form.staffId} className="btn-gold w-full justify-center py-3">
                {loading ? 'Processing…' : 'Calculate Pay Run'}
              </button>
            </form>
          </div>
        </div>

        {/* Result panel */}
        <div>
          {result ? (
            <div className="card p-6 animate-fadeIn sticky top-6">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b-2 border-ink/10">
                <div className="w-9 h-9 bg-jade-100 border-2 border-jade-500 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-jade-700" />
                </div>
                <div>
                  <h2 className="font-display font-bold text-xl text-ink">Review Payslip</h2>
                  <p className="text-xs text-ink/50 font-medium">{payData?.name} · {form.payFrequency}</p>
                </div>
              </div>

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

              <div className="bg-jade-50 border-2 border-jade-500 p-4 mb-6">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="text-xs font-black uppercase tracking-widest text-jade-700 mb-1">Net Payable</div>
                    <div className="font-display text-3xl font-black text-jade-700">{fmt(result.netPay)}</div>
                  </div>
                  <button onClick={processPayroll} disabled={loading} className="btn-jade h-12 px-6">
                    {loading ? 'Saving…' : 'Finalize & Pay'}
                  </button>
                </div>
              </div>

              <div className="bg-ink/[0.04] p-4 text-xs font-medium text-ink/50 leading-relaxed">
                <p>By finalizing, you will:</p>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>Record a <strong>Salary</strong> expense of {fmt(result.employerCost.totalCostToFirm)} in the Operating Ledger.</li>
                  <li>Generate and archive a digital payslip for {payData?.name}.</li>
                  <li>Update year-to-date earnings for the staff member.</li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="card p-6 flex flex-col items-center justify-center min-h-[400px] text-center">
              <FileText className="w-16 h-16 text-ink/10 mb-4" strokeWidth={1} />
              <p className="font-bold text-ink/30 uppercase tracking-widest text-sm">
                Complete the configuration<br />to generate a pay run
              </p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

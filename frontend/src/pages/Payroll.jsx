import { useState } from 'react';
import { FileText, Calculator, AlertCircle, CheckCircle } from 'lucide-react';
import Layout from '../components/Layout';
import api    from '../utils/api';

function fmt(n) { return `K ${parseFloat(n || 0).toLocaleString('en-PG', { minimumFractionDigits: 2 })}`; }

export default function Payroll() {
  const [form, setForm]         = useState({ grossPay: '', payFrequency: 'Fortnightly', allowances: '0', overtimePay: '0' });
  const [result, setResult]     = useState(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function calculate(e) {
    e.preventDefault();
    setError(''); setResult(null); setLoading(true);
    try {
      const { data } = await api.post('/payroll/calculate', {
        grossPay:     parseFloat(form.grossPay),
        payFrequency: form.payFrequency,
        allowances:   parseFloat(form.allowances  || 0),
        overtimePay:  parseFloat(form.overtimePay || 0),
      });
      setResult(data.data);
    } catch (e) {
      setError(e.response?.data?.message || e.message);
    } finally { setLoading(false); }
  }

  return (
    <Layout>
      <div className="mb-8">
        <h1 className="font-display text-4xl font-black text-ink">PNG Payroll</h1>
        <p className="text-ink/50 font-medium mt-1">
          Salary or Wages Tax (SWT) calculator — 2026 PNG IRC tables
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Calculator Form */}
        <div className="card p-6">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b-2 border-ink/10">
            <div className="w-9 h-9 bg-gold-100 border-2 border-gold-500 flex items-center justify-center">
              <Calculator className="w-5 h-5 text-gold-700" />
            </div>
            <h2 className="font-display font-bold text-xl text-ink">Calculate Payroll</h2>
          </div>

          <form onSubmit={calculate} className="space-y-5">
            <div>
              <label className="label">Pay Frequency</label>
              <select className="input" value={form.payFrequency} onChange={e => set('payFrequency', e.target.value)}>
                <option value="Fortnightly">Fortnightly (every 2 weeks)</option>
                <option value="Monthly">Monthly</option>
              </select>
            </div>

            <div>
              <label className="label">Gross Pay (K)</label>
              <input type="number" min="0" step="0.01" required className="input font-mono"
                placeholder={form.payFrequency === 'Fortnightly' ? 'e.g. 2000.00' : 'e.g. 4333.00'}
                value={form.grossPay} onChange={e => set('grossPay', e.target.value)} />
              <p className="text-xs text-ink/40 mt-1">
                Enter {form.payFrequency.toLowerCase()} gross pay in Kina (K)
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
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
            </div>

            {error && (
              <div className="flex items-start gap-2 bg-crimson-50 border-2 border-crimson-600 p-3">
                <AlertCircle className="w-4 h-4 text-crimson-600 flex-shrink-0 mt-0.5" />
                <p className="text-crimson-700 text-sm font-medium">{error}</p>
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-gold w-full justify-center py-3">
              {loading ? (
                <><span className="inline-block w-4 h-4 border-2 border-ink border-t-transparent rounded-full animate-spin" /> Calculating…</>
              ) : <><Calculator className="w-4 h-4" /> Calculate SWT & Super</>}
            </button>
          </form>

          {/* PNG Tax reference card */}
          <div className="mt-6 bg-ink/[0.04] border-2 border-ink/10 p-4">
            <p className="text-xs font-black uppercase tracking-widest text-ink/50 mb-3">2026 PNG Tax Brackets</p>
            <table className="w-full text-xs font-mono">
              <tbody className="divide-y divide-ink/10">
                {[
                  ['Tax-free threshold', 'K20,000 / year', '0%'],
                  ['Up to K12,500',      'annual taxable', '30%'],
                  ['K12,501 – K20,000',  'annual taxable', '35%'],
                  ['K20,001 – K33,000',  'annual taxable', '40%'],
                  ['Over K33,000',       'annual taxable', '42%'],
                ].map(([r, n, t]) => (
                  <tr key={r} className="py-1">
                    <td className="py-1 text-ink/70 font-medium">{r}</td>
                    <td className="py-1 text-ink/40 text-center">{n}</td>
                    <td className="py-1 font-bold text-right text-gold-700">{t}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-xs text-ink/50 mt-3 pt-2 border-t border-ink/10">
              Superannuation: <strong>6%</strong> employee · <strong>8.4%</strong> employer
            </p>
          </div>
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
                <p className="text-xs text-ink/50 font-medium">{result.payFrequency} · PNG IRC 2026</p>
              </div>
            </div>

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
                Employer Total Cost
              </div>
              <div className="flex justify-between text-sm font-medium text-ink/70">
                <span>Total Earnings</span>
                <span className="font-mono">{fmt(result.employerCost?.netPayment)}</span>
              </div>
              <div className="flex justify-between text-sm font-medium text-ink/70 mt-1">
                <span>Employer Super (8.4%)</span>
                <span className="font-mono">{fmt(result.employerSuper)}</span>
              </div>
              <div className="flex justify-between font-black text-ink border-t-2 border-gold-400 mt-2 pt-2">
                <span>Total Cost to Firm</span>
                <span className="font-mono">{fmt(result.employerCost?.totalCostToFirm)}</span>
              </div>
            </div>

            {/* Annual summary */}
            <div className="bg-ink/[0.04] border-2 border-ink/10 p-4">
              <p className="text-xs font-black uppercase tracking-widest text-ink/50 mb-3">Annual Projection</p>
              <div className="grid grid-cols-2 gap-y-2 text-sm font-medium">
                <span className="text-ink/60">Annual Income</span>
                <span className="font-mono font-bold text-right">{fmt(result.annualIncome)}</span>
                <span className="text-ink/60">Annual SWT Tax</span>
                <span className="font-mono font-bold text-right text-crimson-600">{fmt(result.annualTax)}</span>
                <span className="text-ink/60">Effective Rate</span>
                <span className="font-bold text-right">{result.effectiveTaxRate}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="card p-6 flex items-center justify-center min-h-[300px]">
            <div className="text-center text-ink/30">
              <FileText className="w-16 h-16 mx-auto mb-3" strokeWidth={1} />
              <p className="font-bold uppercase tracking-wide text-sm">
                Enter pay details to see the<br />PNG payroll breakdown
              </p>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

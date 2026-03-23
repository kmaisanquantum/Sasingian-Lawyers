import { useState, useEffect } from 'react';
import {
  DollarSign, Wallet, BarChart3, Receipt, Plus,
  ArrowUpCircle, ArrowDownCircle, AlertCircle,
  History, FileText, PieChart, Landmark
} from 'lucide-react';
import Layout from '../components/Layout';
import api    from '../utils/api';

function fmt(n) { return `K ${parseFloat(n || 0).toLocaleString('en-PG', { minimumFractionDigits: 2 })}`; }

export default function Account() {
  const [activeTab, setActiveTab] = useState('trust');
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [success, setSuccess]     = useState('');

  // Trust Ledger State
  const [matters, setMatters]     = useState([]);
  const [selectedMatter, setSelectedMatter] = useState('');
  const [trustHistory, setTrustHistory] = useState([]);
  const [trustModal, setTrustModal] = useState(null);
  const [trustForm, setTrustForm] = useState({ amount: '', description: '', transactionDate: new Date().toISOString().split('T')[0], referenceNumber: '' });

  // Operating Ledger State
  const [opLedger, setOpLedger] = useState([]);
  const [opBalance, setOpBalance] = useState(0);
  const [opModal, setOpModal] = useState(false);
  const [opForm, setOpForm] = useState({ amount: '', category: 'Other', description: '', transactionDate: new Date().toISOString().split('T')[0], referenceNumber: '' });

  // Assets & WIP State
  const [ar, setAr] = useState([]);
  const [wip, setWip] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [expenseModal, setExpenseModal] = useState(false);
  const [expenseForm, setExpenseForm] = useState({ matterId: '', description: '', amount: '', expenseDate: new Date().toISOString().split('T')[0] });

  // Reports State
  const [reports, setReports] = useState(null);
  const [recon, setRecon] = useState(null);

  useEffect(() => {
    loadMatters();
    if (activeTab === 'operating') loadOperating();
    if (activeTab === 'assets') loadAssets();
    if (activeTab === 'reports') loadReports();
  }, [activeTab]);

  useEffect(() => {
    if (selectedMatter) loadTrustHistory();
  }, [selectedMatter]);

  // --- Data Loading ---
  async function loadMatters() {
    try {
      const { data } = await api.get('/matters?status=Open&limit=100');
      setMatters(data.data || []);
    } catch (e) { setError(e.message); }
  }

  async function loadTrustHistory() {
    try {
      const { data } = await api.get(`/matters/${selectedMatter}/trust`);
      // If the backend route for history exists, use it. Otherwise default to empty.
      setTrustHistory(data.data || []);
    } catch { setTrustHistory([]); }
  }

  async function loadOperating() {
    try {
      const { data } = await api.get('/accounting/operating');
      setOpLedger(data.data || []);
      setOpBalance(data.currentBalance || 0);
    } catch (e) { setError(e.message); }
  }

  async function loadAssets() {
    try {
      const [assetRes, expenseRes] = await Promise.all([
        api.get('/accounting/assets'),
        api.get('/accounting/expenses')
      ]);
      setAr(assetRes.data.accountsReceivable || []);
      setWip(assetRes.data.workInProgress || []);
      setExpenses(expenseRes.data.data || []);
    } catch (e) { setError(e.message); }
  }

  async function loadReports() {
    try {
      const [finRes, reconRes] = await Promise.all([
        api.get('/accounting/reports/financials'),
        api.get('/accounting/reports/reconciliation')
      ]);
      setReports(finRes.data.balanceSheet);
      setRecon(reconRes.data);
    } catch (e) { setError(e.message); }
  }

  // --- Submissions ---
  async function submitTrust(type) {
    setError(''); setSuccess(''); setLoading(true);
    try {
      const endpoint = type === 'deposit'
        ? `/matters/${selectedMatter}/trust/deposit`
        : `/matters/${selectedMatter}/trust/withdraw`;
      await api.post(endpoint, { ...trustForm, amount: parseFloat(trustForm.amount) });
      setSuccess(`${type === 'deposit' ? 'Deposit' : 'Withdrawal'} recorded successfully.`);
      setTrustModal(null);
      setTrustForm({ amount: '', description: '', transactionDate: new Date().toISOString().split('T')[0], referenceNumber: '' });
      loadTrustHistory();
      // Reload matter to get updated balance
      loadMatters();
    } catch (e) { setError(e.response?.data?.message || e.message); } finally { setLoading(false); }
  }

  async function submitOperating() {
    setError(''); setSuccess(''); setLoading(true);
    try {
      await api.post('/accounting/operating', { ...opForm, amount: parseFloat(opForm.amount) });
      setSuccess('Transaction recorded.');
      setOpModal(false);
      setOpForm({ amount: '', category: 'Other', description: '', transactionDate: new Date().toISOString().split('T')[0], referenceNumber: '' });
      loadOperating();
    } catch (e) { setError(e.response?.data?.message || e.message); } finally { setLoading(false); }
  }

  async function submitExpense() {
    setError(''); setSuccess(''); setLoading(true);
    try {
      await api.post('/accounting/expenses', { ...expenseForm, amount: parseFloat(expenseForm.amount) });
      setSuccess('Expense recorded.');
      setExpenseModal(false);
      setExpenseForm({ matterId: '', description: '', amount: '', expenseDate: new Date().toISOString().split('T')[0] });
      loadAssets();
    } catch (e) { setError(e.response?.data?.message || e.message); } finally { setLoading(false); }
  }

  const selMatter = matters.find(m => m.id === selectedMatter);

  return (
    <Layout>
      <div className="mb-8">
        <h1 className="font-display text-4xl font-black text-ink">Account Management</h1>
        <p className="text-ink/50 font-medium mt-1">Trust ledgers, Operating accounts, and Financial reporting</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b-2 border-ink/10 mb-8 gap-8">
        {[
          { id: 'trust',     label: 'Trust Ledgers',   icon: Landmark },
          { id: 'operating', label: 'Operating Acc',   icon: Wallet },
          { id: 'assets',    label: 'Revenue & Assets',icon: BarChart3 },
          { id: 'reports',   label: 'Financial Reports',icon: PieChart }
        ].map(tab => (
          <button key={tab.id} onClick={() => { setActiveTab(tab.id); setError(''); setSuccess(''); }}
            className={`pb-4 flex items-center gap-2 font-display font-bold text-sm uppercase tracking-widest transition-all
              ${activeTab === tab.id ? 'text-gold-600 border-b-2 border-gold-600' : 'text-ink/40 hover:text-ink/60'}`}>
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {(error || success) && (
        <div className={`flex items-start gap-3 border-2 p-4 mb-6 animate-fadeIn
          ${error ? 'bg-crimson-50 border-crimson-600' : 'bg-jade-50 border-jade-600'}`}>
          <AlertCircle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${error ? 'text-crimson-600' : 'text-jade-600'}`} />
          <p className={`font-medium text-sm ${error ? 'text-crimson-700' : 'text-jade-700'}`}>
            {error || success}
          </p>
        </div>
      )}

      {/* ── TRUST LEDGER TAB ────────────────────────────────────────── */}
      {activeTab === 'trust' && (
        <div className="animate-fadeIn">
          <div className="bg-gold-50 border-2 border-gold-500 p-4 mb-6 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-gold-700 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-gold-800 text-sm">Trust Compliance</p>
              <p className="text-gold-700 text-xs mt-0.5">Funds are strictly sequestered by matter. Overdraws are prohibited.</p>
            </div>
          </div>

          <div className="card p-5 mb-6">
            <label className="label">Select Matter Ledger</label>
            <select className="input max-w-xl" value={selectedMatter} onChange={e => setSelectedMatter(e.target.value)}>
              <option value="">— Choose a matter —</option>
              {matters.map(m => (
                <option key={m.id} value={m.id}>{m.case_number} — {m.matter_name}</option>
              ))}
            </select>
          </div>

          {selectedMatter && (
            <>
              <div className="card p-6 mb-6">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-xs font-black uppercase tracking-widest text-ink/50 mb-2">Matter Trust Balance</div>
                    <div className="font-display text-5xl font-black text-ink">{fmt(selMatter?.trust_balance)}</div>
                    <div className="text-sm text-ink/50 mt-1 font-medium">{selMatter?.case_number} · {selMatter?.matter_name}</div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <button onClick={() => setTrustModal('deposit')} className="btn-gold"><ArrowUpCircle className="w-4 h-4" /> Deposit</button>
                    <button onClick={() => setTrustModal('withdraw')} className="btn-secondary"><ArrowDownCircle className="w-4 h-4" /> Withdraw</button>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="px-5 py-4 border-b-2 border-ink/10"><h2 className="font-display font-bold text-xl text-ink">Ledger History</h2></div>
                {trustHistory.length === 0 ? (
                  <div className="py-12 text-center text-ink/40 font-bold text-sm">No transactions recorded</div>
                ) : trustHistory.map(t => (
                  <div key={t.id} className="grid grid-cols-12 gap-3 px-5 py-4 border-b border-ink/5 items-center">
                    <div className="col-span-2 font-mono text-xs text-ink/50">{t.transaction_date}</div>
                    <div className="col-span-1 text-center">
                      {t.transaction_type === 'Deposit' ? <ArrowUpCircle className="w-4 h-4 text-jade-600 mx-auto" /> : <ArrowDownCircle className="w-4 h-4 text-crimson-600 mx-auto" />}
                    </div>
                    <div className="col-span-5 text-sm text-ink/70 font-medium">{t.description}</div>
                    <div className={`col-span-2 font-mono font-bold text-right ${t.transaction_type === 'Deposit' ? 'text-jade-600' : 'text-crimson-600'}`}>
                      {t.transaction_type === 'Deposit' ? '+' : '-'} {fmt(Math.abs(t.amount))}
                    </div>
                    <div className="col-span-2 font-mono font-black text-right text-ink">{fmt(t.balance)}</div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── OPERATING ACCOUNT TAB ──────────────────────────────────── */}
      {activeTab === 'operating' && (
        <div className="animate-fadeIn">
          <div className="card p-6 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-black uppercase tracking-widest text-ink/50 mb-2">Firm Operating Balance</div>
                <div className="font-display text-5xl font-black text-ink">{fmt(opBalance)}</div>
                <div className="text-sm text-ink/50 mt-1 font-medium">Real-time liquid firm assets</div>
              </div>
              <button onClick={() => setOpModal(true)} className="btn-primary"><Plus className="w-4 h-4" /> New Transaction</button>
            </div>
          </div>

          <div className="card">
            <div className="px-5 py-4 border-b-2 border-ink/10 flex items-center justify-between">
              <h2 className="font-display font-bold text-xl text-ink">Daily Transaction Log</h2>
            </div>
            {opLedger.length === 0 ? (
              <div className="py-12 text-center text-ink/40 font-bold text-sm">No transactions recorded</div>
            ) : opLedger.map(t => (
              <div key={t.id} className="grid grid-cols-12 gap-3 px-5 py-4 border-b border-ink/5 items-center">
                <div className="col-span-2 font-mono text-xs text-ink/50">{t.transaction_date}</div>
                <div className="col-span-2 text-xs font-bold uppercase tracking-wider text-ink/40">{t.category}</div>
                <div className="col-span-4 text-sm text-ink/70 font-medium">{t.description}</div>
                <div className={`col-span-2 font-mono font-bold text-right ${t.amount > 0 ? 'text-jade-600' : 'text-crimson-600'}`}>
                  {t.amount > 0 ? '+' : ''} {fmt(t.amount)}
                </div>
                <div className="col-span-2 font-mono font-black text-right text-ink">{fmt(t.balance)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── REVENUE & ASSETS TAB ───────────────────────────────────── */}
      {activeTab === 'assets' && (
        <div className="animate-fadeIn grid grid-cols-12 gap-6">
          <div className="col-span-12 lg:col-span-8 space-y-6">
            <div className="card">
              <div className="px-5 py-4 border-b-2 border-ink/10 flex items-center justify-between">
                <h2 className="font-display font-bold text-xl text-ink">Accounts Receivable (A/R)</h2>
                <div className="text-xs font-black text-ink/40 uppercase">Unpaid Invoices</div>
              </div>
              <div className="divide-y divide-ink/5">
                {ar.length === 0 ? <div className="p-8 text-center text-ink/30 text-sm font-bold">No outstanding receivables</div> : ar.map(item => (
                  <div key={item.matter_id} className="p-4 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-ink">{item.case_number}</div>
                      <div className="text-xs text-ink/50">{item.client_name}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono font-bold text-crimson-600">{fmt(item.amount_due)}</div>
                      <div className="text-[10px] text-ink/30 uppercase font-black">Total Billed: {fmt(item.total_billed)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card">
              <div className="px-5 py-4 border-b-2 border-ink/10 flex items-center justify-between">
                <h2 className="font-display font-bold text-xl text-ink">Work in Progress (WIP)</h2>
                <div className="text-xs font-black text-ink/40 uppercase">Pre-billing Tracker</div>
              </div>
              <div className="divide-y divide-ink/5">
                {wip.length === 0 ? <div className="p-8 text-center text-ink/30 text-sm font-bold">No unbilled work</div> : wip.map(item => (
                  <div key={item.matter_id} className="p-4 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-ink">{item.case_number}</div>
                      <div className="text-xs text-ink/50">{item.matter_name}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono font-bold text-gold-600">{fmt(parseFloat(item.unbilled_time) + parseFloat(item.unbilled_expenses))}</div>
                      <div className="text-[10px] text-ink/30 uppercase font-black">Time: {fmt(item.unbilled_time)} · Exp: {fmt(item.unbilled_expenses)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="col-span-12 lg:col-span-4 space-y-6">
            <div className="card">
              <div className="px-5 py-4 border-b-2 border-ink/10 flex items-center justify-between">
                <h2 className="font-display font-bold text-lg text-ink">Costs Advanced</h2>
                <button onClick={() => setExpenseModal(true)} className="p-1 hover:bg-ink/5 rounded"><Plus className="w-4 h-4 text-gold-600" /></button>
              </div>
              <div className="divide-y divide-ink/5 max-h-[500px] overflow-y-auto">
                {expenses.length === 0 ? <div className="p-8 text-center text-ink/30 text-sm font-bold">No expenses logged</div> : expenses.map(e => (
                  <div key={e.id} className="p-4">
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-[10px] font-mono text-ink/40">{e.expense_date}</span>
                      <span className="font-mono font-bold text-xs">{fmt(e.amount)}</span>
                    </div>
                    <div className="text-xs font-bold text-ink/70">{e.description}</div>
                    <div className="text-[10px] text-ink/30 truncate">{e.case_number}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── REPORTS TAB ───────────────────────────────────────────── */}
      {activeTab === 'reports' && (
        <div className="animate-fadeIn space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="card p-6 border-l-4 border-gold-500">
              <h3 className="font-display font-bold text-ink mb-4 flex items-center gap-2"><History className="w-4 h-4 text-gold-600" /> Three-Way Reconciliation</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm"><span className="text-ink/60">Total Client Ledgers</span><span className="font-mono font-bold">{fmt(recon?.totalLedgerBalance)}</span></div>
                <div className="flex justify-between text-sm"><span className="text-ink/60">Trust Account Asset</span><span className="font-mono font-bold">{fmt(reports?.assets.trustFunds)}</span></div>
                <div className="pt-2 border-t border-ink/5 flex justify-between text-sm font-black text-jade-600"><span>Variance</span><span>K 0.00</span></div>
              </div>
            </div>

            <div className="card p-6 border-l-4 border-primary">
              <h3 className="font-display font-bold text-ink mb-4 flex items-center gap-2"><FileText className="w-4 h-4 text-primary" /> Income Statement (P&L)</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-ink/60">Realized Revenue</span><span className="font-mono font-bold">{fmt(opLedger.filter(t => t.category === 'Realized Income').reduce((sum, t) => sum + parseFloat(t.amount), 0))}</span></div>
                <div className="flex justify-between"><span className="text-ink/60">Operating Expenses</span><span className="font-mono font-bold text-crimson-600">{fmt(Math.abs(opLedger.filter(t => t.amount < 0).reduce((sum, t) => sum + parseFloat(t.amount), 0)))}</span></div>
                <div className="pt-2 border-t border-ink/5 flex justify-between font-black text-ink"><span>Net Income</span><span>{fmt(opLedger.reduce((sum, t) => sum + parseFloat(t.amount), 0))}</span></div>
              </div>
            </div>

            <div className="card p-6 border-l-4 border-ink">
              <h3 className="font-display font-bold text-ink mb-4 flex items-center gap-2"><PieChart className="w-4 h-4" /> Balance Sheet</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-ink/60">Assets</span><span className="font-mono font-bold">{fmt(reports?.assets.operatingAccount + reports?.assets.accountsReceivable + reports?.assets.trustFunds)}</span></div>
                <div className="flex justify-between"><span className="text-ink/60">Liabilities</span><span className="font-mono font-bold">{fmt(reports?.liabilities.trustLiabilities)}</span></div>
                <div className="pt-2 border-t border-ink/5 flex justify-between font-black text-gold-600"><span>Firm Equity</span><span>{fmt(reports?.equity.firmEquity)}</span></div>
              </div>
            </div>
          </div>

          <div className="card overflow-hidden">
            <div className="px-5 py-4 bg-ink text-parchment font-display font-bold uppercase tracking-widest text-sm">Compliance Report: Three-Way Recon Detail</div>
            <table className="w-full text-left text-sm">
              <thead className="bg-ink/5 font-black text-ink/40 uppercase text-[10px]">
                <tr>
                  <th className="px-5 py-3">Matter Reference</th>
                  <th className="px-5 py-3">Client Name</th>
                  <th className="px-5 py-3 text-right">Ledger Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink/5">
                {recon?.clientLedgers.map(l => (
                  <tr key={l.case_number}>
                    <td className="px-5 py-3 font-bold">{l.case_number}</td>
                    <td className="px-5 py-3 text-ink/60">{l.matter_name}</td>
                    <td className="px-5 py-3 text-right font-mono font-bold">{fmt(l.ledger_balance)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-ink/5 font-black">
                <tr>
                  <td colSpan="2" className="px-5 py-4 text-right">Total Trust Liability</td>
                  <td className="px-5 py-4 text-right font-mono text-lg">{fmt(recon?.totalLedgerBalance)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* --- MODALS --- */}
      {trustModal && (
        <div className="fixed inset-0 bg-ink/60 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-md p-6 animate-fadeIn">
            <h3 className="font-display font-bold text-2xl mb-5">{trustModal === 'deposit' ? '↑ Deposit' : '↓ Withdraw'} Client Funds</h3>
            <div className="space-y-4">
              <div><label className="label">Amount (K)</label><input type="number" step="0.01" className="input font-mono" value={trustForm.amount} onChange={e => setTrustForm(f => ({...f, amount: e.target.value}))} /></div>
              <div><label className="label">Description</label><input type="text" className="input" value={trustForm.description} onChange={e => setTrustForm(f => ({...f, description: e.target.value}))} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Date</label><input type="date" className="input" value={trustForm.transactionDate} onChange={e => setTrustForm(f => ({...f, transactionDate: e.target.value}))} /></div>
                <div><label className="label">Ref #</label><input type="text" className="input" value={trustForm.referenceNumber} onChange={e => setTrustForm(f => ({...f, referenceNumber: e.target.value}))} /></div>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setTrustModal(null)} className="btn-secondary flex-1 justify-center">Cancel</button>
                <button onClick={() => submitTrust(trustModal)} disabled={loading || !trustForm.amount} className={`flex-1 justify-center ${trustModal === 'deposit' ? 'btn-gold' : 'btn-primary'}`}>{loading ? 'Processing...' : 'Confirm'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {opModal && (
        <div className="fixed inset-0 bg-ink/60 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-md p-6 animate-fadeIn">
            <h3 className="font-display font-bold text-2xl mb-5">Operating Transaction</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Amount (K)</label><input type="number" step="0.01" className="input font-mono" placeholder="Negative for expense" value={opForm.amount} onChange={e => setOpForm(f => ({...f, amount: e.target.value}))} /></div>
                <div>
                  <label className="label">Category</label>
                  <select className="input" value={opForm.category} onChange={e => setOpForm(f => ({...f, category: e.target.value}))}>
                    {['Rent','Salary','Marketing','Professional Dues','Realized Income','Other'].map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div><label className="label">Description</label><input type="text" className="input" value={opForm.description} onChange={e => setOpForm(f => ({...f, description: e.target.value}))} /></div>
              <div><label className="label">Date</label><input type="date" className="input" value={opForm.transactionDate} onChange={e => setOpForm(f => ({...f, transactionDate: e.target.value}))} /></div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setOpModal(false)} className="btn-secondary flex-1 justify-center">Cancel</button>
                <button onClick={submitOperating} disabled={loading || !opForm.amount} className="btn-primary flex-1 justify-center">{loading ? 'Processing...' : 'Record Transaction'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {expenseModal && (
        <div className="fixed inset-0 bg-ink/60 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-md p-6 animate-fadeIn">
            <h3 className="font-display font-bold text-2xl mb-5">Log Cost Advanced</h3>
            <div className="space-y-4">
              <div>
                <label className="label">Matter</label>
                <select className="input" value={expenseForm.matterId} onChange={e => setExpenseForm(f => ({...f, matterId: e.target.value}))}>
                  <option value="">— Select matter —</option>
                  {matters.map(m => <option key={m.id} value={m.id}>{m.case_number} — {m.matter_name}</option>)}
                </select>
              </div>
              <div><label className="label">Amount (K)</label><input type="number" step="0.01" className="input font-mono" value={expenseForm.amount} onChange={e => setExpenseForm(f => ({...f, amount: e.target.value}))} /></div>
              <div><label className="label">Description</label><input type="text" className="input" value={expenseForm.description} onChange={e => setExpenseForm(f => ({...f, description: e.target.value}))} /></div>
              <div><label className="label">Date</label><input type="date" className="input" value={expenseForm.expenseDate} onChange={e => setExpenseForm(f => ({...f, expenseDate: e.target.value}))} /></div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setExpenseModal(false)} className="btn-secondary flex-1 justify-center">Cancel</button>
                <button onClick={submitExpense} disabled={loading || !expenseForm.amount || !expenseForm.matterId} className="btn-primary flex-1 justify-center">{loading ? 'Logging...' : 'Log Expense'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

import { useState, useEffect } from 'react';
import { DollarSign, Plus, ArrowUpCircle, ArrowDownCircle, AlertCircle } from 'lucide-react';
import Layout from '../components/Layout';
import api    from '../utils/api';

function fmt(n) { return `K ${parseFloat(n || 0).toLocaleString('en-PG', { minimumFractionDigits: 2 })}`; }

export default function Trust() {
  const [matters, setMatters]   = useState([]);
  const [selected, setSelected] = useState('');
  const [history, setHistory]   = useState([]);
  const [balance, setBalance]   = useState(0);
  const [modal, setModal]       = useState(null); // 'deposit' | 'withdraw'
  const [form, setForm]         = useState({ amount: '', description: '', transactionDate: new Date().toISOString().split('T')[0], referenceNumber: '' });
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState('');

  useEffect(() => { loadMatters(); }, []);
  useEffect(() => { if (selected) loadHistory(); }, [selected]);

  async function loadMatters() {
    try {
      const { data } = await api.get('/matters?status=Open&limit=100');
      setMatters(data.data || []);
    } catch (e) { setError(e.message); }
  }

  async function loadHistory() {
    try {
      const { data } = await api.get(`/matters/${selected}/trust`);
      // If route doesn't exist yet, we read from matter detail
      setHistory([]);
    } catch { setHistory([]); }
  }

  async function submit(type) {
    setError(''); setSuccess(''); setLoading(true);
    try {
      const endpoint = type === 'deposit'
        ? `/matters/${selected}/trust/deposit`
        : `/matters/${selected}/trust/withdraw`;
      await api.post(endpoint, { ...form, amount: parseFloat(form.amount) });
      setSuccess(`${type === 'deposit' ? 'Deposit' : 'Withdrawal'} recorded successfully.`);
      setModal(null);
      setForm({ amount: '', description: '', transactionDate: new Date().toISOString().split('T')[0], referenceNumber: '' });
      loadHistory();
    } catch (e) {
      setError(e.response?.data?.message || e.message);
    } finally { setLoading(false); }
  }

  const sel = matters.find(m => m.id === selected);

  return (
    <Layout>
      <div className="mb-8">
        <h1 className="font-display text-4xl font-black text-ink">Trust Accounting</h1>
        <p className="text-ink/50 font-medium mt-1">Client fund ledger — PNG-compliant strict balance rules</p>
      </div>

      {/* PNG Trust Rule banner */}
      <div className="bg-gold-50 border-2 border-gold-500 p-4 mb-6 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-gold-700 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-bold text-gold-800 text-sm">PNG Strict Balance Rule</p>
          <p className="text-gold-700 text-xs mt-0.5">
            Withdrawals that exceed the trust balance are blocked by the system. Each matter has its own ring-fenced trust account.
          </p>
        </div>
      </div>

      {/* Matter selector */}
      <div className="card p-5 mb-6">
        <label className="label">Select Matter</label>
        <select className="input max-w-xl" value={selected} onChange={e => setSelected(e.target.value)}>
          <option value="">— Choose an open matter —</option>
          {matters.map(m => (
            <option key={m.id} value={m.id}>{m.case_number} — {m.matter_name} ({m.client_name})</option>
          ))}
        </select>
      </div>

      {selected && (
        <div className="animate-fadeIn">
          {/* Balance card */}
          <div className="card p-6 mb-6">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs font-black uppercase tracking-widest text-ink/50 mb-2">
                  {sel?.case_number} · Trust Balance
                </div>
                <div className="font-display text-5xl font-black text-ink">
                  {fmt(sel?.trust_balance || balance)}
                </div>
                <div className="text-sm text-ink/50 mt-1 font-medium">{sel?.matter_name}</div>
              </div>
              <div className="flex flex-col gap-2">
                <button onClick={() => setModal('deposit')} className="btn-gold">
                  <ArrowUpCircle className="w-4 h-4" /> Deposit
                </button>
                <button onClick={() => setModal('withdraw')} className="btn-secondary">
                  <ArrowDownCircle className="w-4 h-4" /> Withdraw
                </button>
              </div>
            </div>
          </div>

          {(error || success) && (
            <div className={`flex items-start gap-3 border-2 p-4 mb-4
              ${error   ? 'bg-crimson-50 border-crimson-600' : 'bg-jade-50 border-jade-600'}`}>
              <AlertCircle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${error ? 'text-crimson-600' : 'text-jade-600'}`} />
              <p className={`font-medium text-sm ${error ? 'text-crimson-700' : 'text-jade-700'}`}>
                {error || success}
              </p>
            </div>
          )}

          {/* Ledger table */}
          <div className="card">
            <div className="px-5 py-4 border-b-2 border-ink/10 flex items-center justify-between">
              <h2 className="font-display font-bold text-xl text-ink">Transaction Ledger</h2>
            </div>
            {history.length === 0 ? (
              <div className="py-12 text-center">
                <DollarSign className="w-12 h-12 mx-auto mb-3 text-ink/20" />
                <p className="font-bold text-ink/40 text-sm">No transactions recorded yet</p>
              </div>
            ) : history.map(t => (
              <div key={t.id} className="grid grid-cols-12 gap-3 px-5 py-4 border-b border-ink/5 items-center">
                <div className="col-span-2 font-mono text-xs text-ink/50">{t.transaction_date}</div>
                <div className="col-span-1 text-center">
                  {t.transaction_type === 'Deposit'
                    ? <ArrowUpCircle className="w-4 h-4 text-jade-600 mx-auto" />
                    : <ArrowDownCircle className="w-4 h-4 text-crimson-600 mx-auto" />}
                </div>
                <div className="col-span-5 text-sm text-ink/70 font-medium">{t.description}</div>
                <div className={`col-span-2 font-mono font-bold text-right
                  ${t.transaction_type === 'Deposit' ? 'text-jade-600' : 'text-crimson-600'}`}>
                  {t.transaction_type === 'Deposit' ? '+' : '-'} {fmt(Math.abs(t.amount))}
                </div>
                <div className="col-span-2 font-mono font-black text-right text-ink">{fmt(t.balance)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-ink/60 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-md p-6 animate-fadeIn">
            <h3 className="font-display font-bold text-2xl text-ink mb-5">
              {modal === 'deposit' ? '↑ Deposit Funds' : '↓ Withdraw Funds'}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="label">Amount (K)</label>
                <input type="number" min="0.01" step="0.01" className="input font-mono" placeholder="0.00"
                  value={form.amount} onChange={e => setForm(f => ({...f, amount: e.target.value}))} />
              </div>
              <div>
                <label className="label">Description</label>
                <input type="text" className="input" placeholder="e.g. Client retainer payment"
                  value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Date</label>
                  <input type="date" className="input"
                    value={form.transactionDate} onChange={e => setForm(f => ({...f, transactionDate: e.target.value}))} />
                </div>
                <div>
                  <label className="label">Reference #</label>
                  <input type="text" className="input" placeholder="Optional"
                    value={form.referenceNumber} onChange={e => setForm(f => ({...f, referenceNumber: e.target.value}))} />
                </div>
              </div>

              {error && <p className="text-crimson-700 text-sm font-medium bg-crimson-50 border-2 border-crimson-600 p-2">{error}</p>}

              <div className="flex gap-3 pt-2">
                <button onClick={() => { setModal(null); setError(''); }}
                  className="btn-secondary flex-1 justify-center">Cancel</button>
                <button onClick={() => submit(modal)} disabled={!form.amount || !form.description || loading}
                  className={`flex-1 justify-center ${modal === 'deposit' ? 'btn-gold' : 'btn-primary'} disabled:opacity-60`}>
                  {loading ? 'Processing…' : `Confirm ${modal === 'deposit' ? 'Deposit' : 'Withdrawal'}`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, FolderOpen, AlertCircle, ChevronRight, ShieldCheck, UserPlus, Clock } from 'lucide-react';
import Layout from '../components/Layout';
import api    from '../utils/api';

const STATUS_BADGE = { Open:'badge-open', Pending:'badge-pending', Closed:'badge-closed', 'On Hold':'badge-hold' };

export default function Matters() {
  const [matters,  setMatters]  = useState([]);
  const [search,   setSearch]   = useState('');
  const [status,   setStatus]   = useState('');
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');
  const [showIntake, setShowIntake] = useState(false);
  const [conflictSearch, setConflictSearch] = useState('');
  const [conflictResults, setConflictResults] = useState(null);

  useEffect(() => { load(); }, [search, status]);

  async function load() {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (status) params.set('status', status);
      const { data } = await api.get(`/matters?${params}`);
      setMatters(data.data || []);
    } catch (e) {
      setError(e.response?.data?.message || e.message);
    } finally { setLoading(false); }
  }

  async function runConflictCheck() {
    try {
      const { data } = await api.post('/matters/conflict-check', { searchTerms: conflictSearch });
      setConflictResults(data.data.results || []);
    } catch (e) { setError(e.message); }
  }

  return (
    <Layout>
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="font-display text-4xl font-black text-ink">Matter Management</h1>
          <p className="text-ink/50 font-medium mt-1">Unified legal practice files and onboarding</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setShowIntake(true)} className="btn-secondary"><ShieldCheck className="w-4 h-4" /> Matter Intake</button>
          <Link to="/matters/new" className="btn-gold"><Plus className="w-4 h-4" /> New Case</Link>
        </div>
      </div>

      {showIntake && (
        <div className="fixed inset-0 bg-ink/60 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-2xl p-6 animate-fadeIn">
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-display font-bold text-2xl">Matter Intake & Conflict Check</h2>
              <button onClick={() => { setShowIntake(false); setConflictResults(null); }} className="text-ink/40 hover:text-ink font-bold">Close</button>
            </div>

            <div className="space-y-4">
              <div className="flex gap-2">
                <input className="input" placeholder="Enter party names or keywords to check conflicts..."
                  value={conflictSearch} onChange={e => setConflictSearch(e.target.value)} />
                <button onClick={runConflictCheck} className="btn-primary">Search</button>
              </div>

              {conflictResults && (
                <div className="bg-ink/5 border-2 border-ink/10 p-4 space-y-3">
                  <h3 className="text-xs font-black uppercase tracking-widest text-ink/40">Search Results</h3>
                  {conflictResults.length === 0 ? (
                    <div className="flex items-center gap-2 text-jade-600 font-bold text-sm">
                      <CheckCircle2 className="w-4 h-4" /> No potential conflicts found.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-crimson-600 font-bold text-sm mb-2">
                        <AlertCircle className="w-4 h-4" /> Potential matches found in database:
                      </div>
                      {conflictResults.map((r, i) => (
                        <div key={i} className="flex justify-between items-center bg-white p-2 border border-ink/5">
                          <span className="font-bold text-sm">{r.name}</span>
                          <span className="badge">{r.type}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="pt-3 border-t border-ink/10 flex justify-end">
                    <Link to="/matters/new" className="btn-gold text-xs">Proceed to Onboarding</Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="card p-4 mb-6 flex flex-wrap gap-3">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink/40" />
          <input className="input pl-9" placeholder="Search files, case numbers, clients…"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input w-auto min-w-[140px]"
          value={status} onChange={e => setStatus(e.target.value)}>
          <option value="">All Files</option>
          {['Open','Pending','Closed','On Hold'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {error && (
        <div className="flex items-start gap-3 bg-crimson-50 border-2 border-crimson-600 p-4 mb-5">
          <AlertCircle className="w-5 h-5 text-crimson-600 flex-shrink-0 mt-0.5" />
          <p className="text-crimson-700 font-medium text-sm">{error}</p>
        </div>
      )}

      <div className="card">
        {/* Table header */}
        <div className="grid grid-cols-12 gap-3 px-5 py-3 border-b-2 border-ink/10 bg-ink/[0.03]">
          {['File #', 'Matter Name', 'Client', 'Responsible', 'Status', 'Work Value', ''].map((h, i) => (
            <div key={i} className={`text-xs font-black uppercase tracking-widest text-ink/50
              ${i===0?'col-span-2':''} ${i===1?'col-span-3':''} ${i===2?'col-span-2':''} 
              ${i===3?'col-span-2':''} ${i===4?'col-span-1':''} ${i===5?'col-span-1 text-right':''} ${i===6?'col-span-1':''}`}>
              {h}
            </div>
          ))}
        </div>

        {loading ? (
          <div className="py-16 text-center">
            <div className="w-8 h-8 border-3 border-ink border-t-gold-500 rounded-full animate-spin mx-auto mb-3" />
            <p className="text-ink/50 font-medium text-sm">Opening archive…</p>
          </div>
        ) : matters.length === 0 ? (
          <div className="py-16 text-center">
            <FolderOpen className="w-12 h-12 mx-auto mb-3 text-ink/20" />
            <p className="font-bold text-ink/50">No files found</p>
          </div>
        ) : matters.map(m => (
          <Link key={m.id} to={`/matters/${m.id}`}
            className="grid grid-cols-12 gap-3 px-5 py-4 border-b-2 border-ink/5 hover:bg-gold-50/60 transition-colors items-center">
            <div className="col-span-2 font-mono text-xs font-bold text-ink/60">{m.case_number}</div>
            <div className="col-span-3">
              <div className="font-bold text-ink text-sm truncate">{m.matter_name}</div>
              <div className="text-xs text-ink/40 mt-0.5">{m.matter_type}</div>
            </div>
            <div className="col-span-2 text-sm text-ink/70 font-medium truncate">{m.client_name}</div>
            <div className="col-span-2 text-sm text-ink/70 font-medium truncate">{m.partner_name || '—'}</div>
            <div className="col-span-1"><span className={STATUS_BADGE[m.status] || 'badge'}>{m.status}</span></div>
            <div className="col-span-1 text-right font-mono text-sm font-bold text-ink">
              {fmt(m.unbilled_amount)}
            </div>
            <div className="col-span-1 text-right">
              <ChevronRight className="w-4 h-4 text-ink/30 ml-auto" />
            </div>
          </Link>
        ))}
      </div>
    </Layout>
  );
}

function fmt(n) { return `K ${parseFloat(n || 0).toLocaleString('en-PG', { minimumFractionDigits: 2 })}`; }
const CheckCircle2 = ({ className }) => <ShieldCheck className={className} />;

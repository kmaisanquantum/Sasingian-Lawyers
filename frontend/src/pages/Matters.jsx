import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, FolderOpen, AlertCircle, ChevronRight } from 'lucide-react';
import Layout from '../components/Layout';
import api    from '../utils/api';

const STATUS_BADGE = { Open:'badge-open', Pending:'badge-pending', Closed:'badge-closed', 'On Hold':'badge-hold' };

export default function Matters() {
  const [matters,  setMatters]  = useState([]);
  const [search,   setSearch]   = useState('');
  const [status,   setStatus]   = useState('');
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');

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

  return (
    <Layout>
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="font-display text-4xl font-black text-ink">Matters</h1>
          <p className="text-ink/50 font-medium mt-1">All cases and client matters</p>
        </div>
        <Link to="/matters/new" className="btn-gold"><Plus className="w-4 h-4" /> New Matter</Link>
      </div>

      {/* Filters */}
      <div className="card p-4 mb-6 flex flex-wrap gap-3">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink/40" />
          <input className="input pl-9" placeholder="Search matters, case numbers, clients…"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input w-auto min-w-[140px]"
          value={status} onChange={e => setStatus(e.target.value)}>
          <option value="">All Statuses</option>
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
          {['Case #', 'Matter', 'Client', 'Partner', 'Status', 'Unbilled', ''].map((h, i) => (
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
            <p className="text-ink/50 font-medium text-sm">Loading matters…</p>
          </div>
        ) : matters.length === 0 ? (
          <div className="py-16 text-center">
            <FolderOpen className="w-12 h-12 mx-auto mb-3 text-ink/20" />
            <p className="font-bold text-ink/50">No matters found</p>
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
              K {parseFloat(m.unbilled_amount || 0).toFixed(2)}
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

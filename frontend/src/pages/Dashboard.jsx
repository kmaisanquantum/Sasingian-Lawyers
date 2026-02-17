import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Scale, Clock, DollarSign, TrendingUp, FolderOpen, Plus, AlertCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import Layout    from '../components/Layout';
import StatCard  from '../components/StatCard';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

const STATUS_BADGE = { Open:'badge-open', Pending:'badge-pending', Closed:'badge-closed', 'On Hold':'badge-hold' };

function MatterRow({ m }) {
  return (
    <div className="flex items-center justify-between py-4 px-5 border-b-2 border-ink/5 hover:bg-gold-50/50 transition-colors">
      <div className="flex-1 min-w-0 pr-4">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-bold text-ink truncate">{m.matter_name}</span>
          <span className={STATUS_BADGE[m.status] || 'badge'}>{m.status}</span>
        </div>
        <div className="text-sm text-ink/50 font-medium flex items-center gap-3">
          <span>{m.case_number}</span>
          <span>·</span>
          <span>{m.client_name}</span>
          {m.partner_name && <><span>·</span><span>{m.partner_name}</span></>}
        </div>
      </div>
      <div className="text-right flex-shrink-0">
        <div className="font-mono font-bold text-ink text-sm">
          K {parseFloat(m.unbilled_amount || 0).toLocaleString('en-PG', { minimumFractionDigits: 2 })}
        </div>
        <div className="text-xs text-ink/40">{m.time_entries_count} entries</div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user }                   = useAuth();
  const [stats,   setStats]        = useState(null);
  const [matters, setMatters]      = useState([]);
  const [loading, setLoading]      = useState(true);
  const [error,   setError]        = useState('');

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      setLoading(true);
      const [s, m] = await Promise.all([
        api.get('/matters/dashboard/stats'),
        api.get('/matters?limit=8'),
      ]);
      setStats(s.data.data);
      setMatters(m.data.data || []);
    } catch (e) {
      setError(e.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  }

  // Build chart data from matter type distribution
  const chartData = [
    { name: 'Open',    value: parseInt(stats?.matters?.open_matters    || 0), fill: '#f59e0b' },
    { name: 'Pending', value: parseInt(stats?.matters?.pending_matters || 0), fill: '#0f172a' },
    { name: 'Closed',  value: parseInt(stats?.matters?.closed_matters  || 0), fill: '#10b981' },
  ];

  if (loading) return (
    <Layout>
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-ink border-t-gold-500 rounded-full animate-spin mx-auto mb-3" />
          <p className="font-bold text-ink/60 uppercase tracking-wide text-sm">Loading…</p>
        </div>
      </div>
    </Layout>
  );

  return (
    <Layout>
      {/* Page header */}
      <div className="flex items-start justify-between mb-8 animate-fadeIn">
        <div>
          <h1 className="font-display text-4xl font-black text-ink leading-tight">Dashboard</h1>
          <p className="text-ink/50 font-medium mt-1">
            Welcome back, {user?.name?.split(' ')[0]}. Here's your practice at a glance.
          </p>
        </div>
        <Link to="/matters/new" className="btn-gold">
          <Plus className="w-4 h-4" /> New Matter
        </Link>
      </div>

      {error && (
        <div className="flex items-start gap-3 bg-crimson-50 border-2 border-crimson-600 p-4 mb-6 animate-fadeIn">
          <AlertCircle className="w-5 h-5 text-crimson-600 flex-shrink-0 mt-0.5" />
          <p className="text-crimson-700 font-medium text-sm">{error}</p>
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-8 animate-fadeIn" style={{ animationDelay: '0.05s' }}>
        <StatCard icon={Scale}      label="Open Matters"   value={stats?.matters?.open_matters   || 0} sub="Active cases"                     accent="gold"    />
        <StatCard icon={Clock}      label="Unbilled Hours" value={parseFloat(stats?.billing?.total_hours || 0).toFixed(1)} sub={`K ${parseFloat(stats?.billing?.total_value || 0).toLocaleString('en-PG', { minimumFractionDigits: 2 })}`} accent="ink" />
        <StatCard icon={DollarSign} label="Trust Holdings" value={`K ${parseFloat(stats?.trust?.total_trust || 0).toLocaleString('en-PG')}`}  sub="Client funds held"                accent="jade"    />
        <StatCard icon={TrendingUp} label="Total Matters"  value={stats?.matters?.total_matters  || 0} sub={`${stats?.matters?.closed_matters || 0} closed`}   accent="crimson" />
      </div>

      {/* Chart + Recent */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn" style={{ animationDelay: '0.1s' }}>

        {/* Bar chart */}
        <div className="card p-6">
          <h2 className="font-display font-bold text-xl text-ink mb-4">Matter Status</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} barSize={36}>
              <CartesianGrid strokeDasharray="3 3" stroke="#0f172a" strokeOpacity={0.08} />
              <XAxis dataKey="name" tick={{ fontFamily: 'DM Sans', fontSize: 12, fontWeight: 700 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontFamily: 'DM Sans', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ border: '2px solid #0f172a', borderRadius: 0, fontFamily: 'DM Sans', fontWeight: 700, fontSize: 12 }}
                cursor={{ fill: 'rgba(15,23,42,0.05)' }}
              />
              <Bar dataKey="value" radius={0}>
                {chartData.map((e, i) => (
                  <rect key={i} fill={e.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Recent matters */}
        <div className="card lg:col-span-2">
          <div className="flex items-center justify-between px-5 py-4 border-b-2 border-ink/10">
            <h2 className="font-display font-bold text-xl text-ink">Recent Matters</h2>
            <Link to="/matters" className="text-xs font-bold uppercase tracking-wide text-gold-600 hover:text-gold-700">
              View All →
            </Link>
          </div>
          {matters.length > 0
            ? matters.map(m => <MatterRow key={m.id} m={m} />)
            : (
              <div className="py-16 text-center">
                <FolderOpen className="w-12 h-12 mx-auto mb-3 text-ink/20" />
                <p className="font-bold text-ink/40">No matters yet</p>
                <Link to="/matters/new" className="btn-gold mt-4 inline-flex"><Plus className="w-4 h-4" /> Create First Matter</Link>
              </div>
            )}
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-6 animate-fadeIn" style={{ animationDelay: '0.15s' }}>
        {[
          { to: '/matters',  icon: FolderOpen,  label: 'Matter Management', desc: 'Create, track & manage cases',      color: 'gold'    },
          { to: '/trust',    icon: DollarSign,  label: 'Trust Accounting',  desc: 'Client fund ledger & transactions', color: 'jade'    },
          { to: '/payroll',  icon: Scale,       label: 'PNG Payroll',       desc: 'SWT & superannuation calculator',   color: 'crimson' },
        ].map(({ to, icon: Icon, label, desc, color }) => (
          <Link key={to} to={to} className="card-hover p-5 flex items-center gap-4 group">
            <div className={`w-12 h-12 border-2 flex items-center justify-center flex-shrink-0 transition-colors
              ${color === 'gold'    ? 'bg-gold-100    border-gold-500    text-gold-700    group-hover:bg-gold-200'    : ''}
              ${color === 'jade'    ? 'bg-jade-100    border-jade-500    text-jade-700    group-hover:bg-jade-200'    : ''}
              ${color === 'crimson' ? 'bg-crimson-100 border-crimson-500 text-crimson-700 group-hover:bg-crimson-200' : ''}`}>
              <Icon className="w-5 h-5" strokeWidth={2.5} />
            </div>
            <div>
              <div className="font-bold text-ink text-sm">{label}</div>
              <div className="text-xs text-ink/50 mt-0.5">{desc}</div>
            </div>
          </Link>
        ))}
      </div>
    </Layout>
  );
}

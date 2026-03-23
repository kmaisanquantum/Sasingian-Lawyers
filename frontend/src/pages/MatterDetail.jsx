import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  FolderOpen, FileText, Calendar, DollarSign,
  Users, BarChart3, Clock, Plus, History,
  CheckCircle2, AlertCircle, ChevronLeft,
  Mail, Paperclip, MessageSquare, Briefcase,
  ArrowUpCircle, ArrowDownCircle, Landmark
} from 'lucide-react';
import Layout from '../components/Layout';
import api    from '../utils/api';

function fmt(n) { return `K ${parseFloat(n || 0).toLocaleString('en-PG', { minimumFractionDigits: 2 })}`; }

export default function MatterDetail() {
  const { id } = useParams();
  const [matter, setMatter]   = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  // Sub-data states
  const [docs, setDocs]       = useState([]);
  const [tasks, setTasks]     = useState([]);
  const [events, setEvents]   = useState([]);
  const [parties, setParties] = useState([]);
  const [notes, setNotes]     = useState([]);
  const [trustHistory, setTrustHistory] = useState([]);
  const [analytics, setAnalytics] = useState(null);

  useEffect(() => { loadMatter(); }, [id]);
  useEffect(() => { if (matter) loadTabData(); }, [activeTab, matter]);

  async function loadMatter() {
    try {
      setLoading(true);
      const { data } = await api.get(`/matters/${id}`);
      setMatter(data.data);
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  }

  async function loadTabData() {
    try {
      if (activeTab === 'documents') {
        const { data } = await api.get(`/matters/${id}/documents`);
        setDocs(data.data);
      } else if (activeTab === 'tasks') {
        const [t, e] = await Promise.all([
          api.get(`/matters/${id}/tasks`),
          api.get(`/matters/${id}/events`)
        ]);
        setTasks(t.data.data);
        setEvents(e.data.data);
      } else if (activeTab === 'parties') {
        const { data } = await api.get(`/matters/${id}/parties`);
        setParties(data.data);
      } else if (activeTab === 'activity') {
        const { data } = await api.get(`/matters/${id}/notes`);
        setNotes(data.data);
      } else if (activeTab === 'billing') {
        const { data: aData } = await api.get(`/matters/${id}/analytics`);
        setAnalytics(aData.data);
        const { data } = await api.get(`/matters/${id}/trust`);
        setTrustHistory(data.data || []);
      }
    } catch (e) { console.error(e); }
  }

  if (loading) return <Layout><div className="py-20 text-center animate-pulse font-bold text-ink/40">Loading matter profile...</div></Layout>;
  if (!matter) return <Layout><div className="py-20 text-center text-crimson-600 font-bold">Matter not found.</div></Layout>;

  const TABS = [
    { id: 'dashboard', label: 'Dashboard/Details', icon: FolderOpen },
    { id: 'parties',   label: 'Parties/Contacts', icon: Users },
    { id: 'documents', label: 'Documents & Content', icon: FileText },
    { id: 'tasks',     label: 'Tasks & Calendar', icon: Calendar },
    { id: 'billing',   label: 'Financials & Billing', icon: DollarSign },
    { id: 'activity',  label: 'Notes & Activity Log', icon: History },
  ];

  return (
    <Layout>
      <div className="mb-6">
        <Link to="/matters" className="text-xs font-bold uppercase tracking-widest text-ink/40 hover:text-gold-600 flex items-center gap-1 mb-4 transition-colors">
          <ChevronLeft className="w-3 h-3" /> Back to List
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="font-mono text-xs font-bold bg-ink text-parchment px-2 py-0.5">{matter.case_number}</span>
              <span className="badge-open">{matter.status}</span>
            </div>
            <h1 className="font-display text-4xl font-black text-ink">{matter.matter_name}</h1>
            <p className="text-ink/50 font-medium mt-1">{matter.client_name} · {matter.matter_type}</p>
          </div>
          <div className="text-right">
            <div className="text-[10px] font-black uppercase tracking-widest text-ink/30 mb-1">Matter Trust Balance</div>
            <div className="text-3xl font-display font-black text-jade-600">{fmt(matter.trust_balance)}</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b-2 border-ink/10 mb-8 gap-8 overflow-x-auto scrollbar-hide">
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`pb-4 flex items-center gap-2 font-display font-bold text-xs uppercase tracking-widest transition-all whitespace-nowrap
              ${activeTab === tab.id ? 'text-gold-600 border-b-2 border-gold-600' : 'text-ink/40 hover:text-ink/60'}`}>
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="animate-fadeIn">
        {/* --- DASHBOARD TAB --- */}
        {activeTab === 'dashboard' && (
          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-12 lg:col-span-8 space-y-6">
              <div className="card p-6">
                <h3 className="font-display font-bold text-xl mb-4">Case Summary</h3>
                <p className="text-ink/70 leading-relaxed">{matter.description || 'No description provided.'}</p>
                <div className="grid grid-cols-2 gap-6 mt-8">
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-ink/30 mb-1">Responsible Partner</div>
                    <div className="font-bold text-ink">{matter.partner_name || 'Not assigned'}</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-ink/30 mb-1">Current Status</div>
                    <div className="font-bold text-ink">{matter.status}</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-span-12 lg:col-span-4 space-y-6">
              <div className="card p-5 bg-ink text-parchment">
                <h3 className="font-display font-bold text-lg mb-4 text-gold-500">Compliance Status</h3>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-jade-500" />
                    <span className="text-sm font-bold">Conflict Check Cleared</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-jade-500" />
                    <span className="text-sm font-bold">Onboarding Complete</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- PARTIES TAB --- */}
        {activeTab === 'parties' && (
          <div className="card">
            <div className="px-5 py-4 border-b-2 border-ink/10 flex items-center justify-between">
              <h3 className="font-display font-bold text-xl">Matter Parties Directory</h3>
              <button className="btn-gold text-xs px-3 py-1.5"><Plus className="w-3 h-3" /> Add Party</button>
            </div>
            <div className="divide-y divide-ink/5">
              {parties.length === 0 ? (
                <div className="py-20 text-center text-ink/20 font-bold">No parties registered for this matter.</div>
              ) : parties.map(p => (
                <div key={p.id} className="p-4 flex items-center gap-4 hover:bg-gold-50/50 transition-colors">
                  <div className="w-10 h-10 bg-gold-100 border border-gold-300 flex items-center justify-center text-gold-700 font-black text-sm">{p.name[0]}</div>
                  <div>
                    <div className="font-bold text-ink text-sm">{p.name}</div>
                    <div className="text-[10px] font-black uppercase text-ink/40">{p.role}</div>
                    {p.contact_info && <div className="text-xs text-ink/60 mt-0.5">{p.contact_info}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* --- DOCUMENTS TAB --- */}
        {activeTab === 'documents' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="font-display font-bold text-2xl">Matter Documents</h2>
              <div className="flex gap-2">
                <button className="btn-secondary text-xs px-3 py-1.5"><Mail className="w-3 h-3" /> Save Emails</button>
                <button className="btn-gold text-xs px-3 py-1.5"><Plus className="w-3 h-3" /> Upload File</button>
              </div>
            </div>
            <div className="card">
              <div className="grid grid-cols-12 gap-3 px-5 py-3 border-b-2 border-ink/10 bg-ink/[0.03] text-[10px] font-black uppercase tracking-widest text-ink/30">
                <div className="col-span-6">File Name</div>
                <div className="col-span-2">Category</div>
                <div className="col-span-2">Uploaded</div>
                <div className="col-span-2 text-right">Size</div>
              </div>
              {docs.length === 0 ? (
                <div className="py-20 text-center text-ink/30 font-bold">No documents filed in this matter.</div>
              ) : docs.map(d => (
                <div key={d.id} className="grid grid-cols-12 gap-3 px-5 py-4 border-b border-ink/5 items-center hover:bg-gold-50/50 transition-colors cursor-pointer">
                  <div className="col-span-6 flex items-center gap-3">
                    <Paperclip className="w-4 h-4 text-ink/20" />
                    <span className="text-sm font-bold text-ink">{d.file_name}</span>
                  </div>
                  <div className="col-span-2"><span className="badge">{d.category}</span></div>
                  <div className="col-span-2 text-xs font-medium text-ink/50">{new Date(d.created_at).toLocaleDateString()}</div>
                  <div className="col-span-2 text-right text-xs font-mono text-ink/40">2.4 MB</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* --- TASKS & CALENDAR TAB --- */}
        {activeTab === 'tasks' && (
          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-12 lg:col-span-7 space-y-6">
              <div className="card">
                <div className="px-5 py-4 border-b-2 border-ink/10 flex items-center justify-between">
                  <h3 className="font-display font-bold text-xl">Calendar & Deadlines</h3>
                  <button className="p-1 hover:bg-ink/5 rounded"><Plus className="w-4 h-4 text-gold-600" /></button>
                </div>
                <div className="divide-y divide-ink/5">
                  {matter.statute_of_limitations && (
                    <div className="p-5 flex items-start gap-4 bg-crimson-50/50">
                      <div className="w-12 h-12 bg-crimson-600 text-parchment flex flex-col items-center justify-center flex-shrink-0">
                        <span className="text-[10px] font-black uppercase">SOL</span>
                        <span className="text-xl font-display font-black leading-none">{new Date(matter.statute_of_limitations).getDate()}</span>
                      </div>
                      <div>
                        <div className="font-bold text-crimson-900">Statute of Limitations</div>
                        <div className="text-xs text-crimson-700 font-bold mt-1 uppercase tracking-widest">{new Date(matter.statute_of_limitations).toLocaleDateString()}</div>
                      </div>
                    </div>
                  )}
                  {events.length === 0 && !matter.statute_of_limitations ? <div className="p-10 text-center text-ink/20 font-bold">No upcoming deadlines</div> : events.map(e => (
                    <div key={e.id} className="p-5 flex items-start gap-4">
                      <div className="w-12 h-12 bg-ink text-parchment flex flex-col items-center justify-center flex-shrink-0">
                        <span className="text-[10px] font-black uppercase">{new Date(e.start_time).toLocaleString('default', { month: 'short' })}</span>
                        <span className="text-xl font-display font-black leading-none">{new Date(e.start_time).getDate()}</span>
                      </div>
                      <div>
                        <div className="font-bold text-ink">{e.title}</div>
                        <div className="text-xs text-ink/50 font-medium mt-0.5">{e.event_type} · {e.location || 'No location'}</div>
                        <div className="text-xs font-bold text-gold-600 mt-1 uppercase tracking-widest">{new Date(e.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="col-span-12 lg:col-span-5 space-y-6">
              <div className="card">
                <div className="px-5 py-4 border-b-2 border-ink/10 flex items-center justify-between">
                  <h3 className="font-display font-bold text-xl">Task Management</h3>
                  <button className="p-1 hover:bg-ink/5 rounded"><Plus className="w-4 h-4 text-gold-600" /></button>
                </div>
                <div className="p-2 space-y-1">
                  {tasks.length === 0 ? <div className="p-10 text-center text-ink/20 font-bold">No tasks assigned</div> : tasks.map(t => (
                    <div key={t.id} className="flex items-center gap-3 p-3 hover:bg-gold-50 transition-colors group">
                      <input type="checkbox" className="w-4 h-4 accent-gold-600" checked={t.status === 'Completed'} readOnly />
                      <div className="flex-1 min-w-0">
                        <div className={`text-sm font-bold truncate ${t.status === 'Completed' ? 'line-through text-ink/30' : 'text-ink'}`}>{t.title}</div>
                        {t.due_date && <div className="text-[10px] font-black text-crimson-600 uppercase mt-0.5">Due: {t.due_date}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- TIME & BILLING TAB --- */}
        {activeTab === 'billing' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="card p-5 border-l-4 border-gold-500">
                <div className="text-[10px] font-black uppercase tracking-widest text-ink/30 mb-1">Unbilled WIP</div>
                <div className="text-2xl font-display font-black text-ink">{fmt(matter.unbilled_amount)}</div>
              </div>
              <div className="card p-5 border-l-4 border-jade-500">
                <div className="text-[10px] font-black uppercase tracking-widest text-ink/30 mb-1">Trust Balance</div>
                <div className="text-2xl font-display font-black text-jade-600">{fmt(matter.trust_balance)}</div>
              </div>
              <div className="card p-5 border-l-4 border-ink">
                <div className="text-[10px] font-black uppercase tracking-widest text-ink/30 mb-1">Budget Amount</div>
                <div className="text-2xl font-display font-black text-ink">{fmt(matter.budget_amount)}</div>
              </div>
            </div>

            {/* Matter Trust Ledger */}
            <div className="card">
              <div className="px-5 py-4 border-b-2 border-ink/10 flex items-center justify-between">
                <h3 className="font-display font-bold text-xl flex items-center gap-2 text-jade-700">
                  <Landmark className="w-5 h-5" /> Matter Trust Ledger
                </h3>
              </div>
              <div className="bg-gold-50/50 p-4 border-b border-ink/5">
                <p className="text-xs font-bold text-gold-800">Hard-Block Safeguard Active</p>
                <p className="text-[10px] text-gold-700 mt-0.5 uppercase tracking-wide">Withdrawals exceeding K {parseFloat(matter.trust_balance).toFixed(2)} are restricted.</p>
              </div>
              <div className="divide-y divide-ink/5">
                {trustHistory.length === 0 ? <div className="p-8 text-center text-ink/20 font-bold text-sm">No trust transactions recorded</div> : trustHistory.map(t => (
                  <div key={t.id} className="grid grid-cols-12 gap-3 px-5 py-3 items-center">
                    <div className="col-span-2 text-xs font-mono text-ink/40">{t.transaction_date}</div>
                    <div className="col-span-1">
                      {t.transaction_type === 'Deposit' ? <ArrowUpCircle className="w-4 h-4 text-jade-600" /> : <ArrowDownCircle className="w-4 h-4 text-crimson-600" />}
                    </div>
                    <div className="col-span-5 text-sm font-medium text-ink">{t.description}</div>
                    <div className={`col-span-2 text-right font-mono font-bold ${t.transaction_type === 'Deposit' ? 'text-jade-600' : 'text-crimson-600'}`}>
                      {t.transaction_type === 'Deposit' ? '+' : '-'} {fmt(Math.abs(t.amount))}
                    </div>
                    <div className="col-span-2 text-right font-mono font-black text-ink text-xs">{fmt(t.balance)}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card">
              <div className="px-5 py-4 border-b-2 border-ink/10 flex items-center justify-between">
                <h3 className="font-display font-bold text-xl">Work in Progress & Reimbursables</h3>
                <button className="btn-gold text-xs px-3 py-1.5"><Clock className="w-3 h-3" /> Record Time</button>
              </div>
              <div className="divide-y divide-ink/5">
                {matter.time_entries?.length === 0 ? <div className="p-10 text-center text-ink/20 font-bold">No time or expenses recorded</div> : matter.time_entries?.map(te => (
                  <div key={te.id} className="p-4 grid grid-cols-12 gap-3 items-center">
                    <div className="col-span-2 text-xs font-mono text-ink/40">{te.entry_date}</div>
                    <div className="col-span-6">
                      <div className="text-sm font-bold text-ink truncate">{te.description}</div>
                      <div className="text-[10px] text-ink/40 font-medium uppercase tracking-widest">{te.user_name}</div>
                    </div>
                    <div className="col-span-2 text-center text-sm font-black">{te.hours}h</div>
                    <div className="col-span-2 text-right text-sm font-mono font-bold text-ink">{fmt(te.hours * te.hourly_rate)}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* --- ACTIVITY LOG TAB --- */}
        {activeTab === 'activity' && (
          <div className="card">
            <div className="px-5 py-4 border-b-2 border-ink/10 flex items-center justify-between">
              <h3 className="font-display font-bold text-xl">Chronological Activity Log</h3>
              <button className="btn-secondary text-xs px-3 py-1.5"><MessageSquare className="w-3 h-3" /> Add Entry</button>
            </div>
            <div className="p-5 space-y-8">
              {notes.length === 0 ? <div className="py-20 text-center text-ink/20 font-bold">No activity history for this matter.</div> : notes.map(n => (
                <div key={n.id} className="flex gap-6 relative">
                  <div className="w-10 h-10 bg-ink/5 border border-ink/10 flex items-center justify-center flex-shrink-0 z-10 rounded-sm">
                    <History className="w-5 h-5 text-ink/30" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm text-ink/80 leading-relaxed bg-parchment p-4 border-2 border-ink/5 rounded-sm shadow-sm relative
                      after:absolute after:w-3 after:h-3 after:bg-parchment after:border-l-2 after:border-b-2 after:border-ink/5 after:-left-[7px] after:top-3 after:rotate-45">
                      {n.content}
                    </div>
                    <div className="text-[10px] font-bold text-ink/30 mt-2 uppercase tracking-widest flex items-center gap-2">
                      <span className="text-gold-600">{n.author_name}</span>
                      <span>·</span>
                      <span>{new Date(n.created_at).toLocaleString('en-PG', { dateStyle: 'long', timeStyle: 'short' })}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

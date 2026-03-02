import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  FolderOpen, FileText, Calendar, DollarSign,
  Users, BarChart3, Clock, Plus, History,
  CheckCircle2, AlertCircle, ChevronLeft,
  Mail, Paperclip, MessageSquare, Briefcase
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
      } else if (activeTab === 'workflow') {
        const [t, e] = await Promise.all([
          api.get(`/matters/${id}/tasks`),
          api.get(`/matters/${id}/events`)
        ]);
        setTasks(t.data.data);
        setEvents(e.data.data);
      } else if (activeTab === 'parties') {
        const [p, n] = await Promise.all([
          api.get(`/matters/${id}/parties`),
          api.get(`/matters/${id}/notes`)
        ]);
        setParties(p.data.data);
        setNotes(n.data.data);
      } else if (activeTab === 'litigation') {
        const { data } = await api.get(`/matters/${id}/analytics`);
        setAnalytics(data.data);
      }
    } catch (e) { console.error(e); }
  }

  if (loading) return <Layout><div className="py-20 text-center animate-pulse font-bold text-ink/40">Loading matter profile...</div></Layout>;
  if (!matter) return <Layout><div className="py-20 text-center text-crimson-600 font-bold">Matter not found.</div></Layout>;

  const TABS = [
    { id: 'dashboard',  label: 'Dashboard',   icon: FolderOpen },
    { id: 'documents',  label: 'Documents',   icon: FileText },
    { id: 'workflow',   label: 'Workflow',    icon: Calendar },
    { id: 'financials', label: 'Financials',  icon: DollarSign },
    { id: 'parties',    label: 'Communication', icon: Users },
    { id: 'litigation', label: 'Litigation & Analytics', icon: BarChart3 },
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
                    <div className="text-[10px] font-black uppercase tracking-widest text-ink/30 mb-1">Assigned Associate</div>
                    <div className="font-bold text-ink">{matter.associate_name || 'Not assigned'}</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-span-12 lg:col-span-4 space-y-6">
              <div className="card p-5 bg-ink text-parchment">
                <h3 className="font-display font-bold text-lg mb-4 text-gold-500">Intake Compliance</h3>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-jade-500" />
                    <span className="text-sm font-bold">Conflict Check Cleared</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-jade-500" />
                    <span className="text-sm font-bold">Client Onboarding Complete</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-jade-500" />
                    <span className="text-sm font-bold">Terms of Engagement Signed</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- DOCUMENTS TAB --- */}
        {activeTab === 'documents' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="font-display font-bold text-2xl">Document Repository</h2>
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
                <div className="py-20 text-center text-ink/30 font-bold">No documents filed yet.</div>
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

        {/* --- WORKFLOW TAB --- */}
        {activeTab === 'workflow' && (
          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-12 lg:col-span-7 space-y-6">
              <div className="card">
                <div className="px-5 py-4 border-b-2 border-ink/10 flex items-center justify-between">
                  <h3 className="font-display font-bold text-xl">Deadlines & Calendar</h3>
                  <button className="p-1 hover:bg-ink/5 rounded"><Plus className="w-4 h-4 text-gold-600" /></button>
                </div>
                <div className="divide-y divide-ink/5">
                  {events.length === 0 ? <div className="p-10 text-center text-ink/20 font-bold">No upcoming deadlines</div> : events.map(e => (
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
                  <h3 className="font-display font-bold text-xl">Task List</h3>
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

        {/* --- FINANCIALS TAB --- */}
        {activeTab === 'financials' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="card p-5 border-l-4 border-gold-500">
                <div className="text-[10px] font-black uppercase tracking-widest text-ink/30 mb-1">Unbilled WIP</div>
                <div className="text-2xl font-display font-black text-ink">{fmt(matter.unbilled_amount)}</div>
              </div>
              <div className="card p-5 border-l-4 border-primary">
                <div className="text-[10px] font-black uppercase tracking-widest text-ink/30 mb-1">Total Billed</div>
                <div className="text-2xl font-display font-black text-ink">{fmt(0)}</div>
              </div>
              <div className="card p-5 border-l-4 border-jade-500">
                <div className="text-[10px] font-black uppercase tracking-widest text-ink/30 mb-1">Budget Utilization</div>
                <div className="text-2xl font-display font-black text-ink">{matter.budget_amount ? `${Math.round((matter.unbilled_amount / matter.budget_amount) * 100)}%` : 'N/A'}</div>
              </div>
            </div>

            <div className="card">
              <div className="px-5 py-4 border-b-2 border-ink/10 flex items-center justify-between">
                <h3 className="font-display font-bold text-xl">Recent Time Entries</h3>
                <button className="btn-gold text-xs px-3 py-1.5"><Clock className="w-3 h-3" /> Record Time</button>
              </div>
              <div className="divide-y divide-ink/5">
                {matter.time_entries?.length === 0 ? <div className="p-10 text-center text-ink/20 font-bold">No time recorded</div> : matter.time_entries?.slice(0,5).map(te => (
                  <div key={te.id} className="p-4 grid grid-cols-12 gap-3 items-center">
                    <div className="col-span-2 text-xs font-mono text-ink/40">{te.entry_date}</div>
                    <div className="col-span-6">
                      <div className="text-sm font-bold text-ink truncate">{te.description}</div>
                      <div className="text-[10px] text-ink/40 font-medium">{te.user_name}</div>
                    </div>
                    <div className="col-span-2 text-center text-sm font-black">{te.hours}h</div>
                    <div className="col-span-2 text-right text-sm font-mono font-bold text-ink">{fmt(te.hours * te.hourly_rate)}</div>
                  </div>
                ))}
              </div>
              <div className="px-5 py-3 bg-ink/[0.02] border-t border-ink/5 text-center">
                <Link to="/account" className="text-[10px] font-black uppercase tracking-widest text-gold-600 hover:text-gold-700">View Comprehensive Ledger →</Link>
              </div>
            </div>
          </div>
        )}

        {/* --- PARTIES TAB --- */}
        {activeTab === 'parties' && (
          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-12 lg:col-span-4 space-y-6">
              <div className="card">
                <div className="px-5 py-4 border-b-2 border-ink/10 flex items-center justify-between">
                  <h3 className="font-display font-bold text-xl">Parties & Contacts</h3>
                  <button className="p-1 hover:bg-ink/5 rounded"><Plus className="w-4 h-4 text-gold-600" /></button>
                </div>
                <div className="divide-y divide-ink/5">
                  {parties.length === 0 ? <div className="p-10 text-center text-ink/20 font-bold">No parties listed</div> : parties.map(p => (
                    <div key={p.id} className="p-4 flex items-center gap-4 hover:bg-gold-50/50 transition-colors">
                      <div className="w-10 h-10 bg-gold-100 border border-gold-300 flex items-center justify-center text-gold-700 font-black text-sm">{p.name[0]}</div>
                      <div>
                        <div className="font-bold text-ink text-sm">{p.name}</div>
                        <div className="text-[10px] font-black uppercase text-ink/40">{p.role}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="col-span-12 lg:col-span-8 space-y-6">
              <div className="card">
                <div className="px-5 py-4 border-b-2 border-ink/10 flex items-center justify-between">
                  <h3 className="font-display font-bold text-xl">Activity Log & Notes</h3>
                  <button className="btn-secondary text-xs px-3 py-1.5"><MessageSquare className="w-3 h-3" /> Add Note</button>
                </div>
                <div className="p-5 space-y-6">
                  {notes.length === 0 ? <div className="py-10 text-center text-ink/20 font-bold">No activity logged</div> : notes.map(n => (
                    <div key={n.id} className="flex gap-4">
                      <div className="w-8 h-8 bg-ink/5 border border-ink/10 flex items-center justify-center flex-shrink-0"><History className="w-4 h-4 text-ink/30" /></div>
                      <div>
                        <div className="text-sm text-ink/80 leading-relaxed bg-parchment p-3 border-2 border-ink/5 relative after:absolute after:w-2 after:h-2 after:bg-parchment after:border-l-2 after:border-b-2 after:border-ink/5 after:-left-[5px] after:top-3 after:rotate-45">{n.content}</div>
                        <div className="text-[10px] font-bold text-ink/30 mt-2 uppercase tracking-widest">{n.author_name} · {new Date(n.created_at).toLocaleString()}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- LITIGATION TAB --- */}
        {activeTab === 'litigation' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="card p-6">
                <h3 className="font-display font-bold text-xl mb-4 flex items-center gap-2"><Briefcase className="w-5 h-5 text-gold-600" /> Evidence & Trial Prep</h3>
                <div className="space-y-3">
                  {['Pleadings Bundle','Correspondence Log','Expert Evidence','Exhibits List','Witness Statements'].map(cat => (
                    <div key={cat} className="flex items-center justify-between p-3 border-2 border-ink/5 hover:border-gold-500/30 transition-all cursor-pointer group">
                      <span className="text-sm font-bold text-ink/70 group-hover:text-ink">{cat}</span>
                      <ChevronLeft className="w-3 h-3 rotate-180 text-ink/20 group-hover:text-gold-600" />
                    </div>
                  ))}
                </div>
              </div>
              <div className="card p-6 border-l-4 border-crimson-600">
                <h3 className="font-display font-bold text-xl mb-4 flex items-center gap-2"><BarChart3 className="w-5 h-5 text-crimson-600" /> Matter Analytics</h3>
                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between text-xs font-black uppercase tracking-widest text-ink/40 mb-2">
                      <span>Budget vs. Actual</span>
                      <span>{analytics ? Math.round((matter.unbilled_amount / analytics.budget) * 100) : 0}%</span>
                    </div>
                    <div className="h-3 bg-ink/5 border border-ink/10 overflow-hidden">
                      <div className="h-full bg-crimson-600" style={{ width: `${analytics ? Math.min(100, (matter.unbilled_amount / analytics.budget) * 100) : 0}%` }}></div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-jade-50 border-2 border-jade-600/20">
                      <div className="text-[10px] font-black uppercase tracking-widest text-jade-700/50 mb-1">Realized Revenue</div>
                      <div className="font-display font-black text-jade-700">{fmt(analytics?.realizedRevenue)}</div>
                    </div>
                    <div className="p-3 bg-ink/5 border-2 border-ink/10">
                      <div className="text-[10px] font-black uppercase tracking-widest text-ink/30 mb-1">Profit Margin</div>
                      <div className="font-display font-black text-ink">{analytics?.realizedRevenue ? `${Math.round(((analytics.realizedRevenue - analytics.totalExpenses) / analytics.realizedRevenue) * 100)}%` : '0%'}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="card p-6 bg-crimson-50 border-2 border-crimson-600/20">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-display font-bold text-xl text-crimson-900">Matter Closure Protocols</h3>
                  <p className="text-sm text-crimson-700 mt-1">Initiate final billing and document archiving procedures.</p>
                </div>
                <button className="btn-secondary border-crimson-600 text-crimson-700 hover:bg-crimson-100">Close Matter & Archive</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

import { useState, useEffect } from 'react';
import { Users, UserPlus, AlertCircle } from 'lucide-react';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

const ROLE_BADGE = {
  Admin:     'bg-crimson-100 text-crimson-700 border-crimson-600',
  Partner:   'bg-gold-100    text-gold-700    border-gold-600',
  Associate: 'bg-jade-100    text-jade-700    border-jade-600',
  Staff:     'bg-ink/10      text-ink         border-ink/40',
};

export default function Staff() {
  const { user: me }              = useAuth();
  const [staff,   setStaff]       = useState([]);
  const [modal,   setModal]       = useState(false);
  const [form,    setForm]        = useState({ name: '', email: '', password: '', role: 'Associate', hourlyRate: '', annualSalary: '' });
  const [loading, setLoading]     = useState(true);
  const [error,   setError]       = useState('');
  const [success, setSuccess]     = useState('');

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const { data } = await api.get('/auth/users');
      setStaff(data.data || []);
    } catch (e) { setError(e.response?.data?.message || e.message); }
    finally { setLoading(false); }
  }

  async function createUser(e) {
    e.preventDefault();
    setError(''); setSuccess(''); setLoading(true);
    try {
      await api.post('/auth/register', { ...form, hourlyRate: parseFloat(form.hourlyRate || 0), annualSalary: parseFloat(form.annualSalary || 0) });
      setSuccess('Staff member created successfully.');
      setModal(false);
      setForm({ name: '', email: '', password: '', role: 'Associate', hourlyRate: '', annualSalary: '' });
      load();
    } catch (e) {
      setError(e.response?.data?.message || e.message);
    } finally { setLoading(false); }
  }

  return (
    <Layout>
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="font-display text-4xl font-black text-ink">Staff / HR</h1>
          <p className="text-ink/50 font-medium mt-1">Team members and access management</p>
        </div>
        {me?.role === 'Admin' && (
          <button onClick={() => setModal(true)} className="btn-gold">
            <UserPlus className="w-4 h-4" /> Add Staff
          </button>
        )}
      </div>

      {(error || success) && (
        <div className={`flex items-start gap-3 border-2 p-4 mb-5
          ${error ? 'bg-crimson-50 border-crimson-600' : 'bg-jade-50 border-jade-600'}`}>
          <AlertCircle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${error ? 'text-crimson-600' : 'text-jade-600'}`} />
          <p className={`font-medium text-sm ${error ? 'text-crimson-700' : 'text-jade-700'}`}>{error || success}</p>
        </div>
      )}

      <div className="card">
        <div className="grid grid-cols-12 gap-3 px-5 py-3 border-b-2 border-ink/10 bg-ink/[0.03]">
          {['Name', 'Email', 'Role', 'Hourly Rate', 'Status'].map((h, i) => (
            <div key={h} className={`text-xs font-black uppercase tracking-widest text-ink/50
              ${i===0?'col-span-3':''} ${i===1?'col-span-4':''} ${i===2?'col-span-2':''} 
              ${i===3?'col-span-2 text-right':''} ${i===4?'col-span-1 text-center':''}`}>{h}</div>
          ))}
        </div>

        {loading ? (
          <div className="py-12 text-center">
            <div className="w-8 h-8 border-3 border-ink border-t-gold-500 rounded-full animate-spin mx-auto mb-3" />
            <p className="text-ink/50 font-medium text-sm">Loading staff…</p>
          </div>
        ) : staff.map(s => (
          <div key={s.id} className="grid grid-cols-12 gap-3 px-5 py-4 border-b border-ink/5 hover:bg-gold-50/50 transition-colors items-center">
            <div className="col-span-3">
              <div className="font-bold text-ink text-sm">{s.name}</div>
              {s.id === me?.id && <div className="text-xs text-gold-600 font-bold">(You)</div>}
            </div>
            <div className="col-span-4 text-sm text-ink/60 font-medium truncate">{s.email}</div>
            <div className="col-span-2">
              <span className={`badge ${ROLE_BADGE[s.role] || 'badge'}`}>{s.role}</span>
            </div>
            <div className="col-span-2 font-mono text-sm font-bold text-right text-ink/70">
              {s.hourly_rate > 0 ? `K ${parseFloat(s.hourly_rate).toFixed(2)}/hr` : '—'}
            </div>
            <div className="col-span-1 text-center">
              <span className={`inline-block w-2 h-2 rounded-full ${s.is_active ? 'bg-jade-500' : 'bg-crimson-400'}`} />
            </div>
          </div>
        ))}

        {!loading && staff.length === 0 && (
          <div className="py-12 text-center">
            <Users className="w-12 h-12 mx-auto mb-3 text-ink/20" />
            <p className="font-bold text-ink/40">No staff found</p>
          </div>
        )}
      </div>

      {/* Add Staff Modal */}
      {modal && (
        <div className="fixed inset-0 bg-ink/60 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-md p-6 animate-fadeIn">
            <h3 className="font-display font-bold text-2xl text-ink mb-5">Add Staff Member</h3>
            <form onSubmit={createUser} className="space-y-4">
              <div>
                <label className="label">Full Name</label>
                <input type="text" required className="input" placeholder="e.g. Mary Kila"
                  value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} />
              </div>
              <div>
                <label className="label">Email</label>
                <input type="email" required className="input" placeholder="mary@sasingianlawyers.com"
                  value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))} />
              </div>
              <div>
                <label className="label">Temporary Password</label>
                <input type="password" required minLength={8} className="input" placeholder="Min 8 characters"
                  value={form.password} onChange={e => setForm(f => ({...f, password: e.target.value}))} />
              </div>
              <div>
                <label className="label">Role</label>
                <select className="input" value={form.role} onChange={e => setForm(f => ({...f, role: e.target.value}))}>
                  {['Admin','Partner','Associate','Staff'].map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Hourly Rate (K)</label>
                  <input type="number" min="0" step="0.01" className="input font-mono" placeholder="0.00"
                    value={form.hourlyRate} onChange={e => setForm(f => ({...f, hourlyRate: e.target.value}))} />
                </div>
                <div>
                  <label className="label">Annual Salary (K)</label>
                  <input type="number" min="0" step="0.01" className="input font-mono" placeholder="0.00"
                    value={form.annualSalary} onChange={e => setForm(f => ({...f, annualSalary: e.target.value}))} />
                </div>
              </div>
              {error && <p className="text-crimson-700 text-sm font-medium bg-crimson-50 border-2 border-crimson-600 p-2">{error}</p>}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setModal(false); setError(''); }} className="btn-secondary flex-1 justify-center">Cancel</button>
                <button type="submit" disabled={loading} className="btn-gold flex-1 justify-center">
                  {loading ? 'Creating…' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}

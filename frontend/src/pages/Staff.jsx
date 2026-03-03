import React, { useState, useEffect } from 'react';
import { UserPlus, Trash2, Key, AlertCircle, Users, Edit } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import api from '../utils/api';

const ROLE_BADGE = {
  'Admin':     'bg-ink text-gold-500 border-ink',
  'Partner':   'bg-gold-500 text-ink border-gold-600',
  'Associate': 'bg-gold-100 text-gold-700 border-gold-300',
  'Staff':     'bg-ink/5 text-ink/60 border-ink/10'
};

export default function Staff() {
  const { user: me } = useAuth();
  const [staff, setStaff]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [modal, setModal]         = useState(false);
  const [editModal, setEditModal] = useState(null);
  const [passModal, setPassModal] = useState(null);
  const [form, setForm]           = useState({
    name: '', email: '', password: '', role: 'Associate', hourlyRate: '', annualSalary: '',
    designation: '', bankName: '', bankAccountNumber: '', bankAccountName: '', barDues: ''
  });
  const [newPass, setNewPass]     = useState('');
  const [error, setError]         = useState('');
  const [success, setSuccess]     = useState('');

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const { data } = await api.get('/auth/users');
      setStaff(data.data || []);
    } catch (e) { setError(e.response?.data?.message || e.message); }
    finally { setLoading(false); }
  }

  async function deleteUser(id) {
    if (!window.confirm('Are you sure you want to delete this staff member? This action cannot be undone.')) return;
    setError(''); setSuccess(''); setLoading(true);
    try {
      await api.delete(`/auth/users/${id}`);
      setSuccess('Staff member deleted successfully.');
      load();
    } catch (e) {
      setError(e.response?.data?.message || e.message);
    } finally { setLoading(false); }
  }

  async function resetPassword(e) {
    e.preventDefault();
    if (!passModal) return;
    setError(''); setSuccess(''); setLoading(true);
    try {
      await api.put(`/auth/users/${passModal.id}/password`, { newPassword: newPass });
      setSuccess(`Password for ${passModal.name} updated successfully.`);
      setPassModal(null);
      setNewPass('');
    } catch (e) {
      setError(e.response?.data?.message || e.message);
    } finally { setLoading(false); }
  }

  async function createUser(e) {
    e.preventDefault();
    setError(''); setSuccess(''); setLoading(true);
    try {
      await api.post('/auth/register', {
        ...form,
        hourlyRate: parseFloat(form.hourlyRate || 0),
        annualSalary: parseFloat(form.annualSalary || 0),
        barDues: parseFloat(form.barDues || 0)
      });
      setSuccess('Staff member created successfully.');
      setModal(false);
      resetForm();
      load();
    } catch (e) {
      setError(e.response?.data?.message || e.message);
    } finally { setLoading(false); }
  }

  async function updateUser(e) {
    e.preventDefault();
    setError(''); setSuccess(''); setLoading(true);
    try {
      await api.put(`/auth/users/${editModal.id}`, {
        ...form,
        hourlyRate: parseFloat(form.hourlyRate || 0),
        annualSalary: parseFloat(form.annualSalary || 0),
        barDues: parseFloat(form.barDues || 0)
      });
      setSuccess('Staff member updated successfully.');
      setEditModal(null);
      resetForm();
      load();
    } catch (e) {
      setError(e.response?.data?.message || e.message);
    } finally { setLoading(false); }
  }

  const resetForm = () => setForm({
    name: '', email: '', password: '', role: 'Associate', hourlyRate: '', annualSalary: '',
    designation: '', bankName: '', bankAccountNumber: '', bankAccountName: '', barDues: ''
  });

  const openEdit = (s) => {
    setEditModal(s);
    setForm({
      name: s.name, email: s.email, role: s.role,
      hourlyRate: s.hourly_rate, annualSalary: s.annual_salary,
      designation: s.designation || '',
      bankName: s.bank_name || '',
      bankAccountNumber: s.bank_account_number || '',
      bankAccountName: s.bank_account_name || '',
      barDues: s.bar_dues || ''
    });
  };

  return (
    <Layout>
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="font-display text-4xl font-black text-ink">Staff / HR</h1>
          <p className="text-ink/50 font-medium mt-1">Team members and access management</p>
        </div>
        {me?.role === 'Admin' && (
          <button onClick={() => { resetForm(); setModal(true); }} className="btn-gold">
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
          {['Name', 'Email', 'Role', 'Hourly Rate', 'Status', ''].map((h, i) => (
            <div key={i} className={`text-xs font-black uppercase tracking-widest text-ink/50
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
              <div className="text-xs text-ink/40 font-medium">{s.designation || 'No designation'}</div>
              {s.id === me?.id && <div className="text-xs text-gold-600 font-bold">(You)</div>}
            </div>
            <div className="col-span-4 text-sm text-ink/60 font-medium truncate">{s.email}</div>
            <div className="col-span-2">
              <span className={`badge ${ROLE_BADGE[s.role] || 'badge'}`}>{s.role}</span>
            </div>
            <div className="col-span-2 font-mono text-sm font-bold text-right text-ink/70">
              {s.hourly_rate > 0 ? `K ${parseFloat(s.hourly_rate).toFixed(2)}/hr` : `Fixed K ${parseFloat(s.annual_salary).toLocaleString()}`}
            </div>
            <div className="col-span-1 text-center">
              <span className={`inline-block w-2 h-2 rounded-full ${s.is_active ? 'bg-jade-500' : 'bg-crimson-400'}`} />
            </div>
            <div className="col-span-1 text-right flex justify-end gap-1">
              {me?.role === 'Admin' && (
                <>
                  <button onClick={() => openEdit(s)} className="p-2 text-ink/30 hover:text-gold-600 transition-colors" title="Edit Staff">
                    <Edit className="w-4 h-4" />
                  </button>
                  <button onClick={() => setPassModal(s)} className="p-2 text-ink/30 hover:text-gold-600 transition-colors" title="Reset Password">
                    <Key className="w-4 h-4" />
                  </button>
                  {s.id !== me?.id && (
                    <button onClick={() => deleteUser(s.id)} className="p-2 text-ink/30 hover:text-crimson-600 transition-colors" title="Delete User">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </>
              )}
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

      {/* Staff Modal (Add/Edit) */}
      {(modal || editModal) && (
        <div className="fixed inset-0 bg-ink/60 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="card w-full max-w-2xl p-6 animate-fadeIn my-auto">
            <h3 className="font-display font-bold text-2xl text-ink mb-5">{modal ? 'Add Staff Member' : 'Edit Staff Member'}</h3>
            <form onSubmit={modal ? createUser : updateUser} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Full Name</label>
                  <input type="text" required className="input" placeholder="e.g. Mary Kila"
                    value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} />
                </div>
                <div>
                  <label className="label">Email</label>
                  <input type="email" required className="input" placeholder="mary@sasingianlawyers.com"
                    value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))} disabled={!!editModal} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Designation</label>
                  <input type="text" className="input" placeholder="e.g. Senior Associate"
                    value={form.designation} onChange={e => setForm(f => ({...f, designation: e.target.value}))} />
                </div>
                <div>
                  <label className="label">Role</label>
                  <select className="input" value={form.role} onChange={e => setForm(f => ({...f, role: e.target.value}))}>
                    {['Admin','Partner','Associate','Staff'].map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              </div>

              {modal && (
                <div>
                  <label className="label">Temporary Password</label>
                  <input type="password" required minLength={8} className="input" placeholder="Min 8 characters"
                    value={form.password} onChange={e => setForm(f => ({...f, password: e.target.value}))} />
                </div>
              )}

              <div className="grid grid-cols-3 gap-3">
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
                <div>
                  <label className="label">Bar Dues (K/period)</label>
                  <input type="number" min="0" step="0.01" className="input font-mono" placeholder="0.00"
                    value={form.barDues} onChange={e => setForm(f => ({...f, barDues: e.target.value}))} />
                </div>
              </div>

              <div className="pt-4 border-t-2 border-ink/5">
                <h4 className="text-xs font-black uppercase tracking-widest text-ink/40 mb-3">Bank Details</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="label">Bank Account Name</label>
                    <input type="text" className="input" placeholder="e.g. MARY KILA"
                      value={form.bankAccountName} onChange={e => setForm(f => ({...f, bankAccountName: e.target.value}))} />
                  </div>
                  <div>
                    <label className="label">Bank Name</label>
                    <input type="text" className="input" placeholder="e.g. BSP"
                      value={form.bankName} onChange={e => setForm(f => ({...f, bankName: e.target.value}))} />
                  </div>
                  <div>
                    <label className="label">Account Number</label>
                    <input type="text" className="input" placeholder="e.g. 1001234567"
                      value={form.bankAccountNumber} onChange={e => setForm(f => ({...f, bankAccountNumber: e.target.value}))} />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setModal(false); setEditModal(null); setError(''); }} className="btn-secondary flex-1 justify-center">Cancel</button>
                <button type="submit" disabled={loading} className="btn-gold flex-1 justify-center">
                  {loading ? 'Saving…' : (modal ? 'Create User' : 'Update User')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {passModal && (
        <div className="fixed inset-0 bg-ink/60 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-md p-6 animate-fadeIn">
            <h3 className="font-display font-bold text-2xl text-ink mb-1">Reset Password</h3>
            <p className="text-ink/50 text-sm font-medium mb-5">Changing password for <b>{passModal.name}</b></p>
            <form onSubmit={resetPassword} className="space-y-4">
              <div>
                <label className="label">New Password</label>
                <input type="password" required minLength={8} className="input" placeholder="Min 8 characters"
                  autoFocus value={newPass} onChange={e => setNewPass(e.target.value)} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setPassModal(null); setError(''); setNewPass(''); }} className="btn-secondary flex-1 justify-center">Cancel</button>
                <button type="submit" disabled={loading} className="btn-gold flex-1 justify-center">
                  {loading ? 'Updating…' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}

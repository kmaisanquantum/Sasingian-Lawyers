import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, ShieldCheck, AlertCircle, CheckCircle2, ChevronRight, ChevronLeft, Landmark } from 'lucide-react';
import Layout from '../components/Layout';
import api    from '../utils/api';

export default function NewMatter() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1: Conflict Check, 2: Details
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Step 1: Conflict Check
  const [conflictSearch, setConflictSearch] = useState('');
  const [conflictResults, setConflictResults] = useState(null);
  const [conflictCleared, setConflictCleared] = useState(false);

  // Step 2: Matter Details
  const [clients, setClients] = useState([]);
  const [partners, setPartners] = useState([]);
  const [form, setForm] = useState({
    caseNumber: '',
    clientId: '',
    matterName: '',
    matterType: 'Litigation',
    assignedPartnerId: '',
    description: '',
    statuteOfLimitations: '',
    budgetAmount: ''
  });

  useEffect(() => {
    if (step === 2) {
      loadDropdowns();
    }
  }, [step]);

  async function loadDropdowns() {
    try {
      const [c, p] = await Promise.all([
        api.get('/matters/clients/list'),
        api.get('/auth/users?role=Partner')
      ]);
      setClients(c.data.data);
      setPartners(p.data.data);
    } catch (e) { setError(e.message); }
  }

  async function runConflictCheck() {
    if (!conflictSearch) return;
    setLoading(true);
    try {
      const { data } = await api.post('/matters/conflict-check', { searchTerms: conflictSearch });
      setConflictResults(data.data.results || []);
    } catch (e) { setError(e.message); } finally { setLoading(true); }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post('/matters', { ...form, isConflictCleared: true });
      navigate(`/matters/${data.data.id}`);
    } catch (e) {
      setError(e.response?.data?.message || e.message);
    } finally { setLoading(false); }
  }

  return (
    <Layout>
      <div className="mb-8">
        <h1 className="font-display text-4xl font-black text-ink">New Matter Intake</h1>
        <p className="text-ink/50 font-medium mt-1">Onboarding workflow with mandatory compliance checks</p>
      </div>

      {/* Progress Stepper */}
      <div className="flex items-center gap-4 mb-8">
        <div className={`flex items-center gap-2 ${step === 1 ? 'text-gold-600' : 'text-ink/30'}`}>
          <span className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold ${step === 1 ? 'border-gold-600' : 'border-ink/20'}`}>1</span>
          <span className="text-sm font-black uppercase tracking-widest">Conflict Check</span>
        </div>
        <div className="h-px w-12 bg-ink/10" />
        <div className={`flex items-center gap-2 ${step === 2 ? 'text-gold-600' : 'text-ink/30'}`}>
          <span className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold ${step === 2 ? 'border-gold-600' : 'border-ink/20'}`}>2</span>
          <span className="text-sm font-black uppercase tracking-widest">Matter Details</span>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-3 bg-crimson-50 border-2 border-crimson-600 p-4 mb-6">
          <AlertCircle className="w-5 h-5 text-crimson-600 flex-shrink-0 mt-0.5" />
          <p className="text-crimson-700 font-medium text-sm">{error}</p>
        </div>
      )}

      {step === 1 && (
        <div className="card p-8 animate-fadeIn">
          <div className="max-w-xl">
            <h2 className="font-display text-2xl font-bold mb-2">Search Conflicts</h2>
            <p className="text-ink/50 text-sm mb-6">Check potential parties and opposing entities against the existing database before proceeding.</p>

            <div className="flex gap-2 mb-8">
              <input className="input" placeholder="Search party names..."
                value={conflictSearch} onChange={e => setConflictSearch(e.target.value)} />
              <button onClick={runConflictCheck} className="btn-primary">Check Conflicts</button>
            </div>

            {conflictResults && (
              <div className="bg-ink/5 border-2 border-ink/10 p-5 space-y-4 mb-8">
                <h3 className="text-xs font-black uppercase tracking-widest text-ink/40">Results</h3>
                {conflictResults.length === 0 ? (
                  <div className="flex items-center gap-2 text-jade-600 font-bold">
                    <CheckCircle2 className="w-5 h-5" /> No potential conflicts identified.
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-crimson-600 text-sm font-bold flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" /> Potential conflicts found:
                    </p>
                    {conflictResults.map((r, i) => (
                      <div key={i} className="flex justify-between items-center bg-white p-3 border border-ink/5">
                        <span className="font-bold text-sm text-ink">{r.name}</span>
                        <span className="badge">{r.type}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-between pt-4">
              <button onClick={() => navigate('/matters')} className="btn-secondary">Cancel</button>
              <button
                onClick={() => setStep(2)}
                disabled={!conflictResults}
                className="btn-gold">
                Proceed to Details <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {step === 2 && (
        <form onSubmit={handleSubmit} className="card p-8 animate-fadeIn max-w-4xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div>
              <label className="label">Case Reference #</label>
              <input required className="input font-mono" placeholder="e.g. SL-2026-001"
                value={form.caseNumber} onChange={e => setForm(f => ({...f, caseNumber: e.target.value}))} />
            </div>
            <div>
              <label className="label">Client</label>
              <select required className="input" value={form.clientId} onChange={e => setForm(f => ({...f, clientId: e.target.value}))}>
                <option value="">— Select Client —</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.client_name}</option>)}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="label">Matter Name / Subject</label>
              <input required className="input" placeholder="e.g. PNG Power vs. Hela PG"
                value={form.matterName} onChange={e => setForm(f => ({...f, matterName: e.target.value}))} />
            </div>
            <div>
              <label className="label">Matter Type</label>
              <select className="input" value={form.matterType} onChange={e => setForm(f => ({...f, matterType: e.target.value}))}>
                {['Litigation','Corporate','Conveyancing','Probate','Advisory'].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Responsible Partner</label>
              <select required className="input" value={form.assignedPartnerId} onChange={e => setForm(f => ({...f, assignedPartnerId: e.target.value}))}>
                <option value="">— Select Partner —</option>
                {partners.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Statute of Limitations</label>
              <input type="date" className="input border-crimson-600/30 text-crimson-700 font-bold"
                value={form.statuteOfLimitations} onChange={e => setForm(f => ({...f, statuteOfLimitations: e.target.value}))} />
              <p className="text-[10px] text-crimson-600 font-bold mt-1 uppercase tracking-widest">Auto-reminders will be triggered</p>
            </div>
            <div>
              <label className="label">Estimated Budget (K)</label>
              <input type="number" step="0.01" className="input font-mono" placeholder="0.00"
                value={form.budgetAmount} onChange={e => setForm(f => ({...f, budgetAmount: e.target.value}))} />
            </div>
            <div className="md:col-span-2">
              <label className="label">Initial Description / Notes</label>
              <textarea className="input h-24" value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))}></textarea>
            </div>
          </div>

          <div className="flex justify-between pt-6 border-t border-ink/10">
            <button type="button" onClick={() => setStep(1)} className="btn-secondary flex items-center gap-2">
              <ChevronLeft className="w-4 h-4" /> Back to Compliance
            </button>
            <button type="submit" disabled={loading} className="btn-gold px-10">
              {loading ? 'Processing...' : 'Complete Onboarding & Open Matter'}
            </button>
          </div>
        </form>
      )}
    </Layout>
  );
}

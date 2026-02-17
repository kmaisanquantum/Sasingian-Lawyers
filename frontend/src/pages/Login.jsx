import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Scale, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login, loading } = useAuth();
  const navigate           = useNavigate();
  const [form,   setForm]  = useState({ email: '', password: '' });
  const [show,   setShow]  = useState(false);
  const [error,  setError] = useState('');

  const submit = async e => {
    e.preventDefault();
    setError('');
    const res = await login(form.email, form.password);
    if (res.success) navigate('/');
    else setError(res.message);
  };

  return (
    <div className="min-h-screen bg-ink flex items-center justify-center p-4"
         style={{ backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 39px,rgba(255,255,255,0.03) 40px),repeating-linear-gradient(90deg,transparent,transparent 39px,rgba(255,255,255,0.03) 40px)' }}>
      <div className="w-full max-w-md animate-fadeIn">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gold-500 border-2 border-parchment mb-5 shadow-hard">
            <Scale className="w-8 h-8 text-ink" strokeWidth={2.5} />
          </div>
          <h1 className="font-display text-4xl font-black text-parchment tracking-tight">
            SASINGIAN
          </h1>
          <p className="text-gold-400 font-bold uppercase tracking-widest text-xs mt-1">
            LAWYERS &mdash; PORT MORESBY
          </p>
        </div>

        {/* Card */}
        <div className="bg-parchment border-2 border-parchment shadow-[6px_6px_0px_0px_rgba(251,191,36,0.5)] p-8">
          <h2 className="font-display text-2xl font-bold text-ink mb-6">
            Practice Portal Sign In
          </h2>

          {error && (
            <div className="flex items-start gap-3 bg-crimson-50 border-2 border-crimson-600 p-3 mb-5">
              <AlertCircle className="w-4 h-4 text-crimson-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-crimson-700 font-medium">{error}</p>
            </div>
          )}

          <form onSubmit={submit} className="space-y-5">
            <div>
              <label className="label">Email Address</label>
              <input
                type="email" required autoComplete="email"
                className="input"
                placeholder="your@sasingianlawyers.com"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              />
            </div>

            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input
                  type={show ? 'text' : 'password'} required autoComplete="current-password"
                  className="input pr-12"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                />
                <button type="button" onClick={() => setShow(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/50 hover:text-ink">
                  {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="btn-gold w-full justify-center py-3 text-base disabled:opacity-60 disabled:cursor-not-allowed">
              {loading ? (
                <><span className="inline-block w-4 h-4 border-2 border-ink border-t-transparent rounded-full animate-spin" /> Signing in…</>
              ) : 'Sign In'}
            </button>
          </form>

          <p className="text-xs text-ink/50 text-center mt-6 font-medium">
            Sasingian Lawyers © {new Date().getFullYear()} &bull; Confidential Practice Portal
          </p>
        </div>
      </div>
    </div>
  );
}

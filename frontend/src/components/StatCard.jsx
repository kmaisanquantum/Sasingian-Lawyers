export default function StatCard({ icon: Icon, label, value, sub, accent = 'gold' }) {
  const accents = {
    gold:    'bg-gold-100  text-gold-700   border-gold-500',
    jade:    'bg-jade-100  text-jade-700   border-jade-500',
    crimson: 'bg-crimson-100 text-crimson-700 border-crimson-500',
    ink:     'bg-ink/10   text-ink        border-ink/40',
  };
  return (
    <div className="card-hover p-6">
      <div className={`inline-flex items-center justify-center w-11 h-11 border-2 mb-4 ${accents[accent]}`}>
        <Icon className="w-5 h-5" strokeWidth={2.5} />
      </div>
      <div className="text-xs font-bold uppercase tracking-widest text-ink/50 mb-1">{label}</div>
      <div className="font-display text-3xl font-black text-ink leading-none mb-1">{value}</div>
      {sub && <div className="text-sm text-ink/60 font-medium">{sub}</div>}
    </div>
  );
}

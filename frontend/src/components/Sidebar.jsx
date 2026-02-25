import { NavLink, useNavigate } from 'react-router-dom';
import { Scale, LayoutDashboard, FolderOpen, DollarSign, Users, FileText, LogOut, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const NAV = [
  { to: '/',         icon: LayoutDashboard, label: 'Dashboard'    },
  { to: '/matters',  icon: FolderOpen,      label: 'Matters'      },
  { to: '/trust',    icon: DollarSign,      label: 'Trust Accounts'},
  { to: '/payroll',  icon: FileText,        label: 'Payroll'      },
  { to: '/staff',    icon: Users,           label: 'Staff / HR'   },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate         = useNavigate();

  const handleLogout = () => { logout(); navigate('/login'); };

  const initials = user?.name?.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase() || 'SL';

  return (
    <aside className="fixed top-0 left-0 h-screen w-64 bg-ink flex flex-col z-40 border-r-2 border-gold-500/20">
      {/* Logo */}
      <div className="px-5 py-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gold-500 border border-gold-400 flex items-center justify-center flex-shrink-0">
            <Scale className="w-5 h-5 text-ink" strokeWidth={2.5} />
          </div>
          <div>
            <div className="font-display text-parchment font-bold text-base leading-tight">
              SASINGIAN
            </div>
            <div className="text-gold-400 text-[10px] font-bold uppercase tracking-widest">
              LAWYERS
            </div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 overflow-y-auto">
        <div className="px-3 mb-3">
          <span className="text-[10px] font-bold uppercase tracking-widest text-parchment/30 px-1">
            Navigation
          </span>
        </div>
        {NAV.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} end={to === '/'}
            className={({ isActive }) =>
              isActive ? 'sidebar-link-active' : 'sidebar-link'}>
            <Icon className="w-4 h-4 flex-shrink-0" />
            <span className="flex-1">{label}</span>
            <ChevronRight className="w-3 h-3 opacity-40" />
          </NavLink>
        ))}
      </nav>

      {/* User */}
      <div className="p-4 border-t border-white/10">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 bg-gold-500 border border-gold-400 flex items-center justify-center flex-shrink-0 text-ink text-xs font-black">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-parchment text-sm font-bold truncate">{user?.name}</div>
            <div className="text-gold-400 text-[10px] font-bold uppercase tracking-wide">{user?.role}</div>
          </div>
        </div>
        <button onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2 text-parchment/60 hover:text-crimson-400 text-xs font-bold uppercase tracking-wide transition-colors">
          <LogOut className="w-3.5 h-3.5" /> Sign Out
        </button>
      </div>
    </aside>
  );
}

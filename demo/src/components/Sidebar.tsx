import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  AlertTriangle,
  Upload,
  Settings,
  RefreshCw,
  ChevronRight,
  Zap,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { resetDemoData } from '../lib/api';
import { toast } from 'sonner';

const NAV_ITEMS = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/reconciliations', icon: FileText, label: 'Reconciliations' },
  { to: '/exceptions', icon: AlertTriangle, label: 'Exception Queue', badge: 8 },
  { to: '/import', icon: Upload, label: 'Data Import' },
];

export default function Sidebar() {
  const navigate = useNavigate();

  function handleReset() {
    resetDemoData();
    toast.success('Demo data reset to defaults');
    navigate('/dashboard');
    window.location.reload();
  }

  return (
    <aside className="w-60 shrink-0 bg-bg-sidebar border-r border-border-subtle flex flex-col h-full">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-border-subtle">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-accent-purple flex items-center justify-center shrink-0">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="text-sm font-bold text-text-primary tracking-tight leading-none">LedgerIQ</div>
            <div className="text-[10px] text-text-muted mt-0.5 leading-none">Reconciliation Platform</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <p className="text-[10px] font-semibold text-text-muted uppercase tracking-widest px-3 mb-2">Workspace</p>
        {NAV_ITEMS.map(({ to, icon: Icon, label, badge }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'sidebar-item',
                isActive && 'sidebar-item-active'
              )
            }
          >
            <Icon className="w-4 h-4 shrink-0" />
            <span className="flex-1">{label}</span>
            {badge !== undefined && (
              <span className="bg-accent-red text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                {badge}
              </span>
            )}
            <ChevronRight className="w-3 h-3 opacity-30" />
          </NavLink>
        ))}

        <div className="pt-4">
          <p className="text-[10px] font-semibold text-text-muted uppercase tracking-widest px-3 mb-2">System</p>
          <button
            onClick={handleReset}
            className="sidebar-item w-full text-left"
          >
            <RefreshCw className="w-4 h-4 shrink-0" />
            <span className="flex-1">Reset Demo Data</span>
          </button>
          <NavLink
            to="/settings"
            className={({ isActive }) => cn('sidebar-item', isActive && 'sidebar-item-active')}
          >
            <Settings className="w-4 h-4 shrink-0" />
            <span className="flex-1">Settings</span>
            <ChevronRight className="w-3 h-3 opacity-30" />
          </NavLink>
        </div>
      </nav>

      {/* User profile */}
      <div className="px-3 py-4 border-t border-border-subtle">
        <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-bg-elevated transition-colors cursor-default">
          <div className="w-8 h-8 rounded-full bg-accent-purple-dim flex items-center justify-center shrink-0">
            <span className="text-xs font-bold text-accent-purple-light">LJ</span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold text-text-primary truncate">Libin Joseph</div>
            <div className="text-[10px] text-text-muted truncate">Revenue Assurance Analyst</div>
          </div>
          <div className="w-1.5 h-1.5 rounded-full bg-accent-green shrink-0" title="Online" />
        </div>
      </div>
    </aside>
  );
}

import React from 'react';
import {
  LayoutDashboard,
  Inbox,
  UploadCloud,
  CheckSquare,
  AlertTriangle,
  Building2,
  FileText,
  BarChart3,
  Clock,
  Settings,
  ShieldCheck
} from 'lucide-react';

export type NavItem =
  | 'overview'
  | 'queue'
  | 'import'
  | 'validation'
  | 'exceptions'
  | 'vendors'
  | 'po'
  | 'reports'
  | 'audit'
  | 'settings';

interface Props {
  currentTab: NavItem;
  onSelect: (tab: NavItem) => void;
  exceptionCount?: number;
}

export const NavigationRail: React.FC<Props> = ({ currentTab, onSelect, exceptionCount = 0 }) => {
  const navItems = [
    { id: 'overview' as NavItem, label: 'Overview', icon: LayoutDashboard },
    { id: 'queue' as NavItem, label: 'Invoice Queue', icon: Inbox },
    { id: 'import' as NavItem, label: 'Import Invoices', icon: UploadCloud },
    { id: 'validation' as NavItem, label: 'Validation Centre', icon: CheckSquare },
    { id: 'exceptions' as NavItem, label: 'Exceptions', icon: AlertTriangle, badge: exceptionCount },
    { id: 'vendors' as NavItem, label: 'Vendors', icon: Building2 },
    { id: 'po' as NavItem, label: 'Purchase Orders', icon: FileText },
    { id: 'reports' as NavItem, label: 'Reports', icon: BarChart3 },
    { id: 'audit' as NavItem, label: 'Audit History', icon: Clock },
    { id: 'settings' as NavItem, label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="w-16 bg-white border-r border-border flex flex-col items-center py-4 select-none z-20 shrink-0">
      {/* Brand Icon */}
      <div className="mb-6 flex flex-col items-center group cursor-pointer" onClick={() => onSelect('overview')}>
        <div className="w-10 h-10 rounded-lg bg-[#EAF3EE] border border-[#C2DDD0] flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors">
          <ShieldCheck className="w-6 h-6" />
        </div>
      </div>

      {/* Nav Icons */}
      <nav className="flex-1 flex flex-col space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <div key={item.id} className="relative group flex items-center justify-center">
              <button
                onClick={() => onSelect(item.id)}
                className={`w-11 h-11 rounded-lg flex items-center justify-center transition-all ${
                  isActive
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-text-secondary hover:text-text-primary hover:bg-[#F4F6F4]'
                }`}
                aria-label={item.label}
              >
                <Icon className="w-5 h-5" />
                {item.badge && item.badge > 0 && !isActive ? (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-status-critical" />
                ) : null}
              </button>

              {/* Flyout Tooltip */}
              <div className="absolute left-16 px-2.5 py-1 bg-[#24312D] text-white text-xs font-medium rounded shadow-md whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
                {item.label}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div className="text-[10px] text-text-muted font-mono tracking-wider">
        v1.0
      </div>
    </aside>
  );
};

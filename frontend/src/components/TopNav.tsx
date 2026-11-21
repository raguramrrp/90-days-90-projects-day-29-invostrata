import React from 'react';
import { UploadCloud, Database, User, ShieldCheck } from 'lucide-react';
import { NavItem } from './NavigationRail';

interface Props {
  currentTab: NavItem;
  onNavigate: (tab: NavItem) => void;
  onImportClick: () => void;
}

export const TopNav: React.FC<Props> = ({ currentTab, onNavigate, onImportClick }) => {
  const titles: Record<NavItem, { title: string; breadcrumb: string }> = {
    overview: { title: 'Financial Validation Overview', breadcrumb: 'Workstation / Overview' },
    queue: { title: 'Invoice Ingestion & Audit Queue', breadcrumb: 'Workstation / Queue' },
    import: { title: 'Import Invoice Documents', breadcrumb: 'Workstation / Ingestion' },
    validation: { title: 'Validation Rules Centre', breadcrumb: 'Workstation / Validation' },
    exceptions: { title: 'Financial Exceptions Ledger', breadcrumb: 'Workstation / Exceptions' },
    vendors: { title: 'Registered Vendor Directory', breadcrumb: 'Workstation / Vendors' },
    po: { title: 'Purchase Orders & Three-Way Match', breadcrumb: 'Workstation / Procurement' },
    reports: { title: 'Operational Analytics & Reports', breadcrumb: 'Workstation / Reports' },
    audit: { title: 'Audit Trail & Compliance History', breadcrumb: 'Workstation / Audit' },
    settings: { title: 'Workstation Configuration', breadcrumb: 'Workstation / Settings' },
  };

  const current = titles[currentTab] || { title: 'INVOSTRATA', breadcrumb: 'Workstation' };

  return (
    <header className="h-14 bg-surface border-b border-border px-6 flex items-center justify-between shrink-0 z-10">
      {/* Brand & Breadcrumb */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <span className="font-bold text-lg tracking-tight text-primary">INVOSTRATA</span>
          <span className="text-border">|</span>
          <span className="text-xs font-mono uppercase tracking-wider text-text-secondary bg-[#F4F6F4] px-2 py-0.5 rounded border border-border">
            Operations
          </span>
        </div>

        <div className="hidden md:flex items-center text-xs text-text-muted space-x-1 font-mono">
          <span>/</span>
          <span>{current.breadcrumb}</span>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center space-x-3">
        {/* DB Status Pill */}
        <div className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1 rounded bg-[#EAF3EE] border border-[#C2DDD0] text-primary text-xs font-medium">
          <Database className="w-3.5 h-3.5 text-primary" />
          <span>Connected: Active</span>
        </div>

        {/* Import Invoices Quick Action */}
        <button
          onClick={onImportClick}
          className="flex items-center space-x-1.5 px-3 py-1.5 bg-primary hover:bg-primary-dark text-white rounded text-xs font-medium transition-colors shadow-sm"
        >
          <UploadCloud className="w-3.5 h-3.5" />
          <span>Import Invoices</span>
        </button>

        {/* User Menu */}
        <div className="flex items-center space-x-2 pl-2 border-l border-border">
          <div className="w-8 h-8 rounded-full bg-[#E0E6E1] flex items-center justify-center text-text-primary text-xs font-semibold">
            FA
          </div>
          <div className="hidden lg:block text-left">
            <p className="text-xs font-medium text-text-primary leading-tight">Lead Auditor</p>
            <p className="text-[10px] text-text-secondary leading-tight">Financial Ops</p>
          </div>
        </div>
      </div>
    </header>
  );
};

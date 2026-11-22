import React from 'react';
import { Download, UploadCloud } from 'lucide-react';

export type NavTab =
  | 'register'
  | 'validation'
  | 'exceptions'
  | 'vendors'
  | 'po'
  | 'reports'
  | 'import'
  | 'audit'
  | 'settings';

interface Props {
  currentTab: NavTab;
  onNavigate: (tab: NavTab) => void;
  onExportClick?: () => void;
  onImportClick?: () => void;
}

export const TopNav: React.FC<Props> = ({
  currentTab,
  onNavigate,
  onExportClick,
  onImportClick
}) => {
  const breadcrumbLabels: Record<NavTab, string> = {
    register: 'Invoice register',
    validation: 'Validation centre',
    exceptions: 'Exceptions ledger',
    vendors: 'Vendor directory',
    po: 'Purchase orders & reconciliation',
    reports: 'Financial reports',
    import: 'Import invoices',
    audit: 'Audit history',
    settings: 'Configuration',
  };

  const navLinks = [
    { id: 'register' as NavTab, label: 'Register' },
    { id: 'validation' as NavTab, label: 'Validation' },
    { id: 'exceptions' as NavTab, label: 'Exceptions' },
    { id: 'vendors' as NavTab, label: 'Vendors' },
    { id: 'po' as NavTab, label: 'Purchase Orders' },
    { id: 'reports' as NavTab, label: 'Reports' },
  ];

  return (
    <header className="h-[82px] bg-white border-b border-[#E4DED4] sticky top-0 z-40 w-full">
      <div className="max-w-[1520px] mx-auto px-6 h-full flex items-center justify-between">
        {/* Left Section: Brand Symbol, Wordmark & Breadcrumb */}
        <div className="flex items-center space-x-4 shrink-0">
          <button
            onClick={() => onNavigate('register')}
            className="flex items-center space-x-2.5 text-left focus:outline-none group"
          >
            {/* Minimal Brand Symbol (Architectural Vault / Pillars in Copper) */}
            <svg
              width="26"
              height="26"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="text-[#B96C32] shrink-0"
            >
              <path
                d="M3 20H21M4 20V7L12 3.5L20 7V20M8.5 20V9.5M15.5 20V9.5M12 20V8"
                stroke="#B96C32"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>

            {/* Wordmark */}
            <span className="font-serif font-bold text-lg tracking-[0.08em] text-[#15263B]">
              INVOSTRATA
            </span>
          </button>

          {/* Thin Vertical Pipe Separator */}
          <span className="text-[#E4DED4] select-none text-lg">|</span>

          {/* Breadcrumb */}
          <div className="hidden sm:flex items-center text-xs text-[#687586] font-sans">
            <span>Finance operations / {breadcrumbLabels[currentTab] || 'Invoice register'}</span>
          </div>
        </div>

        {/* Centre Section: Horizontal Navigation Links with Copper Underline */}
        <nav className="hidden md:flex items-center space-x-7 h-full">
          {navLinks.map((tab) => {
            const isActive = currentTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onNavigate(tab.id)}
                className={`relative h-full flex items-center text-xs tracking-wide transition-colors focus:outline-none ${
                  isActive
                    ? 'text-[#15263B] font-bold'
                    : 'text-[#687586] hover:text-[#15263B] font-medium'
                }`}
              >
                <span>{tab.label}</span>
                {/* Active Copper Underline */}
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-[#B96C32]" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Right Section: Export & Import Invoices CTA */}
        <div className="flex items-center space-x-3.5 shrink-0">
          {/* Export Button */}
          <button
            onClick={onExportClick || (() => window.open('/api/reports/export?format=csv', '_blank'))}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-white border border-[#E4DED4] hover:bg-[#F4F1EB] text-[#15263B] rounded-md text-xs font-medium transition-colors shadow-sm"
          >
            <Download className="w-3.5 h-3.5 text-[#15263B]" />
            <span>Export</span>
          </button>

          {/* Import Invoices Button (Navy Filled) */}
          <button
            onClick={onImportClick || (() => onNavigate('import'))}
            className="flex items-center space-x-2 px-4 py-2 bg-[#15263B] hover:bg-[#244B60] text-white rounded-md text-xs font-medium transition-colors shadow-sm"
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>Import invoices</span>
          </button>
        </div>
      </div>
    </header>
  );
};

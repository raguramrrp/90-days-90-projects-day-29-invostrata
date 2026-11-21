import React, { useState, useEffect } from 'react';
import { NavigationRail, NavItem } from './components/NavigationRail';
import { TopNav } from './components/TopNav';
import { InvoiceInspector } from './components/InvoiceInspector';
import { OverviewPage } from './pages/OverviewPage';
import { InvoiceQueuePage } from './pages/InvoiceQueuePage';
import { ImportInvoicesPage } from './pages/ImportInvoicesPage';
import { ValidationCentrePage } from './pages/ValidationCentrePage';
import { ExceptionsPage } from './pages/ExceptionsPage';
import { VendorsPage } from './pages/VendorsPage';
import { PurchaseOrdersPage } from './pages/PurchaseOrdersPage';
import { ReportsPage } from './pages/ReportsPage';
import { AuditHistoryPage } from './pages/AuditHistoryPage';
import { SettingsPage } from './pages/SettingsPage';
import { Invoice } from './types';
import { api } from './services/api';

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<NavItem>('overview');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [exceptionCount, setExceptionCount] = useState<number>(0);

  useEffect(() => {
    loadGlobalBadgeCounts();
  }, [currentTab]);

  const loadGlobalBadgeCounts = async () => {
    try {
      const exc = await api.getExceptions();
      setExceptionCount(exc.total);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSelectInvoice = async (inv: Invoice) => {
    try {
      const full = await api.getInvoice(inv.id);
      setSelectedInvoice(full);
    } catch (err) {
      setSelectedInvoice(inv);
    }
  };

  const handleRefreshSelected = async () => {
    if (selectedInvoice) {
      try {
        const updated = await api.getInvoice(selectedInvoice.id);
        setSelectedInvoice(updated);
      } catch (err) {
        console.error(err);
      }
    }
    loadGlobalBadgeCounts();
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-workspace text-text-primary antialiased font-sans">
      {/* 1. Slim Left Icon Navigation Rail */}
      <NavigationRail
        currentTab={currentTab}
        onSelect={(tab) => setCurrentTab(tab)}
        exceptionCount={exceptionCount}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* 2. Horizontal Top Navigation */}
        <TopNav
          currentTab={currentTab}
          onNavigate={(tab) => setCurrentTab(tab)}
          onImportClick={() => setCurrentTab('import')}
        />

        {/* 3. Page Workspace Body */}
        <main className="flex-1 overflow-y-auto p-6 relative">
          <div className="max-w-[1440px] mx-auto">
            {currentTab === 'overview' && (
              <OverviewPage
                onSelectInvoice={handleSelectInvoice}
                onNavigateTab={(tab) => setCurrentTab(tab)}
              />
            )}
            {currentTab === 'queue' && (
              <InvoiceQueuePage
                onSelectInvoice={handleSelectInvoice}
                selectedInvoiceId={selectedInvoice?.id}
              />
            )}
            {currentTab === 'import' && (
              <ImportInvoicesPage
                onInvoiceCreated={(inv) => {
                  handleSelectInvoice(inv);
                  setCurrentTab('queue');
                }}
              />
            )}
            {currentTab === 'validation' && (
              <ValidationCentrePage onSelectInvoice={handleSelectInvoice} />
            )}
            {currentTab === 'exceptions' && <ExceptionsPage />}
            {currentTab === 'vendors' && <VendorsPage />}
            {currentTab === 'po' && <PurchaseOrdersPage />}
            {currentTab === 'reports' && <ReportsPage />}
            {currentTab === 'audit' && <AuditHistoryPage />}
            {currentTab === 'settings' && <SettingsPage />}
          </div>
        </main>
      </div>

      {/* 4. Right-Side Invoice Inspector (Docked Flyout) */}
      {selectedInvoice && (
        <InvoiceInspector
          invoice={selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
          onRefresh={handleRefreshSelected}
        />
      )}
    </div>
  );
};

export default App;

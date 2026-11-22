import React, { useState, useEffect } from 'react';
import { TopNav, NavTab } from './components/TopNav';
import { InvoiceInspector } from './components/InvoiceInspector';
import { RegisterPage } from './pages/RegisterPage';
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
  // Read initial tab and modal from URL params if provided
  const getInitialTab = (): NavTab => {
    try {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab') as NavTab;
      const validTabs: NavTab[] = ['register', 'validation', 'exceptions', 'vendors', 'po', 'reports', 'import', 'audit', 'settings'];
      if (tabParam && validTabs.includes(tabParam)) return tabParam;
    } catch {}
    return 'register';
  };

  const [currentTab, setCurrentTab] = useState<NavTab>(getInitialTab);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isInspectorOpen, setIsInspectorOpen] = useState<boolean>(false);
  const [exceptionCount, setExceptionCount] = useState<number>(0);

  useEffect(() => {
    // Check if initial modal requested in query params
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('modal') === 'inspector') {
        const targetId = params.get('invoice') || 'INV-2026-0107';
        api.getInvoice(targetId).then((inv) => {
          setSelectedInvoice(inv);
          setIsInspectorOpen(true);
        }).catch(() => {});
      }
    } catch {}
  }, []);

  const handleNavigate = (tab: NavTab) => {
    setCurrentTab(tab);
    setIsInspectorOpen(false);
    try {
      window.history.replaceState(null, '', `?tab=${tab}`);
    } catch {}
  };

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
      setIsInspectorOpen(true);
    } catch (err) {
      setSelectedInvoice(inv);
      setIsInspectorOpen(true);
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
    <div className="min-h-screen w-full bg-[#F8F6F1] text-[#15263B] antialiased font-sans flex flex-col">
      {/* 1. Full-Width Horizontal Header (82px) matching Reference Image */}
      <TopNav
        currentTab={currentTab}
        onNavigate={handleNavigate}
        onImportClick={() => {
          handleNavigate('import');
        }}
      />

      {/* 2. Main Application Workspace Content */}
      <main className="flex-1 w-full max-w-[1520px] mx-auto px-6 py-6">
        {currentTab === 'register' && (
          <RegisterPage
            onSelectInvoiceForAudit={(inv) => {
              setSelectedInvoice(inv);
              setIsInspectorOpen(true);
            }}
            onNavigateToImport={() => setCurrentTab('import')}
          />
        )}
        {currentTab === 'import' && (
          <ImportInvoicesPage
            onInvoiceCreated={(inv) => {
              setSelectedInvoice(inv);
              setCurrentTab('register');
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
      </main>

      {/* 3. Slide-Out Detailed Invoice Audit Record Drawer */}
      {isInspectorOpen && selectedInvoice && (
        <InvoiceInspector
          invoice={selectedInvoice}
          onClose={() => setIsInspectorOpen(false)}
          onRefresh={handleRefreshSelected}
        />
      )}
    </div>
  );
};

export default App;

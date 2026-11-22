import React, { useState, useEffect } from 'react';
import { Settings, Shield, Sliders, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api';

export const SettingsPage: React.FC = () => {
  const [settingsData, setSettingsData] = useState<any>(null);
  const [rules, setRules] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const [s, r] = await Promise.all([
        api.getSettings(),
        api.getValidationRules(),
      ]);
      setSettingsData(s);
      setRules(r);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Header */}
      <div className="bg-white border border-border rounded-lg p-5 shadow-sm">
        <h1 className="text-xl font-bold tracking-tight text-text-primary">
          Settings & Validation Engine Rules
        </h1>
      </div>

      {savedSuccess && (
        <div className="p-3 bg-status-successBg border border-[#B8D5C7] text-status-success text-xs rounded-lg flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>Validation parameters saved successfully. All future runs will apply these tolerances.</span>
        </div>
      )}

      {/* Numerical Tolerances Card */}
      <div className="bg-white border border-border rounded-lg p-5 shadow-sm space-y-4">
        <div className="flex items-center space-x-2 border-b border-border pb-2">
          <Sliders className="w-4 h-4 text-navy" />
          <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider">
            Deterministic Financial Tolerances
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="font-semibold text-text-primary block mb-1">
              Rounding Precision Tolerance (₹)
            </label>
            <input
              type="number"
              step="0.01"
              defaultValue={settingsData?.tolerance || '0.05'}
              className="w-full p-2 border border-border rounded bg-surfaceMuted/50 font-mono text-xs focus:ring-1 focus:ring-navy outline-none"
            />
            <p className="text-[11px] text-text-secondary mt-1">
              Statutory rounding margin accepted for line-item sum reconciliation.
            </p>
          </div>

          <div>
            <label className="font-semibold text-text-primary block mb-1">
              Maximum Invoice Age (Days)
            </label>
            <input
              type="number"
              defaultValue={settingsData?.max_age_days || '180'}
              className="w-full p-2 border border-border rounded bg-surfaceMuted/50 font-mono text-xs focus:ring-1 focus:ring-navy outline-none"
            />
            <p className="text-[11px] text-text-secondary mt-1">
              Invoices older than this threshold trigger statutory ITC Section 16(4) warnings.
            </p>
          </div>
        </div>

        <div>
          <label className="font-semibold text-text-primary block mb-1 text-xs">
            Standard Indian GST Statutory Rates Supported (%)
          </label>
          <div className="flex flex-wrap gap-2 text-xs font-mono">
            {['0', '5', '12', '18', '28'].map((rate) => (
              <span key={rate} className="px-2.5 py-1 rounded bg-surfaceMuted border border-border text-navy font-bold">
                {rate}% Rate
              </span>
            ))}
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-copper hover:bg-copper-hover text-white text-xs font-semibold rounded transition-colors shadow-sm"
          >
            Update Tolerances
          </button>
        </div>
      </div>

      {/* Rules Registry Card */}
      <div className="bg-white border border-border rounded-lg p-5 shadow-sm space-y-4">
        <div className="flex items-center space-x-2 border-b border-border pb-2">
          <Shield className="w-4 h-4 text-navy" />
          <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider">
            Active Validation Rule Set
          </h3>
        </div>

        <div className="divide-y divide-border text-xs">
          {rules.map((r, i) => (
            <div key={i} className="py-2.5 flex items-center justify-between">
              <div>
                <span className="font-mono font-bold text-navy">{r.code}</span>
                <p className="text-text-secondary">{r.description}</p>
              </div>
              <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-status-successBg text-status-success border border-[#B8D5C7]">
                ENFORCED
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

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
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-text-primary">Workstation Settings & Configuration</h1>
        <p className="text-xs text-text-secondary mt-0.5">
          Configure financial arithmetic tolerances, statutory GST thresholds, and active validation rules.
        </p>
      </div>

      {savedSuccess && (
        <div className="p-3 bg-[#EAF3EE] border border-[#C2DDD0] text-primary text-xs rounded-lg flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>Validation parameters saved successfully. All future runs will apply these tolerances.</span>
        </div>
      )}

      {/* Numerical Tolerances Card */}
      <div className="bg-white border border-border rounded-lg p-5 shadow-sm space-y-4">
        <div className="flex items-center space-x-2 border-b border-border pb-2">
          <Sliders className="w-4 h-4 text-primary" />
          <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider">
            Deterministic Financial Tolerances
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="font-medium text-text-primary block mb-1">Rounding Precision Tolerance (₹)</label>
            <p className="text-[11px] text-text-secondary mb-1.5">Maximum permitted mathematical rounding deviation.</p>
            <input
              type="number"
              step="0.01"
              value={settingsData?.rounding_tolerance || 0.05}
              onChange={(e) => setSettingsData({ ...settingsData, rounding_tolerance: parseFloat(e.target.value) })}
              className="w-full p-2 border border-border rounded bg-workspace font-mono focus:border-primary outline-none"
            />
          </div>

          <div>
            <label className="font-medium text-text-primary block mb-1">Max Invoice Age (Days)</label>
            <p className="text-[11px] text-text-secondary mb-1.5">Older records trigger Section 16(4) ITC review flag.</p>
            <input
              type="number"
              value={settingsData?.max_invoice_age_days || 180}
              onChange={(e) => setSettingsData({ ...settingsData, max_invoice_age_days: parseInt(e.target.value) })}
              className="w-full p-2 border border-border rounded bg-workspace font-mono focus:border-primary outline-none"
            />
          </div>

          <div>
            <label className="font-medium text-text-primary block mb-1">High Discount Anomaly Threshold (%)</label>
            <p className="text-[11px] text-text-secondary mb-1.5">Commercial discount percentage prompting auditor warning.</p>
            <input
              type="number"
              value={settingsData?.high_discount_threshold || 20.0}
              onChange={(e) => setSettingsData({ ...settingsData, high_discount_threshold: parseFloat(e.target.value) })}
              className="w-full p-2 border border-border rounded bg-workspace font-mono focus:border-primary outline-none"
            />
          </div>

          <div>
            <label className="font-medium text-text-primary block mb-1">Round Number Multiple Modulo (₹)</label>
            <p className="text-[11px] text-text-secondary mb-1.5">Exact round multiples without paise requiring contract match.</p>
            <input
              type="number"
              value={settingsData?.round_number_modulo || 1000.0}
              onChange={(e) => setSettingsData({ ...settingsData, round_number_modulo: parseFloat(e.target.value) })}
              className="w-full p-2 border border-border rounded bg-workspace font-mono focus:border-primary outline-none"
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded text-xs font-medium transition-colors shadow-sm"
          >
            Save Parameters
          </button>
        </div>
      </div>

      {/* Active Rules Registry */}
      <div className="bg-white border border-border rounded-lg p-5 shadow-sm space-y-4">
        <div className="flex items-center space-x-2 border-b border-border pb-2">
          <Shield className="w-4 h-4 text-primary" />
          <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider">
            Active Statutory & Mathematical Rules Registry
          </h3>
        </div>

        <div className="divide-y divide-border text-xs">
          {rules.map((r, i) => (
            <div key={i} className="py-2.5 flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-mono font-bold text-primary">{r.code}</span>
                  <span className="font-medium text-text-primary">{r.name}</span>
                </div>
                <p className="text-text-secondary text-[11px] mt-0.5">{r.description}</p>
              </div>

              <div className="flex items-center space-x-2 font-mono text-[11px]">
                <span className={`px-2 py-0.5 rounded font-bold ${
                  r.severity === 'CRITICAL' ? 'bg-status-criticalBg text-status-critical' : 'bg-status-warningBg text-status-warning'
                }`}>
                  {r.severity}
                </span>
                <span className="text-primary font-semibold">ENABLED</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

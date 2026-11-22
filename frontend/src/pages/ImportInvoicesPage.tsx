import React, { useState } from 'react';
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  PlusCircle,
  FileCheck
} from 'lucide-react';
import { api } from '../services/api';
import { Invoice } from '../types';

interface Props {
  onInvoiceCreated: (invoice: Invoice) => void;
}

export const ImportInvoicesPage: React.FC<Props> = ({ onInvoiceCreated }) => {
  const [activeMode, setActiveMode] = useState<'upload' | 'manual'>('upload');
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [filesToUpload, setFilesToUpload] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadResults, setUploadResults] = useState<any[]>([]);

  // Manual Form State
  const [manualForm, setManualForm] = useState({
    invoice_number: '',
    invoice_date: new Date().toISOString().split('T')[0],
    due_date: '',
    vendor_name: '',
    vendor_gstin: '',
    vendor_address: '',
    customer_name: 'ACME Technologies India Pvt Ltd',
    customer_gstin: '29AABCA1234F1ZP',
    place_of_supply: 'Karnataka',
    pos_state_code: '29',
    po_number: '',
    subtotal: 0,
    cgst_amount: 0,
    sgst_amount: 0,
    igst_amount: 0,
    total_tax: 0,
    grand_total: 0,
    line_description: 'Software Engineering & Consulting Services',
    line_qty: 1,
    line_rate: 0,
    gst_rate: 18,
  });

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFilesToUpload(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFilesToUpload(Array.from(e.target.files));
    }
  };

  const handleStartUpload = async () => {
    if (filesToUpload.length === 0) return;
    setIsUploading(true);
    const results = [];

    for (const file of filesToUpload) {
      try {
        const inv = await api.uploadInvoice(file);
        results.push({ filename: file.name, success: true, invoice: inv });
        onInvoiceCreated(inv);
      } catch (err: any) {
        results.push({ filename: file.name, success: false, error: err.message || 'Processing failed' });
      }
    }

    setUploadResults(results);
    setFilesToUpload([]);
    setIsUploading(false);
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUploading(true);
    try {
      const taxable = manualForm.line_qty * manualForm.line_rate;
      const isIntraState = manualForm.pos_state_code === manualForm.vendor_gstin.substring(0, 2);
      const taxAmt = (taxable * manualForm.gst_rate) / 100;
      const cgst = isIntraState ? taxAmt / 2 : 0;
      const sgst = isIntraState ? taxAmt / 2 : 0;
      const igst = !isIntraState ? taxAmt : 0;
      const grandTotal = taxable + taxAmt;

      const payload = {
        invoice_number: manualForm.invoice_number,
        invoice_date: manualForm.invoice_date,
        due_date: manualForm.due_date,
        vendor_name: manualForm.vendor_name,
        vendor_gstin: manualForm.vendor_gstin,
        vendor_address: manualForm.vendor_address,
        customer_name: manualForm.customer_name,
        customer_gstin: manualForm.customer_gstin,
        place_of_supply: manualForm.place_of_supply,
        pos_state_code: manualForm.pos_state_code,
        po_number: manualForm.po_number,
        subtotal: taxable,
        taxable_amount: taxable,
        cgst_amount: cgst,
        sgst_amount: sgst,
        igst_amount: igst,
        total_tax: taxAmt,
        grand_total: grandTotal,
        line_items: [
          {
            description: manualForm.line_description,
            quantity: manualForm.line_qty,
            unit_price: manualForm.line_rate,
            item_discount: 0,
            taxable_value: taxable,
            gst_rate: manualForm.gst_rate,
            cgst_amount: cgst,
            sgst_amount: sgst,
            igst_amount: igst,
            total_amount: grandTotal,
          },
        ],
      };

      const created = await api.createManualInvoice(payload);
      onInvoiceCreated(created);
      alert(`Manual invoice #${created.invoice_number} created and validated! Status: ${created.validation_status}`);
    } catch (err: any) {
      alert(`Manual creation error: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Header */}
      <div className="bg-white border border-border rounded-lg p-5 shadow-sm">
        <h1 className="text-xl font-bold tracking-tight text-text-primary">
          Import Invoices & Document Ingestion
        </h1>
      </div>

      {/* Mode Switcher */}
      <div className="flex border-b border-border bg-white rounded-t-lg px-4 pt-3 space-x-4 shadow-sm">
        <button
          onClick={() => setActiveMode('upload')}
          className={`pb-2.5 text-xs font-semibold border-b-2 transition-colors flex items-center space-x-1.5 ${
            activeMode === 'upload'
              ? 'border-navy text-navy'
              : 'border-transparent text-text-secondary hover:text-text-primary'
          }`}
        >
          <UploadCloud className="w-4 h-4 text-copper" />
          <span>Document & File Upload (PDF, PNG, CSV, Excel)</span>
        </button>
        <button
          onClick={() => setActiveMode('manual')}
          className={`pb-2.5 text-xs font-semibold border-b-2 transition-colors flex items-center space-x-1.5 ${
            activeMode === 'manual'
              ? 'border-navy text-navy'
              : 'border-transparent text-text-secondary hover:text-text-primary'
          }`}
        >
          <PlusCircle className="w-4 h-4 text-copper" />
          <span>Manual Invoice Entry</span>
        </button>
      </div>

      {/* MODE 1: FILE UPLOAD */}
      {activeMode === 'upload' && (
        <div className="space-y-4">
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-10 text-center transition-all bg-white ${
              dragActive ? 'border-navy bg-navy-light/40' : 'border-border hover:border-text-secondary'
            }`}
          >
            <div className="w-12 h-12 rounded-full bg-surfaceMuted border border-border flex items-center justify-center mx-auto text-navy mb-3">
              <UploadCloud className="w-6 h-6 text-copper" />
            </div>
            <h3 className="text-sm font-semibold text-text-primary">Drag & drop invoice files here</h3>
            <p className="text-xs text-text-secondary mt-1">
              Supports standard PDFs, scanned images (PNG, JPG), CSV and Excel spreadsheets (up to 25MB each)
            </p>

            <label className="mt-4 inline-block px-4 py-2 bg-navy hover:bg-navy-dark text-white text-xs font-semibold rounded cursor-pointer transition-colors shadow-sm">
              <span>Select Local Files</span>
              <input
                type="file"
                multiple
                accept=".pdf,.png,.jpg,.jpeg,.csv,.xlsx,.xls"
                onChange={handleFileInput}
                className="hidden"
              />
            </label>
          </div>

          {/* Staged files list */}
          {filesToUpload.length > 0 && (
            <div className="bg-white border border-border rounded-lg p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-xs text-text-primary">Staged Files ({filesToUpload.length})</span>
                <button
                  onClick={handleStartUpload}
                  disabled={isUploading}
                  className="px-4 py-1.5 bg-copper hover:bg-copper-hover text-white rounded text-xs font-semibold transition-colors shadow-sm"
                >
                  {isUploading ? 'Extracting & Validating...' : 'Start Ingestion & Validation'}
                </button>
              </div>

              <div className="divide-y divide-border text-xs font-mono">
                {filesToUpload.map((f, i) => (
                  <div key={i} className="py-2 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <FileText className="w-4 h-4 text-navy" />
                      <span className="text-text-primary">{f.name}</span>
                    </div>
                    <span className="text-text-muted">{(f.size / 1024).toFixed(1)} KB</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upload results */}
          {uploadResults.length > 0 && (
            <div className="bg-white border border-border rounded-lg p-4 shadow-sm space-y-2">
              <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider mb-2">Ingestion Output</h4>
              <div className="space-y-2">
                {uploadResults.map((r, i) => (
                  <div
                    key={i}
                    className={`p-3 rounded-lg border text-xs flex items-center justify-between ${
                      r.success
                        ? 'bg-status-successBg border-[#B8D5C7]'
                        : 'bg-status-criticalBg border-[#ECC7C4]'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      {r.success ? (
                        <CheckCircle2 className="w-4 h-4 text-status-success" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-status-critical" />
                      )}
                      <span className="font-mono font-medium text-text-primary">{r.filename}</span>
                    </div>

                    {r.success ? (
                      <div className="flex items-center space-x-3 font-mono text-[11px]">
                        <span className="text-text-secondary">{r.invoice.id}</span>
                        <span className="font-bold text-navy">{r.invoice.validation_status}</span>
                      </div>
                    ) : (
                      <span className="text-status-critical text-xs">{r.error}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODE 2: MANUAL INVOICE ENTRY */}
      {activeMode === 'manual' && (
        <form onSubmit={handleManualSubmit} className="bg-white border border-border rounded-lg p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-text-primary border-b border-border pb-2">
            Manual Invoice Specification
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="font-medium text-text-secondary block mb-1">Invoice Number *</label>
              <input
                type="text"
                required
                placeholder="e.g. INV-MANUAL-001"
                value={manualForm.invoice_number}
                onChange={(e) => setManualForm({ ...manualForm, invoice_number: e.target.value })}
                className="w-full p-2 border border-border rounded bg-surfaceMuted/50 focus:border-navy outline-none font-mono"
              />
            </div>
            <div>
              <label className="font-medium text-text-secondary block mb-1">Invoice Date *</label>
              <input
                type="date"
                required
                value={manualForm.invoice_date}
                onChange={(e) => setManualForm({ ...manualForm, invoice_date: e.target.value })}
                className="w-full p-2 border border-border rounded bg-surfaceMuted/50 focus:border-navy outline-none font-mono"
              />
            </div>
            <div>
              <label className="font-medium text-text-secondary block mb-1">Payment Due Date</label>
              <input
                type="date"
                value={manualForm.due_date}
                onChange={(e) => setManualForm({ ...manualForm, due_date: e.target.value })}
                className="w-full p-2 border border-border rounded bg-surfaceMuted/50 focus:border-navy outline-none font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="font-medium text-text-secondary block mb-1">Vendor Trading Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. InfraTech Cloud Solutions Pvt Ltd"
                value={manualForm.vendor_name}
                onChange={(e) => setManualForm({ ...manualForm, vendor_name: e.target.value })}
                className="w-full p-2 border border-border rounded bg-surfaceMuted/50 focus:border-navy outline-none"
              />
            </div>
            <div>
              <label className="font-medium text-text-secondary block mb-1">Vendor GSTIN (15 Alphanumeric)</label>
              <input
                type="text"
                maxLength={15}
                placeholder="e.g. 29AABCU9603R1ZM"
                value={manualForm.vendor_gstin}
                onChange={(e) => setManualForm({ ...manualForm, vendor_gstin: e.target.value.toUpperCase() })}
                className="w-full p-2 border border-border rounded bg-surfaceMuted/50 focus:border-navy outline-none font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="font-medium text-text-secondary block mb-1">Place of Supply State</label>
              <input
                type="text"
                value={manualForm.place_of_supply}
                onChange={(e) => setManualForm({ ...manualForm, place_of_supply: e.target.value })}
                className="w-full p-2 border border-border rounded bg-surfaceMuted/50 focus:border-navy outline-none"
              />
            </div>
            <div>
              <label className="font-medium text-text-secondary block mb-1">State Code (2 Digits)</label>
              <input
                type="text"
                maxLength={2}
                value={manualForm.pos_state_code}
                onChange={(e) => setManualForm({ ...manualForm, pos_state_code: e.target.value })}
                className="w-full p-2 border border-border rounded bg-surfaceMuted/50 focus:border-navy outline-none font-mono"
              />
            </div>
            <div>
              <label className="font-medium text-text-secondary block mb-1">PO Reference Number</label>
              <input
                type="text"
                placeholder="e.g. PO-2026-401"
                value={manualForm.po_number}
                onChange={(e) => setManualForm({ ...manualForm, po_number: e.target.value })}
                className="w-full p-2 border border-border rounded bg-surfaceMuted/50 focus:border-navy outline-none font-mono"
              />
            </div>
          </div>

          <div className="border-t border-border pt-4">
            <h4 className="font-semibold text-text-primary text-xs mb-3">Primary Line Item</h4>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
              <div className="md:col-span-2">
                <label className="text-text-secondary block mb-1">Description</label>
                <input
                  type="text"
                  value={manualForm.line_description}
                  onChange={(e) => setManualForm({ ...manualForm, line_description: e.target.value })}
                  className="w-full p-2 border border-border rounded bg-surfaceMuted/50 focus:border-navy outline-none"
                />
              </div>
              <div>
                <label className="text-text-secondary block mb-1">Quantity</label>
                <input
                  type="number"
                  min="1"
                  value={manualForm.line_qty}
                  onChange={(e) => setManualForm({ ...manualForm, line_qty: parseFloat(e.target.value) || 0 })}
                  className="w-full p-2 border border-border rounded bg-surfaceMuted/50 focus:border-navy outline-none font-mono"
                />
              </div>
              <div>
                <label className="text-text-secondary block mb-1">Unit Rate (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="50000.00"
                  value={manualForm.line_rate || ''}
                  onChange={(e) => setManualForm({ ...manualForm, line_rate: parseFloat(e.target.value) || 0 })}
                  className="w-full p-2 border border-border rounded bg-surfaceMuted/50 focus:border-navy outline-none font-mono"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-3 border-t border-border">
            <button
              type="submit"
              disabled={isUploading}
              className="px-5 py-2 bg-copper hover:bg-copper-hover text-white text-xs font-semibold rounded transition-colors shadow-sm"
            >
              {isUploading ? 'Executing Validation...' : 'Ingest & Run Validation'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

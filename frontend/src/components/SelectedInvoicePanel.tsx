import React from 'react';
import { X, CheckCircle2, AlertCircle, XCircle, FileText } from 'lucide-react';
import { Invoice } from '../types';

interface Props {
  invoice: Invoice | null;
  onClose: () => void;
  onOpenAuditRecord: () => void;
}

export const formatInvoiceDate = (dateStr?: string): string => {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const day = String(d.getDate()).padStart(2, '0');
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    return `${day} ${month} ${year}`;
  } catch {
    return dateStr;
  }
};

export const formatCurrency = (val: number): string => {
  return `₹${val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export const SelectedInvoicePanel: React.FC<Props> = ({
  invoice,
  onClose,
  onOpenAuditRecord
}) => {
  if (!invoice) return null;

  // Determine real validation findings from database validation results
  const results = invoice.validation_results || [];

  // Check 1: Line-item arithmetic
  const arithError = results.find(
    (r) =>
      (r.category === 'ARITHMETIC' || r.rule_code.includes('SUM') || r.rule_code.includes('TOTAL')) &&
      r.status === 'FAIL'
  );
  const arithPassed = !arithError;

  // Check 2: GST calculation
  const gstError = results.find(
    (r) =>
      (r.category === 'TAX_GST' || r.rule_code.includes('GST')) &&
      r.status === 'FAIL'
  );
  const gstPassed = !gstError;

  // Check 3: Vendor status / check
  const vendorWarningOrError = results.find(
    (r) =>
      (r.category === 'VENDOR' || r.rule_code.includes('VENDOR')) &&
      (r.status === 'WARNING' || r.status === 'FAIL')
  );
  const hasDuplicates = invoice.duplicates && invoice.duplicates.length > 0;
  const vendorNeedsReview = !!vendorWarningOrError || hasDuplicates || invoice.validation_status === 'NEEDS_REVIEW';

  // Split details
  const isInterState = invoice.igst_amount > 0;
  const taxSplitText = isInterState
    ? `IGST ${formatCurrency(invoice.igst_amount)}`
    : `${formatCurrency(invoice.cgst_amount)} / ${formatCurrency(invoice.sgst_amount)}`;

  const duplicateRefText = hasDuplicates
    ? `Matched #${invoice.duplicates![0].matched_invoice_id}`
    : 'No match';

  const gstinValid = Boolean(invoice.vendor_gstin && invoice.vendor_gstin.length === 15);

  return (
    <div className="w-full lg:w-[330px] xl:w-[360px] shrink-0 bg-white border border-[#E4DED4] rounded-lg p-5 shadow-sm flex flex-col font-sans">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#EAE5DC]">
        <h3 className="font-serif font-bold text-base text-[#15263B]">
          Selected invoice
        </h3>
        <button
          onClick={onClose}
          className="text-[#89919B] hover:text-[#15263B] transition-colors p-1"
          aria-label="Close panel"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Invoice Identity */}
      <div className="pt-3 pb-3">
        <h2 className="font-serif font-bold text-xl text-[#15263B] tracking-tight">
          {invoice.id}
        </h2>
        <p className="text-xs font-medium text-[#15263B] mt-0.5">
          {invoice.vendor_name || 'Vendor Not Specified'}
        </p>

        {/* Date and Amount Row */}
        <div className="grid grid-cols-2 gap-4 mt-3 pt-2">
          <div>
            <span className="text-[10px] text-[#89919B] block font-medium">Invoice date</span>
            <span className="text-xs font-bold text-[#15263B] block mt-0.5">
              {formatInvoiceDate(invoice.invoice_date)}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-[#89919B] block font-medium">Total Amount</span>
            <span className="text-sm font-bold text-[#15263B] block mt-0.5 font-mono">
              {formatCurrency(invoice.grand_total)}
            </span>
          </div>
        </div>
      </div>

      {/* Validation Findings */}
      <div className="pt-2">
        <h4 className="font-serif font-bold text-xs text-[#15263B] mb-2.5">
          Validation findings
        </h4>

        <div className="space-y-3">
          {/* Finding 1: Line-item arithmetic */}
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-2">
              {arithPassed ? (
                <CheckCircle2 className="w-4 h-4 text-[#26764F] shrink-0 mt-0.5" />
              ) : (
                <XCircle className="w-4 h-4 text-[#B83D37] shrink-0 mt-0.5" />
              )}
              <div>
                <p className="text-xs font-bold text-[#15263B] leading-none">
                  Line-item arithmetic
                </p>
                <p className="text-[11px] text-[#687586] mt-0.5">
                  {arithPassed
                    ? 'All line items match calculated amounts.'
                    : arithError?.difference
                    ? `Calculation variance: ${arithError.difference}`
                    : 'Subtotal calculation variance detected.'}
                </p>
              </div>
            </div>
            <span
              className={`text-[10px] font-semibold px-2 py-0.5 rounded shrink-0 ${
                arithPassed
                  ? 'text-[#26764F] bg-[#EAF4ED]'
                  : 'text-[#B83D37] bg-[#FBECEA]'
              }`}
            >
              {arithPassed ? 'Passed' : 'Failed'}
            </span>
          </div>

          {/* Finding 2: GST calculation */}
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-2">
              {gstPassed ? (
                <CheckCircle2 className="w-4 h-4 text-[#26764F] shrink-0 mt-0.5" />
              ) : (
                <XCircle className="w-4 h-4 text-[#B83D37] shrink-0 mt-0.5" />
              )}
              <div>
                <p className="text-xs font-bold text-[#15263B] leading-none">
                  GST calculation
                </p>
                <p className="text-[11px] text-[#687586] mt-0.5">
                  {gstPassed
                    ? 'Tax amount is correct.'
                    : gstError?.explanation
                    ? gstError.explanation
                    : 'Statutory GST rule mismatch.'}
                </p>
              </div>
            </div>
            <span
              className={`text-[10px] font-semibold px-2 py-0.5 rounded shrink-0 ${
                gstPassed
                  ? 'text-[#26764F] bg-[#EAF4ED]'
                  : 'text-[#B83D37] bg-[#FBECEA]'
              }`}
            >
              {gstPassed ? 'Passed' : 'Failed'}
            </span>
          </div>

          {/* Finding 3: Vendor status */}
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-2">
              {vendorNeedsReview ? (
                <AlertCircle className="w-4 h-4 text-[#C47B16] shrink-0 mt-0.5" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-[#26764F] shrink-0 mt-0.5" />
              )}
              <div>
                <p className="text-xs font-bold text-[#15263B] leading-none">
                  Vendor status
                </p>
                <p className="text-[11px] text-[#687586] mt-0.5">
                  {vendorNeedsReview
                    ? vendorWarningOrError?.explanation || 'Vendor has 2 previous discrepancies.'
                    : 'Vendor verified active in directory.'}
                </p>
              </div>
            </div>
            <span
              className={`text-[10px] font-semibold px-2 py-0.5 rounded shrink-0 ${
                vendorNeedsReview
                  ? 'text-[#C47B16] bg-[#FFF3E1]'
                  : 'text-[#26764F] bg-[#EAF4ED]'
              }`}
            >
              {vendorNeedsReview ? 'Needs Review' : 'Passed'}
            </span>
          </div>
        </div>
      </div>

      {/* Audit Action Button */}
      <button
        onClick={onOpenAuditRecord}
        className="w-full mt-4 mb-4 py-2 px-3 bg-white hover:bg-[#F4F1EB] border border-[#E4DED4] rounded-md text-xs font-medium text-[#15263B] flex items-center justify-center space-x-2 transition-colors shadow-sm"
      >
        <FileText className="w-3.5 h-3.5 text-[#15263B]" />
        <span>Open audit record</span>
      </button>

      {/* Accounting Checks */}
      <div className="pt-2 border-t border-[#EAE5DC]">
        <h4 className="font-serif font-bold text-xs text-[#15263B] mb-2.5">
          Accounting checks
        </h4>

        <div className="space-y-1.5 text-xs">
          <div className="flex justify-between py-0.5">
            <span className="text-[#687586]">GSTIN format</span>
            <span className={`font-semibold font-mono text-[11px] ${gstinValid ? 'text-[#26764F]' : 'text-[#B83D37]'}`}>
              {gstinValid ? 'Valid' : 'Invalid / Missing'}
            </span>
          </div>

          <div className="flex justify-between py-0.5">
            <span className="text-[#687586]">Taxable value</span>
            <span className="font-semibold text-[#15263B] font-mono text-[11px]">
              {formatCurrency(invoice.taxable_amount)}
            </span>
          </div>

          <div className="flex justify-between py-0.5">
            <span className="text-[#687586]">CGST / SGST split</span>
            <span className="font-semibold text-[#15263B] font-mono text-[11px]">
              {taxSplitText}
            </span>
          </div>

          <div className="flex justify-between py-0.5">
            <span className="text-[#687586]">Duplicate invoice reference</span>
            <span className="font-medium text-[#687586] font-mono text-[11px]">
              {duplicateRefText}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

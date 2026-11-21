import { Invoice, OperationalSummary, Vendor, ExceptionItem, AuditLogItem } from '../types';

const BASE_URL = '';

export const api = {
  // Operational Summary & Analytics
  async getSummary(): Promise<OperationalSummary> {
    const res = await fetch(`${BASE_URL}/api/reports/summary`);
    if (!res.ok) throw new Error('Failed to fetch summary metrics');
    return res.json();
  },

  async getAnalytics(): Promise<any> {
    const res = await fetch(`${BASE_URL}/api/reports/analytics`);
    if (!res.ok) throw new Error('Failed to fetch analytics');
    return res.json();
  },

  // Invoices
  async getInvoices(params: {
    search?: string;
    status?: string;
    vendor_id?: number;
    date_from?: string;
    date_to?: string;
    min_amount?: number;
    max_amount?: number;
    limit?: number;
  } = {}): Promise<Invoice[]> {
    const query = new URLSearchParams();
    if (params.search) query.append('search', params.search);
    if (params.status && params.status !== 'ALL') query.append('status', params.status);
    if (params.vendor_id) query.append('vendor_id', params.vendor_id.toString());
    if (params.date_from) query.append('date_from', params.date_from);
    if (params.date_to) query.append('date_to', params.date_to);
    if (params.min_amount) query.append('min_amount', params.min_amount.toString());
    if (params.max_amount) query.append('max_amount', params.max_amount.toString());
    if (params.limit) query.append('limit', params.limit.toString());

    const res = await fetch(`${BASE_URL}/api/invoices?${query.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch invoices');
    return res.json();
  },

  async getInvoice(id: string): Promise<Invoice> {
    const res = await fetch(`${BASE_URL}/api/invoices/${id}`);
    if (!res.ok) throw new Error('Failed to fetch invoice details');
    return res.json();
  },

  async uploadInvoice(file: File): Promise<Invoice> {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${BASE_URL}/api/invoices/upload`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Upload failed');
    }
    return res.json();
  },

  async uploadBulkInvoices(files: FileList | File[]): Promise<any> {
    const formData = new FormData();
    Array.from(files).forEach((f) => formData.append('files', f));
    const res = await fetch(`${BASE_URL}/api/invoices/bulk-upload`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) throw new Error('Bulk upload failed');
    return res.json();
  },

  async createManualInvoice(payload: any): Promise<Invoice> {
    const res = await fetch(`${BASE_URL}/api/invoices/manual`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Manual creation failed');
    }
    return res.json();
  },

  async revalidateInvoice(id: string): Promise<any> {
    const res = await fetch(`${BASE_URL}/api/invoices/${id}/validate`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error('Revalidation failed');
    return res.json();
  },

  async approveInvoice(id: string, comments: string = 'Approved by finance analyst'): Promise<any> {
    const res = await fetch(`${BASE_URL}/api/invoices/${id}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ comments }),
    });
    if (!res.ok) throw new Error('Approval failed');
    return res.json();
  },

  async rejectInvoice(id: string, comments: string): Promise<any> {
    const res = await fetch(`${BASE_URL}/api/invoices/${id}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ comments }),
    });
    if (!res.ok) throw new Error('Rejection failed');
    return res.json();
  },

  async correctInvoice(id: string, updates: Record<string, any>, reason: string): Promise<any> {
    const res = await fetch(`${BASE_URL}/api/invoices/${id}/correct`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ field_updates: updates, reason }),
    });
    if (!res.ok) throw new Error('Correction submission failed');
    return res.json();
  },

  // Exceptions
  async getExceptions(params: { severity?: string; category?: string; is_reviewed?: boolean; limit?: number } = {}): Promise<{ total: number; items: ExceptionItem[] }> {
    const query = new URLSearchParams();
    if (params.severity && params.severity !== 'ALL') query.append('severity', params.severity);
    if (params.category && params.category !== 'ALL') query.append('category', params.category);
    if (params.is_reviewed !== undefined) query.append('is_reviewed', String(params.is_reviewed));
    if (params.limit) query.append('limit', params.limit.toString());

    const res = await fetch(`${BASE_URL}/api/exceptions?${query.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch exceptions');
    return res.json();
  },

  async reviewException(id: number, review_note: string): Promise<any> {
    const res = await fetch(`${BASE_URL}/api/exceptions/${id}/review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ review_note }),
    });
    if (!res.ok) throw new Error('Exception review failed');
    return res.json();
  },

  // Duplicates
  async getDuplicates(): Promise<any> {
    const res = await fetch(`${BASE_URL}/api/duplicates`);
    if (!res.ok) throw new Error('Failed to fetch duplicates');
    return res.json();
  },

  async reviewDuplicate(id: number, resolution_note: string): Promise<any> {
    const res = await fetch(`${BASE_URL}/api/duplicates/${id}/review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resolution_note }),
    });
    if (!res.ok) throw new Error('Duplicate resolution failed');
    return res.json();
  },

  // Vendors
  async getVendors(): Promise<Vendor[]> {
    const res = await fetch(`${BASE_URL}/api/vendors`);
    if (!res.ok) throw new Error('Failed to fetch vendors');
    return res.json();
  },

  async getVendorDetails(id: number): Promise<any> {
    const res = await fetch(`${BASE_URL}/api/vendors/${id}`);
    if (!res.ok) throw new Error('Failed to fetch vendor details');
    return res.json();
  },

  async createVendor(payload: any): Promise<any> {
    const res = await fetch(`${BASE_URL}/api/vendors`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Vendor creation failed');
    }
    return res.json();
  },

  // Three-Way Matching & Purchase Orders
  async getPurchaseOrders(): Promise<any[]> {
    const res = await fetch(`${BASE_URL}/api/purchase-orders`);
    if (!res.ok) throw new Error('Failed to fetch purchase orders');
    return res.json();
  },

  async getInvoiceThreeWayMatch(id: string): Promise<any> {
    const res = await fetch(`${BASE_URL}/api/invoices/${id}/matching`);
    if (!res.ok) throw new Error('Failed to fetch 3-way matching');
    return res.json();
  },

  // Audit Logs
  async getAuditLogs(): Promise<AuditLogItem[]> {
    const res = await fetch(`${BASE_URL}/api/audit-logs`);
    if (!res.ok) throw new Error('Failed to fetch audit logs');
    return res.json();
  },

  // Settings & Rules
  async getSettings(): Promise<any> {
    const res = await fetch(`${BASE_URL}/api/settings`);
    if (!res.ok) throw new Error('Failed to fetch settings');
    return res.json();
  },

  async getValidationRules(): Promise<any[]> {
    const res = await fetch(`${BASE_URL}/api/validation-rules`);
    if (!res.ok) throw new Error('Failed to fetch validation rules');
    return res.json();
  },
};

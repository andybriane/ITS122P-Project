import { useState, useEffect, useCallback, useMemo } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import DashboardHeader from '../../components/DashboardHeader';
import invoiceService from '../../services/invoiceService';
import appointmentService from '../../services/appointmentService';

const filters = ['all', 'Paid', 'Unpaid'];

function peso(amount) {
  return `₱${Number(amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
}

function patientName(inv) {
  return `${inv.first_name || ''} ${inv.last_name || ''}`.trim();
}

const INITIAL_FORM = {
  appointmentId: '',
  isSeniorPwd: false,
  paymentMethod: '',
};

export default function Billing() {
  const [invoices, setInvoices] = useState([]);
  const [appointments, setAppointments] = useState([]); // unpaid appointments for "Create Invoice"
  const [isLoading, setIsLoading] = useState(true);

  const [selectedId, setSelectedId] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState(INITIAL_FORM);

  // Preview calculation (mirrors backend logic exactly)
  const preview = useMemo(() => {
    const appt = appointments.find((a) => String(a.id) === String(formData.appointmentId));
    const base = appt ? parseFloat(appt.total_estimated_price || 0) : 0;
    const discount = formData.isSeniorPwd ? base * 0.20 : 0;
    const tax = (base - discount) * 0.12;
    const total = (base - discount) + tax;
    return { base, discount, tax, total };
  }, [formData.appointmentId, formData.isSeniorPwd, appointments]);

  const loadInvoices = useCallback(async () => {
    try {
      const result = await invoiceService.getAll();
      if (result.success) {
        setInvoices(result.data);
        if (result.data.length > 0) setSelectedId(result.data[0].id);
      }
    } catch (err) {
      console.error('Could not load invoices:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

const loadAppointments = useCallback(async () => {
    try {
      const result = await appointmentService.getAll();
      if (result.success) {
        const completed = result.data.filter((a) => a.status === 'Completed' && !parseInt(a.has_invoice));
        setAppointments(completed);
      }
    } catch (err) {
      console.error('Could not load appointments:', err);
    }
  }, []);
  useEffect(() => {
    loadInvoices();
    loadAppointments();
  }, [loadInvoices, loadAppointments]);

  // Filtered invoice list
  const filteredInvoices = useMemo(() => {
    return invoices
      .filter((inv) => {
        const name = patientName(inv).toLowerCase();
        const q = searchQuery.toLowerCase();
        return name.includes(q);
      })
      .filter((inv) => activeFilter === 'all' || inv.status === activeFilter);
  }, [invoices, searchQuery, activeFilter]);

  const selectedInvoice = invoices.find((i) => i.id === selectedId) || null;

  // Analytics
  const totalRevenue = invoices.reduce((acc, i) => i.status === 'Paid' ? acc + parseFloat(i.grand_total || 0) : acc, 0);
  const totalPending = invoices.reduce((acc, i) => i.status === 'Unpaid' ? acc + parseFloat(i.grand_total || 0) : acc, 0);
  const averageTicket = invoices.length > 0 ? (totalRevenue + totalPending) / invoices.length : 0;

  const closeModal = () => {
    setFormData(INITIAL_FORM);
    setShowCreateModal(false);
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!formData.appointmentId) {
      alert('Please select an appointment.');
      return;
    }
    setIsSubmitting(true);
    try {
      const result = await invoiceService.create({
        appointment_id: parseInt(formData.appointmentId, 10),
        is_senior_pwd: formData.isSeniorPwd,
        payment_method: formData.paymentMethod || null,
        status: 'Unpaid',
      });

      if (result.success) {
        closeModal();
        await loadInvoices();
        setSelectedId(result.data.id);
      } else {
        alert(result.message || 'Could not create invoice.');
      }
    } catch (err) {
      alert('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (inv) => {
    const newStatus = inv.status === 'Paid' ? 'Unpaid' : 'Paid';
    try {
      const result = await invoiceService.update(inv.id, { status: newStatus });
      if (result.success) {
        setInvoices((prev) =>
          prev.map((i) => (i.id === inv.id ? { ...i, status: newStatus } : i))
        );
      } else {
        alert(result.message || 'Could not update status.');
      }
    } catch (err) {
      alert('Something went wrong.');
    }
  };

  const handlePrintInvoice = () => {
    if (!selectedInvoice) return;
    const name = patientName(selectedInvoice);
    const printWindow = window.open('', '_blank', 'width=800,height=900');
    printWindow.document.write(`
      <html>
        <head>
          <title>Invoice #${selectedInvoice.id} - ${name}</title>
          <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; color: #1e293b; line-height: 1.6; }
            .header { text-align: center; border-bottom: 3px solid #17345b; padding-bottom: 20px; margin-bottom: 30px; }
            .header h1 { color: #17345b; margin: 0; font-size: 28px; text-transform: uppercase; letter-spacing: 1px; }
            .header p { margin: 5px 0; color: #64748b; }
            .invoice-meta { display: flex; justify-content: space-between; margin-bottom: 30px; }
            .invoice-title { font-size: 22px; font-weight: bold; text-transform: uppercase; color: #0f172a; }
            .bill-to { background: #f8fafc; padding: 15px; border-radius: 6px; border: 1px solid #e2e8f0; margin-bottom: 30px; width: 50%; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            th { border-bottom: 2px solid #cbd5e1; padding: 10px 0; text-align: left; color: #0f172a; text-transform: uppercase; font-size: 14px; }
            th.right, td.right { text-align: right; }
            td { padding: 15px 0; border-bottom: 1px solid #e2e8f0; color: #1e293b; }
            td.right { font-weight: 500; }
            .totals { width: 300px; margin-left: auto; }
            .total-line { display: flex; justify-content: space-between; padding: 5px 0; color: #64748b; }
            .total-line.discount { color: #ef4444; }
            .grand-total { display: flex; justify-content: space-between; font-weight: bold; font-size: 20px; color: #0f172a; border-top: 2px solid #cbd5e1; padding-top: 10px; margin-top: 10px; }
            .footer { margin-top: 60px; text-align: center; color: #64748b; font-size: 12px; border-top: 1px solid #e2e8f0; padding-top: 20px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Pineda Dental Clinic</h1>
            <p>1395 Rizal Avenue, corner W 14th St, West Tapinac, Olongapo City</p>
            <p>Tel: 0992 838 0952 | Email: info@pinedadentalclinic.com</p>
          </div>
          <div class="invoice-meta">
            <div class="invoice-title">Official Invoice</div>
            <div style="text-align: right;">
              <strong>Invoice #:</strong> ${selectedInvoice.id}<br>
              <strong>Date:</strong> ${selectedInvoice.created_at ? selectedInvoice.created_at.split(' ')[0] : ''}<br>
              <strong>Status:</strong> ${selectedInvoice.status.toUpperCase()}
            </div>
          </div>
          <div class="bill-to">
            <strong style="color: #64748b; font-size: 12px; text-transform: uppercase;">Bill To:</strong><br>
            <strong style="font-size: 18px; color: #0f172a;">${name}</strong><br>
            <span style="color: #64748b;">${selectedInvoice.patient_email || ''}</span>
          </div>
          <table>
            <thead>
              <tr>
                <th>Service Description</th>
                <th class="right">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Appointment #${selectedInvoice.appointment_id}</td>
                <td class="right">₱${Number(selectedInvoice.base_price || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
              </tr>
            </tbody>
          </table>
          <div class="totals">
            <div class="total-line">
              <span>Base Price:</span>
              <span>₱${Number(selectedInvoice.base_price || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
            ${parseFloat(selectedInvoice.discount_amount) > 0 ? `
            <div class="total-line discount">
              <span>PWD/Senior Discount (20%):</span>
              <span>-₱${Number(selectedInvoice.discount_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>` : ''}
            <div class="total-line">
              <span>Tax (12% VAT):</span>
              <span>₱${Number(selectedInvoice.tax_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
            <div class="grand-total">
              <span>Grand Total:</span>
              <span>₱${Number(selectedInvoice.grand_total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
          <div class="footer">
            <p>Thank you for trusting Pineda Dental Clinic. Please keep this official receipt for your records.</p>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 250);
  };

  const inputStyle = { width: '100%', padding: 'var(--space-2)', borderRadius: 'var(--radius-md)', border: '1px solid var(--dash-border)', background: 'var(--bg-card)', color: 'var(--text-main)' };
  const labelStyle = { display: 'block', marginBottom: 'var(--space-2)', fontSize: 'var(--text-sm)', fontWeight: 500 };

  return (
    <DashboardLayout>
      <DashboardHeader
        title="Billing & Invoices"
        subtitle="Manage payments and financial records"
        search={
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ position: 'absolute', left: '10px', width: '16px', height: '16px', color: 'var(--text-muted)' }}>
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.3-4.3"></path>
            </svg>
            <input
              type="text"
              placeholder="Search invoices..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ padding: 'var(--space-2) var(--space-2) var(--space-2) 32px', borderRadius: 'var(--radius-md)', border: '1px solid var(--dash-border)', background: 'var(--bg-card)', color: 'var(--text-main)' }}
            />
          </div>
        }
        action={
          <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16" style={{ marginRight: 'var(--space-2)' }}>
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            Create Invoice
          </button>
        }
      />

      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-icon green">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="1" x2="12" y2="23"></line>
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
            </svg>
          </div>
          <div className="stat-content">
            <span className="stat-value">{peso(totalRevenue)}</span>
            <span className="stat-label">Total Revenue</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon amber">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
          </div>
          <div className="stat-content">
            <span className="stat-value">{peso(totalPending)}</span>
            <span className="stat-label">Outstanding Balance</span>
          </div>
        </div>
      </div>

      {isLoading ? (
        <p style={{ padding: 'var(--space-6)', color: 'var(--text-muted)' }}>Loading invoices...</p>
      ) : (
        <div className="billing-layout">
          {/* Invoice List */}
          <div className="list-container">
            <div className="list-header"><h3>Recent Invoices</h3></div>
            <div className="list-filters">
              {filters.map((f) => (
                <button key={f} className={`filter-btn${activeFilter === f ? ' active' : ''}`} onClick={() => setActiveFilter(f)}>{f}</button>
              ))}
            </div>
            <div className="invoice-list selectable-list">
              {filteredInvoices.length === 0 && (
                <p style={{ padding: 'var(--space-4)', color: 'var(--text-muted)' }}>No invoices found.</p>
              )}
              {filteredInvoices.map((inv) => (
                <div
                  key={inv.id}
                  className={`invoice-item${selectedInvoice && selectedInvoice.id === inv.id ? ' active' : ''}`}
                  onClick={() => setSelectedId(inv.id)}
                  style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--space-3)', borderBottom: '1px solid var(--dash-border)' }}
                >
                  <div>
                    <h4 style={{ margin: 0, fontSize: 'var(--text-sm)' }}>{patientName(inv)}</h4>
                    <p style={{ margin: 0, fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                      {inv.created_at ? inv.created_at.split(' ')[0] : ''}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                    <p style={{ margin: 0, fontWeight: 'bold' }}>{peso(inv.grand_total)}</p>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleToggleStatus(inv); }}
                      style={{ background: inv.status === 'Paid' ? '#10b981' : 'var(--dash-hover)', color: inv.status === 'Paid' ? '#ffffff' : 'var(--text-muted)', border: inv.status === 'Paid' ? 'none' : '1px solid var(--dash-border)', padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer' }}
                    >
                      {inv.status === 'Paid' ? 'Paid ✓' : 'Unpaid'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Panel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div className="details-panel" style={{ flex: 1 }}>
              {selectedInvoice ? (
                <>
                  <div className="details-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)' }}>
                    <div className="details-title">
                      <h2>Invoice #{selectedInvoice.id}</h2>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button className="btn btn-primary btn-sm" onClick={handlePrintInvoice}>Print Receipt</button>
                    </div>
                  </div>

                  <div style={{ background: 'var(--bg-card)', padding: 'var(--space-6)', borderRadius: 'var(--radius-md)', border: '1px solid var(--dash-border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-8)' }}>
                      <div>
                        <h3 style={{ color: '#17345b', margin: 0 }}>Pineda Dental Clinic</h3>
                        <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)', margin: 'var(--space-1) 0 0 0' }}>
                          1395 Rizal Avenue, corner W 14th St<br />West Tapinac, Olongapo City<br />0992 838 0952
                        </p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ fontWeight: 'bold', margin: 0 }}>Bill To:</p>
                        <p style={{ margin: 0 }}>{patientName(selectedInvoice)}</p>
                        <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>{selectedInvoice.patient_email}</p>
                      </div>
                    </div>

                    <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 'var(--space-8)' }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid var(--dash-border)', textAlign: 'left' }}>
                          <th style={{ padding: 'var(--space-2) 0' }}>Description</th>
                          <th style={{ padding: 'var(--space-2) 0', textAlign: 'right' }}>Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr style={{ borderBottom: '1px solid var(--dash-border)' }}>
                          <td style={{ padding: 'var(--space-3) 0' }}>
                            Appointment #{selectedInvoice.appointment_id}
                            {selectedInvoice.appointment_date && (
                              <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginLeft: '8px' }}>
                                ({selectedInvoice.appointment_date})
                              </span>
                            )}
                          </td>
                          <td style={{ padding: 'var(--space-3) 0', textAlign: 'right' }}>{peso(selectedInvoice.base_price)}</td>
                        </tr>
                      </tbody>
                    </table>

                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <div style={{ width: '280px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
                          <span style={{ color: 'var(--text-muted)' }}>Base Price:</span>
                          <span>{peso(selectedInvoice.base_price)}</span>
                        </div>
                        {parseFloat(selectedInvoice.discount_amount) > 0 && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-2)', color: '#ef4444' }}>
                            <span>PWD/Senior Discount (20%):</span>
                            <span>-{peso(selectedInvoice.discount_amount)}</span>
                          </div>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
                          <span style={{ color: 'var(--text-muted)' }}>Tax (12% VAT):</span>
                          <span>{peso(selectedInvoice.tax_amount)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 'var(--space-2)', borderTop: '2px solid var(--dash-border)', fontWeight: 'bold', fontSize: 'var(--text-lg)' }}>
                          <span>Total:</span>
                          <span>{peso(selectedInvoice.grand_total)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div style={{ color: 'var(--text-muted)' }}>Select an invoice to view details.</div>
              )}
            </div>

            {/* Financial Snapshot */}
            <div className="details-panel" style={{ padding: 'var(--space-4)' }}>
              <h3 style={{ margin: '0 0 var(--space-4) 0', fontSize: 'var(--text-md)', color: 'var(--color-primary)' }}>Financial Snapshot</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                <div style={{ background: 'var(--dash-hover)', padding: 'var(--space-3)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--dash-border)' }}>
                  <span style={{ display: 'block', fontSize: 'var(--text-xs)', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Total Invoices</span>
                  <span style={{ fontSize: 'var(--text-lg)', fontWeight: 'bold', color: 'var(--text-main)' }}>{invoices.length}</span>
                </div>
                <div style={{ background: 'var(--dash-hover)', padding: 'var(--space-3)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--dash-border)' }}>
                  <span style={{ display: 'block', fontSize: 'var(--text-xs)', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Avg. Ticket Size</span>
                  <span style={{ fontSize: 'var(--text-lg)', fontWeight: 'bold', color: 'var(--text-main)' }}>{peso(averageTicket)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Invoice Modal */}
      {showCreateModal && (
        <div className="modal active">
          <div className="modal-backdrop" onClick={closeModal}></div>
          <div className="modal-content" style={{ maxWidth: '800px', width: '90%' }}>
            <div className="modal-header">
              <h3>Generate New Invoice</h3>
              <button className="btn btn-icon modal-close" aria-label="Close" onClick={closeModal}>&times;</button>
            </div>
            <div className="modal-body">
              <div className="responsive-grid">
                {/* Form */}
                <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                  <div className="form-group" style={{ marginBottom: 'var(--space-4)' }}>
                    <label style={labelStyle}>Select Completed Appointment</label>
                    <select
                      required
                      value={formData.appointmentId}
                      onChange={(e) => setFormData({ ...formData, appointmentId: e.target.value })}
                      style={inputStyle}
                    >
                      <option value="">-- Choose Appointment --</option>
                      {appointments.map((a) => (
                        <option key={a.id} value={a.id}>
                          #{a.id} — {a.first_name} {a.last_name} ({a.appointment_date}) — {peso(a.total_estimated_price)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group" style={{ marginBottom: 'var(--space-4)' }}>
                    <label style={labelStyle}>Payment Method (Optional)</label>
                    <select
                      value={formData.paymentMethod}
                      onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                      style={inputStyle}
                    >
                      <option value="">-- Select Payment Method --</option>
                      <option value="Cash">Cash</option>
                      <option value="Credit Card">Credit Card</option>
                      <option value="GCash">GCash</option>
                      <option value="HMO">HMO</option>
                      <option value="Insurance">Insurance</option>
                    </select>
                  </div>

                  <div className="form-group" style={{ marginBottom: 'var(--space-6)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="checkbox"
                      id="discountCheck"
                      checked={formData.isSeniorPwd}
                      onChange={(e) => setFormData({ ...formData, isSeniorPwd: e.target.checked })}
                      style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                    />
                    <label htmlFor="discountCheck" style={{ fontSize: 'var(--text-sm)', fontWeight: 500, cursor: 'pointer' }}>
                      Apply Senior / PWD Discount (20%)
                    </label>
                  </div>

                  <div className="modal-footer" style={{ padding: 0, marginTop: 'auto', border: 'none', background: 'transparent' }}>
                    <button type="button" className="btn btn-outline" onClick={closeModal}>Cancel</button>
                    <button type="submit" className="btn btn-primary" disabled={isSubmitting || !formData.appointmentId}>
                      {isSubmitting ? 'Generating...' : 'Generate Invoice'}
                    </button>
                  </div>
                </form>

                {/* Receipt Preview */}
                <div style={{ background: 'var(--color-primary-light)', padding: 'var(--space-4)', borderRadius: 'var(--radius-md)', color: '#1e293b' }}>
                  <h4 style={{ margin: '0 0 var(--space-4) 0', fontSize: 'var(--text-sm)', textTransform: 'uppercase', letterSpacing: '1px' }}>Receipt Preview</h4>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-sm)', marginBottom: '8px' }}>
                    <span>Base Price:</span>
                    <span>{peso(preview.base)}</span>
                  </div>
                  {formData.isSeniorPwd && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-sm)', color: '#ef4444', marginBottom: '8px' }}>
                      <span>Discount (20%):</span>
                      <span>-{peso(preview.discount)}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-sm)', marginBottom: '8px' }}>
                    <span>VAT (12%):</span>
                    <span>{peso(preview.tax)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: 'var(--text-lg)', marginTop: 'var(--space-4)', paddingTop: 'var(--space-4)', borderTop: '2px dashed #94a3b8' }}>
                    <span>Grand Total:</span>
                    <span>{peso(preview.total)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
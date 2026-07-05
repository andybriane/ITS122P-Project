const API_BASE = 'http://localhost/pineda-dentalclinic-api/api/invoices.php';

function getAuthHeaders() {
  const token = localStorage.getItem('authToken');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

const invoiceService = {
  /**
   * GET all invoices — staff only.
   */
  async getAll() {
    const res = await fetch(API_BASE, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  /**
   * GET one invoice by invoice ID.
   */
  async getById(id) {
    const res = await fetch(`${API_BASE}?id=${id}`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  /**
   * GET invoice by appointment ID.
   * Useful for checking if an invoice already exists before creating one.
   */
  async getByAppointmentId(appointmentId) {
    const res = await fetch(`${API_BASE}?appointment_id=${appointmentId}`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  /**
   * POST — create an invoice from an existing appointment.
   *
   * data shape:
   * {
   *   appointment_id: 5,
   *   is_senior_pwd: false,      (optional, default false)
   *   payment_method: 'Cash',    (optional)
   *   status: 'Unpaid'           (optional, default 'Unpaid')
   * }
   */
  async create(data) {
    const res = await fetch(API_BASE, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return res.json();
  },

  /**
   * PUT — update payment method, status, or senior/PWD flag.
   * Pricing is automatically recalculated on the backend.
   *
   * data shape (any subset):
   * {
   *   is_senior_pwd: true,
   *   payment_method: 'GCash',
   *   status: 'Paid'
   * }
   */
  async update(id, data) {
    const res = await fetch(`${API_BASE}?id=${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return res.json();
  },

  /**
   * DELETE — soft-delete an invoice. Staff only.
   */
  async remove(id) {
    const res = await fetch(`${API_BASE}?id=${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return res.json();
  },
};

export default invoiceService;
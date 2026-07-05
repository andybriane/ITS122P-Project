// src/services/appointmentService.js
const API_BASE = 'http://localhost/pineda-dentalclinic-api/api/appointments.php';

function getAuthHeaders() {
  const token = localStorage.getItem('authToken');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

const appointmentService = {
  /**
   * GET all appointments — staff only.
   */
  async getAll() {
    const res = await fetch(API_BASE, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  /**
   * GET one appointment by ID, includes its services array.
   */
  async getById(id) {
    const res = await fetch(`${API_BASE}?id=${id}`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  /**
   * POST — create a new appointment.
   * Works for both public (no token) and staff (Admin source).
   *
   * data shape:
   * {
   *   first_name, last_name, email, phone,
   *   doctor_id (number or null),
   *   date ('YYYY-MM-DD'),
   *   time ('HH:MM'),
   *   service_ids: [1, 2, ...],
   *   notes (optional),
   *   duration_minutes (optional)
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
   * PUT — update an appointment. Staff only.
   *
   * data shape (any subset):
   * {
   *   doctor_id, date, time, status,
   *   notes, service_ids, duration_minutes
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
   * DELETE — soft-delete an appointment. Staff only.
   */
  async remove(id) {
    const res = await fetch(`${API_BASE}?id=${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return res.json();
  },
};

export default appointmentService;
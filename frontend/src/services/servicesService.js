/**
 * Services Service
 * Talks to the real PHP backend (api/services.php).
 * GET is public (no token needed — used by the public Services and
 * Booking pages). Create/update/delete require a valid staff session.
 */

const API_BASE = 'http://localhost/pineda-dentalclinic-api/api';

function authHeaders() {
  const token = localStorage.getItem('authToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export const servicesService = {
  async getAll() {
    const response = await fetch(`${API_BASE}/services.php`);
    return response.json();
  },

  async getById(id) {
    const response = await fetch(`${API_BASE}/services.php?id=${id}`);
    return response.json();
  },

  async create(data) {
    const response = await fetch(`${API_BASE}/services.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(data),
    });
    return response.json();
  },

  async update(id, data) {
    const response = await fetch(`${API_BASE}/services.php?id=${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(data),
    });
    return response.json();
  },

  async remove(id) {
    const response = await fetch(`${API_BASE}/services.php?id=${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    return response.json();
  },
};

export default servicesService;
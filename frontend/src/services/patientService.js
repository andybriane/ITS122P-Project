/**
 * Patient Service
 * Talks to the real PHP backend (api/patients.php).
 * Every method requires a valid staff session (Authorization: Bearer <token>).
 */

const API_BASE = 'http://localhost/pineda-dentalclinic-api/api';

function authHeaders() {
  const token = localStorage.getItem('authToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export const patientService = {
  async getAll() {
    const response = await fetch(`${API_BASE}/patients.php`, {
      headers: authHeaders(),
    });
    return response.json();
  },

  async getById(id) {
    const response = await fetch(`${API_BASE}/patients.php?id=${id}`, {
      headers: authHeaders(),
    });
    return response.json();
  },

  async create(data) {
    const response = await fetch(`${API_BASE}/patients.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(data),
    });
    return response.json();
  },

  async update(id, data) {
    const response = await fetch(`${API_BASE}/patients.php?id=${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(data),
    });
    return response.json();
  },

  async remove(id) {
    const response = await fetch(`${API_BASE}/patients.php?id=${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    return response.json();
  },
};

export default patientService;
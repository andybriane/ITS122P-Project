/**
 * Staff Service
 * Talks to the real PHP backend (api/staff.php).
 * Read (getAll/getById) requires a valid staff session.
 * register() is the one public method — used by the invite-link
 * registration page, before the new staff member has any token yet.
 */

const API_BASE = 'http://localhost/pineda-dentalclinic-api/api';

function authHeaders() {
  const token = localStorage.getItem('authToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export const staffService = {
  async getAll() {
    const response = await fetch(`${API_BASE}/staff.php`, {
      headers: authHeaders(),
    });
    return response.json();
  },

  async getById(id) {
    const response = await fetch(`${API_BASE}/staff.php?id=${id}`, {
      headers: authHeaders(),
    });
    return response.json();
  },

  /**
   * Admin only. Generates an invite code for { email, role }.
   * role must be exactly 'Dentist' or 'Admin/Secretary'.
   */
  async invite(data) {
    const response = await fetch(`${API_BASE}/staff.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(data),
    });
    return response.json();
  },

  /**
   * Public — no auth header. Completes registration with an invite code.
   * data: { invite_code, email, password, first_name, last_name }
   */
  async register(data) {
    const response = await fetch(`${API_BASE}/staff.php?action=register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return response.json();
  },

  /**
   * Admin only. Updates a staff member's role.
   */
  async update(id, data) {
    const response = await fetch(`${API_BASE}/staff.php?id=${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(data),
    });
    return response.json();
  },

  /**
   * Admin only. Removes a staff member entirely (user + profile + days off
   * + revokes their active sessions).
   */
  async remove(id) {
    const response = await fetch(`${API_BASE}/staff.php?id=${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    return response.json();
  },

  /**
   * Any logged-in staff member can log a day off for staffId.
   * date should be 'YYYY-MM-DD'.
   */
   async addDayOff(userId, date) {
    const response = await fetch(`${API_BASE}/staff.php?action=day-off`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ user_id: userId, date }),
    });
    return response.json();
  },
};

export default staffService;

/**
 * Auth Service
 * Talks to the real PHP backend (api/auth/*.php).
 */

const API_BASE = 'http://localhost/pineda-dentalclinic-api/api/auth';

export const authService = {
  /**
   * Step 1: verify email + password.
   * Backend returns success/role/name but does NOT log the user in yet —
   * OTP is the second factor, handled separately below.
   */
  async login(credentials) {
    const response = await fetch(`${API_BASE}/login.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });
    return response.json();
  },

  /**
   * Step 1.5: ask the backend to generate and "send" an OTP for this email.
   * In dev mode, the OTP comes back directly in the response (no real SMS/email yet).
   */
  async requestOTP(email) {
    const response = await fetch(`${API_BASE}/request-otp.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    return response.json();
  },

  /**
   * Step 2: verify the OTP code. On success, backend issues a real session token.
   */
  async verifyOTP(email, otpCode) {
    const response = await fetch(`${API_BASE}/verify-otp.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp: otpCode }),
    });
    return response.json();
  },

  /**
   * Resend OTP is just requesting a fresh one — same endpoint as requestOTP.
   */
  async resendOTP(email) {
    return this.requestOTP(email);
  },

  /**
   * Logout: tell the backend to delete this token, then clear it locally
   * regardless of whether the network call succeeds (so the user is never
   * stuck "logged in" on the frontend just because the request failed).
   */
  async logout() {
    const token = localStorage.getItem('authToken');
    try {
      if (token) {
        await fetch(`${API_BASE}/logout.php`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });
      }
    } finally {
      localStorage.removeItem('authToken');
      localStorage.removeItem('authUser');
    }
    return { success: true };
  },

  /**
   * Get current user from localStorage (set at verifyOTP time).
   * No backend call needed for this — it's just reading what we already stored.
   */
  getCurrentUser() {
    const raw = localStorage.getItem('authUser');
    return raw ? JSON.parse(raw) : null;
  },

  getToken() {
    return localStorage.getItem('authToken');
  },

  isAuthenticated() {
    return !!localStorage.getItem('authToken');
  },
};

export default authService;
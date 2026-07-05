// src/services/emailService.js

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost/pineda-dentalclinic-api/api';

/**
 * Generic email sender — Calendar.jsx and Booking.jsx both use this
 */
export async function sendEmail({ to, subject, text, html, templateType, data }) {
  const response = await fetch(`${API_BASE}/emails.php`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      to,
      subject,
      text,
      html,
      templateType,
      data,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to send email');
  }

  return response.json();
}

// Optional: wrappers if you want them later
export async function sendStatusUpdateEmail(payload) {
  return sendEmail({ ...payload, templateType: 'status-update' });
}

export async function sendBookingConfirmationEmail(payload) {
  return sendEmail({ ...payload, templateType: 'booking-confirmation' });
}

export async function sendReminderEmail(payload) {
  return sendEmail({ ...payload, templateType: 'reminder' });
}

export async function sendCancellationEmail(payload) {
  return sendEmail({ ...payload, templateType: 'cancellation' });
}
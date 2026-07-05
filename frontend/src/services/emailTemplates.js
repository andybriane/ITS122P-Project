// src/services/emailTemplates.js

export const emailTemplates = {
  // When patient books online (Booking.jsx)
  bookingConfirmation: ({ name, date, time, service }) => ({
    subject: `Appointment Confirmed — Pineda Dental Clinic`,
    text: `Hi ${name},\n\nYour appointment for ${service || 'Dental Service'} on ${date} at ${time} has been received and is currently Pending. We will confirm shortly.\n\n— Pineda Dental Clinic`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; color: #333;">
        <h2 style="color: #0ea5e9;">Appointment Received</h2>
        <p>Hi <strong>${name}</strong>,</p>
        <p>Thank you for booking with Pineda Dental Clinic. Here are your details:</p>
        <ul>
          <li><strong>Date:</strong> ${date}</li>
          <li><strong>Time:</strong> ${time}</li>
          <li><strong>Service:</strong> ${service || '—'}</li>
          <li><strong>Status:</strong> Pending</li>
        </ul>
        <p>We will send you a confirmation email once your appointment is reviewed.</p>
        <p>— Pineda Dental Clinic</p>
      </div>
    `,
  }),

  // When admin changes status in Calendar.jsx (Pending → Confirmed, Completed, etc.)
  statusUpdate: ({ name, status, date, time, service }) => ({
    subject: `Appointment Update — ${status}`,
    text: `Hi ${name},\n\nYour appointment for ${service || 'Dental Service'} on ${date} at ${time} is now: ${status}.\n\n— Pineda Dental Clinic`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; color: #333;">
        <h2 style="color: #0ea5e9;">Appointment Update</h2>
        <p>Hi <strong>${name}</strong>,</p>
        <p>Your appointment has been updated:</p>
        <ul>
          <li><strong>Date:</strong> ${date}</li>
          <li><strong>Time:</strong> ${time}</li>
          <li><strong>Service:</strong> ${service || '—'}</li>
          <li><strong>Status:</strong> <span style="color: #0ea5e9; font-weight: bold;">${status}</span></li>
        </ul>
        <p>— Pineda Dental Clinic</p>
      </div>
    `,
  }),
};
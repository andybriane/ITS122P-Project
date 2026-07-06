// src/services/emailTemplates.js

// ─── Color tokens for status badges ─────────────────────────────
const STATUS_COLORS = {
  Pending:    { bg: '#fef3c7', text: '#92400e', border: '#f59e0b' },
  Confirmed:  { bg: '#d1fae5', text: '#065f46', border: '#10b981' },
  Completed:  { bg: '#dbeafe', text: '#1e40af', border: '#3b82f6' },
  Cancelled:  { bg: '#fee2e2', text: '#991b1b', border: '#ef4444' },
  Rescheduled:{ bg: '#e0e7ff', text: '#3730a3', border: '#6366f1' },
  NoShow:     { bg: '#f3f4f6', text: '#374151', border: '#9ca3af' },
};

const CLINIC = {
  name: 'Pineda Dental Clinic',
  address: '1395 Rizal Avenue, corner W 14th St, West Tapinac, Olongapo City',
  phone: '0992-838-0952',
  email: 'appointments@pinedadental.com',
  hours: 'Mon - Sat: 9:00 AM - 4:00 PM | Closed on Sunday',
  website: 'https://pinedadental.com',
  primary: '#0ea5e9',
  dark: '#0f172a',
  gray: '#64748b',
};

// ─── Helpers ─────────────────────────────────────────────────────
const getStatusStyle = (status) => {
  const s = STATUS_COLORS[status] || STATUS_COLORS.Pending;
  return `background:${s.bg};color:${s.text};border:1px solid ${s.border};padding:6px 14px;border-radius:999px;font-size:13px;font-weight:600;display:inline-block;text-transform:uppercase;letter-spacing:0.5px;`;
};

const formatDate = (date) => {
  try {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });
  } catch {
    return date;
  }
};

// ─── Shared layout wrapper (Gmail-safe table layout) ─────────────
const htmlWrapper = ({ title, preheader, content }) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    @media only screen and (max-width: 600px) {
      .container { width: 100% !important; padding: 16px !important; }
      .details-table td { display: block; width: 100% !important; padding: 4px 0 !important; }
      .details-table td:first-child { font-weight: 600; color: #0f172a; }
      .btn { width: 100% !important; text-align: center !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${preheader}</div>
  
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#f1f5f9;">
    <tr>
      <td align="center" style="padding: 24px 0;">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="600" class="container" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px -1px rgba(0,0,0,0.1),0 2px 4px -1px rgba(0,0,0,0.06);">
          
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%);padding:32px 40px;text-align:center;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="text-align:center;">
                    <div style="width:48px;height:48px;background:rgba(255,255,255,0.2);border-radius:12px;display:inline-block;margin-bottom:12px;line-height:48px;font-size:24px;">&#129463;</div>
                    <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.5px;">${CLINIC.name}</h1>
                    <p style="margin:6px 0 0;color:#e0f2fe;font-size:13px;letter-spacing:0.5px;">CARING FOR YOUR SMILE</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              ${content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f8fafc;padding:28px 40px;border-top:1px solid #e2e8f0;text-align:center;">
              <p style="margin:0 0 8px;color:#0f172a;font-size:14px;font-weight:600;">${CLINIC.name}</p>
              <p style="margin:0 0 16px;color:#64748b;font-size:12px;line-height:1.6;">
                ${CLINIC.address}<br>
                ${CLINIC.phone} &bull; ${CLINIC.email}<br>
                ${CLINIC.hours}
              </p>
              <p style="margin:0;color:#94a3b8;font-size:11px;">
                This is an automated message. Please do not reply directly to this email.<br>
                For questions, call us at ${CLINIC.phone} or visit <a href="${CLINIC.website}" style="color:#0ea5e9;text-decoration:none;">our website</a>.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

// ─── Plain-text wrapper ─────────────────────────────────────────
const textWrapper = ({ body, footer }) =>
  `${body}\n\n---\n${CLINIC.name}\n${CLINIC.address}\nPhone: ${CLINIC.phone}\nEmail: ${CLINIC.email}\nHours: ${CLINIC.hours}\nWebsite: ${CLINIC.website}\n\n${footer}`;

// ═══════════════════════════════════════════════════════════════
//  TEMPLATES
// ═══════════════════════════════════════════════════════════════

export const emailTemplates = {
  // ── 1. Booking Confirmation (patient books online) ──────────
  bookingConfirmation: ({ name, date, time, service }) => {
    const subject = `Appointment Confirmed - Pineda Dental Clinic`;
    const preheader = `Hi ${name}, we've received your appointment request for ${date}.`;
    const displayDate = formatDate(date);

    const htmlContent = `
      <h2 style="margin:0 0 8px;color:#0f172a;font-size:20px;font-weight:700;">Appointment Received</h2>
      <p style="margin:0 0 24px;color:#64748b;font-size:14px;">Hi <strong style="color:#0f172a;">${name}</strong>, thank you for choosing ${CLINIC.name}. We've received your booking and will confirm it shortly.</p>
      
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background:#f8fafc;border-radius:10px;border:1px solid #e2e8f0;margin-bottom:24px;" class="details-table">
        <tr><td colspan="2" style="padding:16px 20px 8px;font-size:12px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.8px;">Appointment Details</td></tr>
        <tr>
          <td style="padding:8px 20px;width:35%;color:#64748b;font-size:14px;vertical-align:top;">Date</td>
          <td style="padding:8px 20px;color:#0f172a;font-size:14px;font-weight:600;vertical-align:top;">${displayDate}</td>
        </tr>
        <tr>
          <td style="padding:8px 20px;color:#64748b;font-size:14px;vertical-align:top;">Time</td>
          <td style="padding:8px 20px;color:#0f172a;font-size:14px;font-weight:600;vertical-align:top;">${time}</td>
        </tr>
        <tr>
          <td style="padding:8px 20px;color:#64748b;font-size:14px;vertical-align:top;">Service</td>
          <td style="padding:8px 20px;color:#0f172a;font-size:14px;font-weight:600;vertical-align:top;">${service || 'General Dental Service'}</td>
        </tr>
        <tr>
          <td style="padding:8px 20px 16px;color:#64748b;font-size:14px;vertical-align:top;">Status</td>
          <td style="padding:8px 20px 16px;vertical-align:top;">
            <span style="${getStatusStyle('Pending')}">Pending</span>
          </td>
        </tr>
      </table>

      <div style="background:#fffbeb;border:1px solid #fcd34d;border-radius:8px;padding:16px 20px;margin-bottom:24px;">
        <p style="margin:0;color:#92400e;font-size:13px;line-height:1.5;">
          <strong style="color:#78350f;">Next Step:</strong> Our team is reviewing your request. You will receive a confirmation email once your appointment is approved. No action is needed from you at this time.
        </p>
      </div>

      <p style="margin:0 0 8px;color:#0f172a;font-size:14px;font-weight:600;">Need to make changes?</p>
      <p style="margin:0 0 24px;color:#64748b;font-size:14px;line-height:1.5;">
        If you need to reschedule or cancel, please call us at <a href="tel:${CLINIC.phone.replace(/\D/g, '')}" style="color:#0ea5e9;text-decoration:none;font-weight:600;">${CLINIC.phone}</a> at least 24 hours in advance.
      </p>

      <p style="margin:0;color:#64748b;font-size:14px;">We look forward to seeing you!<br><strong style="color:#0f172a;">The ${CLINIC.name} Team</strong></p>
    `;

    const textBody = `APPOINTMENT RECEIVED - Pineda Dental Clinic

Hi ${name},

Thank you for choosing ${CLINIC.name}. We've received your booking and will confirm it shortly.

APPOINTMENT DETAILS
- Date: ${displayDate}
- Time: ${time}
- Service: ${service || 'General Dental Service'}
- Status: PENDING

Next Step: Our team is reviewing your request. You will receive a confirmation email once your appointment is approved. No action is needed from you at this time.

Need to make changes? Call us at ${CLINIC.phone} at least 24 hours in advance.

We look forward to seeing you!
The ${CLINIC.name} Team`;

    return {
      subject,
      text: textWrapper({ body: textBody, footer: 'This is an automated message. Please do not reply directly to this email.' }),
      html: htmlWrapper({ title: subject, preheader, content: htmlContent }),
    };
  },

  // ── 2. Status Update (admin changes status in Calendar.jsx) ───
  statusUpdate: ({ name, status, date, time, service, notes }) => {
    const safeStatus = status || 'Updated';
    const subject = `Appointment Update - ${safeStatus}`;
    const preheader = `Hi ${name}, your appointment on ${date} is now ${safeStatus}.`;
    const displayDate = formatDate(date);
    const statusStyle = getStatusStyle(safeStatus);
    const isCancelled = safeStatus === 'Cancelled';
    const isConfirmed = safeStatus === 'Confirmed';

    let actionBlock = '';
    if (isCancelled) {
      actionBlock = `
        <div style="background:#fee2e2;border:1px solid #fca5a5;border-radius:8px;padding:16px 20px;margin-bottom:24px;">
          <p style="margin:0;color:#991b1b;font-size:13px;line-height:1.5;">
            <strong style="color:#7f1d1d;">Your appointment has been cancelled.</strong><br>
            If you did not request this cancellation or would like to reschedule, please contact us immediately at ${CLINIC.phone}.
          </p>
        </div>`;
    } else if (isConfirmed) {
      actionBlock = `
        <div style="background:#d1fae5;border:1px solid #6ee7b7;border-radius:8px;padding:16px 20px;margin-bottom:24px;">
          <p style="margin:0;color:#065f46;font-size:13px;line-height:1.5;">
            <strong style="color:#064e3b;">Your appointment is confirmed!</strong><br>
            Please arrive 10 minutes early. If you need to reschedule, call us at least 24 hours in advance.
          </p>
        </div>`;
    } else {
      actionBlock = `
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px 20px;margin-bottom:24px;">
          <p style="margin:0;color:#475569;font-size:13px;line-height:1.5;">
            <strong style="color:#0f172a;">Status updated.</strong><br>
            Your appointment status has been changed to <strong>${safeStatus}</strong>. If you have questions, please contact us.
          </p>
        </div>`;
    }

    const htmlContent = `
      <h2 style="margin:0 0 8px;color:#0f172a;font-size:20px;font-weight:700;">Appointment Update</h2>
      <p style="margin:0 0 24px;color:#64748b;font-size:14px;">Hi <strong style="color:#0f172a;">${name}</strong>, your appointment status has been updated. Here are the latest details:</p>
      
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background:#f8fafc;border-radius:10px;border:1px solid #e2e8f0;margin-bottom:24px;" class="details-table">
        <tr><td colspan="2" style="padding:16px 20px 8px;font-size:12px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.8px;">Current Details</td></tr>
        <tr>
          <td style="padding:8px 20px;width:35%;color:#64748b;font-size:14px;vertical-align:top;">Date</td>
          <td style="padding:8px 20px;color:#0f172a;font-size:14px;font-weight:600;vertical-align:top;">${displayDate}</td>
        </tr>
        <tr>
          <td style="padding:8px 20px;color:#64748b;font-size:14px;vertical-align:top;">Time</td>
          <td style="padding:8px 20px;color:#0f172a;font-size:14px;font-weight:600;vertical-align:top;">${time}</td>
        </tr>
        <tr>
          <td style="padding:8px 20px;color:#64748b;font-size:14px;vertical-align:top;">Service</td>
          <td style="padding:8px 20px;color:#0f172a;font-size:14px;font-weight:600;vertical-align:top;">${service || 'General Dental Service'}</td>
        </tr>
        <tr>
          <td style="padding:8px 20px 16px;color:#64748b;font-size:14px;vertical-align:top;">Status</td>
          <td style="padding:8px 20px 16px;vertical-align:top;">
            <span style="${statusStyle}">${safeStatus}</span>
          </td>
        </tr>
        ${notes ? `
        <tr>
          <td style="padding:8px 20px 16px;color:#64748b;font-size:14px;vertical-align:top;">Notes</td>
          <td style="padding:8px 20px 16px;color:#0f172a;font-size:14px;font-weight:500;vertical-align:top;">${notes}</td>
        </tr>
        ` : ''}
      </table>

      ${actionBlock}

      <p style="margin:0 0 8px;color:#0f172a;font-size:14px;font-weight:600;">Questions?</p>
      <p style="margin:0 0 24px;color:#64748b;font-size:14px;line-height:1.5;">
        Call us at <a href="tel:${CLINIC.phone.replace(/\D/g, '')}" style="color:#0ea5e9;text-decoration:none;font-weight:600;">${CLINIC.phone}</a> or email <a href="mailto:${CLINIC.email}" style="color:#0ea5e9;text-decoration:none;font-weight:600;">${CLINIC.email}</a>.
      </p>

      <p style="margin:0;color:#64748b;font-size:14px;">Thank you for trusting us with your care.<br><strong style="color:#0f172a;">The ${CLINIC.name} Team</strong></p>
    `;

    const textBody = `APPOINTMENT UPDATE - ${safeStatus}

Hi ${name},

Your appointment status has been updated. Here are the latest details:

CURRENT DETAILS
- Date: ${displayDate}
- Time: ${time}
- Service: ${service || 'General Dental Service'}
- Status: ${safeStatus.toUpperCase()}
${notes ? `- Notes: ${notes}` : ''}

${isCancelled ? 'Your appointment has been cancelled. If you did not request this or would like to reschedule, contact us immediately.' : isConfirmed ? 'Your appointment is confirmed! Please arrive 10 minutes early.' : 'Your appointment status has been changed. If you have questions, please contact us.'}

Questions? Call us at ${CLINIC.phone} or email ${CLINIC.email}.

Thank you for trusting us with your care.
The ${CLINIC.name} Team`;

    return {
      subject,
      text: textWrapper({ body: textBody, footer: 'This is an automated message. Please do not reply directly to this email.' }),
      html: htmlWrapper({ title: subject, preheader, content: htmlContent }),
    };
  },

  // ── 3. Reminder (optional - add to your scheduler) ───────────
  appointmentReminder: ({ name, date, time, service }) => {
    const subject = `Reminder: Your Appointment Tomorrow - Pineda Dental Clinic`;
    const preheader = `Hi ${name}, this is a friendly reminder about your appointment.`;
    const displayDate = formatDate(date);

    const htmlContent = `
      <h2 style="margin:0 0 8px;color:#0f172a;font-size:20px;font-weight:700;">Friendly Reminder</h2>
      <p style="margin:0 0 24px;color:#64748b;font-size:14px;">Hi <strong style="color:#0f172a;">${name}</strong>, this is a friendly reminder that you have an appointment tomorrow.</p>
      
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background:#f8fafc;border-radius:10px;border:1px solid #e2e8f0;margin-bottom:24px;" class="details-table">
        <tr><td colspan="2" style="padding:16px 20px 8px;font-size:12px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.8px;">Tomorrow's Appointment</td></tr>
        <tr>
          <td style="padding:8px 20px;width:35%;color:#64748b;font-size:14px;vertical-align:top;">Date</td>
          <td style="padding:8px 20px;color:#0f172a;font-size:14px;font-weight:600;vertical-align:top;">${displayDate}</td>
        </tr>
        <tr>
          <td style="padding:8px 20px;color:#64748b;font-size:14px;vertical-align:top;">Time</td>
          <td style="padding:8px 20px;color:#0f172a;font-size:14px;font-weight:600;vertical-align:top;">${time}</td>
        </tr>
        <tr>
          <td style="padding:8px 20px 16px;color:#64748b;font-size:14px;vertical-align:top;">Service</td>
          <td style="padding:8px 20px 16px;color:#0f172a;font-size:14px;font-weight:600;vertical-align:top;">${service || 'General Dental Service'}</td>
        </tr>
      </table>

      <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:16px 20px;margin-bottom:24px;">
        <p style="margin:0;color:#1e40af;font-size:13px;line-height:1.5;">
          <strong style="color:#1e3a8a;">Please remember to:</strong><br>
          &bull; Arrive 10 minutes early<br>
          &bull; Bring a valid ID and insurance card<br>
          &bull; Complete any pre-visit forms if requested
        </p>
      </div>

      <p style="margin:0;color:#64748b;font-size:14px;">See you tomorrow!<br><strong style="color:#0f172a;">The ${CLINIC.name} Team</strong></p>
    `;

    const textBody = `FRIENDLY REMINDER - Pineda Dental Clinic

Hi ${name},

This is a friendly reminder that you have an appointment tomorrow.

TOMORROW'S APPOINTMENT
- Date: ${displayDate}
- Time: ${time}
- Service: ${service || 'General Dental Service'}

Please remember to:
- Arrive 10 minutes early
- Bring a valid ID and insurance card
- Complete any pre-visit forms if requested

See you tomorrow!
The ${CLINIC.name} Team`;

    return {
      subject,
      text: textWrapper({ body: textBody, footer: 'This is an automated reminder. Please do not reply directly to this email.' }),
      html: htmlWrapper({ title: subject, preheader, content: htmlContent }),
    };
  },
};

export default emailTemplates;
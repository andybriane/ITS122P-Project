import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../layouts/DashboardLayout';
import DashboardHeader from '../../components/DashboardHeader';
import appointmentService from '../../services/appointmentService';
import { sendEmail } from '../../services/emailService';
import { emailTemplates } from '../../services/emailTemplates';

// ==================== SERVICE DURATIONS ====================
const SERVICE_DURATIONS = {
  'CHECK UP ONLY': 45,
  'CHECK UP WITH CERTIFICATION': 60,
  'ORAL PROPHYLAXIS - Mild': 45,
  'ORAL PROPHYLAXIS - Moderate': 60,
  'ORAL PROPHYLAXIS - Heavy': 90,
  'Composite Restoration': 60,
  'Temporary Filling': 45,
  'Fluoride Application': 20,
  'Pit & Fissure Sealant (PFS)': 30,
  'Teeth Whitening': 75,
  'Laminates (Per Visit)': 120,
  'RCT – Incisors to Cuspids': 90,
  'RCT – Premolars': 120,
  'RCT – Molars': 150,
  'PMMA Crown (Per Visit)': 90,
  'PFM Crown (Per Visit)': 90,
  'Zirconia Crown (Per Visit)': 90,
  'Complete Denture – Plastic (Per Visit)': 75,
  'Complete Denture – Porcelain (Per Visit)': 75,
  'Flexible Complete Denture (Per Visit)': 75,
  'Flexible Partial Denture (Per Visit)': 75,
  'RPD Plastic (Anterior OR Posterior Only)': 75,
  'RPD Plastic (Anterior AND Posterior)': 90,
  'RPD Porcelain (Anterior OR Posterior Only)': 75,
  'RPD Porcelain (Anterior AND Posterior)': 90,
  'RPD Metal Framework': 90,
  'Extraction': 60,
  'Odontectomy (Wisdom Tooth Surgery)': 150,
  'Orthodontic Braces Installation': 120,
};

// ==================== TIME HELPERS ====================
function timeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

function minutesToTime(mins) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function addMinutes(timeStr, minutes) {
  return minutesToTime(timeToMinutes(timeStr) + minutes);
}

function formatTime(timeStr) {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
}

function formatTimeRange(start, end) {
  return `${formatTime(start)} – ${formatTime(end)}`;
}

function patientName(appt) {
  return `${appt.first_name} ${appt.last_name}`.trim();
}

function serviceLabel(appt) {
  if (appt.services && appt.services.length > 0) {
    return appt.services.map((s) => s.name).join(', ');
  }
  return '—';
}

function getAppointmentDuration(appt) {
  if (appt.duration_minutes) return appt.duration_minutes;
  if (appt.services && appt.services.length > 0) {
    return appt.services.reduce((sum, s) => sum + (SERVICE_DURATIONS[s.name] || 60), 0);
  }
  return 60;
}

function formatDateStr(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isSameDay(d1, d2) {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

const VALID_STATUSES = ['Pending', 'Confirmed', 'In Chair', 'Completed', 'Cancelled'];

export default function Calendar() {
  const [appointments, setAppointments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewType, setViewType] = useState('month');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEvent, setSelectedEvent] = useState(null);

  const loadAppointments = useCallback(async () => {
    try {
      const result = await appointmentService.getAll();
      if (result.success) {
        setAppointments(result.data);
      }
    } catch (err) {
      console.error('Could not load appointments:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);

  const handlePrev = () => {
    const d = new Date(currentDate);
    if (viewType === 'month') d.setMonth(d.getMonth() - 1);
    else if (viewType === 'week') d.setDate(d.getDate() - 7);
    else d.setDate(d.getDate() - 1);
    setCurrentDate(d);
  };

  const handleNext = () => {
    const d = new Date(currentDate);
    if (viewType === 'month') d.setMonth(d.getMonth() + 1);
    else if (viewType === 'week') d.setDate(d.getDate() + 7);
    else d.setDate(d.getDate() + 1);
    setCurrentDate(d);
  };

  const handleDateJump = (e) => {
    if (!e.target.value) return;
    const [y, m, d] = e.target.value.split('-');
    setCurrentDate(new Date(y, m - 1, d));
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      const result = await appointmentService.update(id, { status: newStatus });
      if (result.success) {
        setAppointments((prev) => prev.map((a) => (a.id === id ? { ...a, status: newStatus } : a)));
        if (selectedEvent && selectedEvent.id === id) {
          setSelectedEvent((prev) => ({ ...prev, status: newStatus }));
        }

        // ===== EMAIL TRIGGER =====
        const updatedAppt = result.data || appointments.find((a) => a.id === id);
        if (updatedAppt?.email) {
          const { subject, text, html } = emailTemplates.statusUpdate({
            name: patientName(updatedAppt),
            status: newStatus,
            date: updatedAppt.appointment_date,
            time: formatTime(updatedAppt.appointment_time),
            service: serviceLabel(updatedAppt),
          });

          sendEmail({
            to: updatedAppt.email,
            subject,
            text,
            html,
            templateType: 'status-update',
            data: updatedAppt,
          }).catch((err) => {
            console.error('Email failed to send:', err);
          });
        }
        // =========================

      } else {
        alert(result.message || 'Could not update status.');
      }
    } catch (err) {
      alert('Something went wrong updating the status.');
    }
  };

  const handleDeleteAppointment = async () => {
    if (!window.confirm(`⚠️ Delete appointment for ${patientName(selectedEvent)}?`)) return;
    try {
      const result = await appointmentService.remove(selectedEvent.id);
      if (result.success) {
        setAppointments((prev) => prev.filter((a) => a.id !== selectedEvent.id));
        setSelectedEvent(null);
      } else {
        alert(result.message || 'Could not delete appointment.');
      }
    } catch (err) {
      alert('Something went wrong deleting the appointment.');
    }
  };

  const filteredAppointments = appointments.filter((appt) => {
    const name = patientName(appt).toLowerCase();
    const service = serviceLabel(appt).toLowerCase();
    const q = searchQuery.toLowerCase();
    return name.includes(q) || service.includes(q);
  });

  const getGridDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const days = [];

    if (viewType === 'month') {
      const firstDay = new Date(year, month, 1).getDay();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const daysInPrevMonth = new Date(year, month, 0).getDate();

      for (let i = 0; i < firstDay; i++) {
        days.push({ date: new Date(year, month - 1, daysInPrevMonth - firstDay + i + 1), otherMonth: true });
      }
      for (let i = 1; i <= daysInMonth; i++) {
        days.push({ date: new Date(year, month, i), otherMonth: false });
      }
      const remaining = 42 - days.length;
      for (let i = 1; i <= remaining; i++) {
        days.push({ date: new Date(year, month + 1, i), otherMonth: true });
      }
    } else if (viewType === 'week') {
      const diff = currentDate.getDate() - currentDate.getDay();
      const startOfWeek = new Date(currentDate);
      startOfWeek.setDate(diff);
      for (let i = 0; i < 7; i++) {
        const d = new Date(startOfWeek);
        d.setDate(d.getDate() + i);
        days.push({ date: d, otherMonth: d.getMonth() !== month });
      }
    } else {
      days.push({ date: new Date(currentDate), otherMonth: false });
    }

    return days;
  };

  const gridDays = getGridDays();
  const selectedDateStr = formatDateStr(currentDate);
  const selectedDaySchedule = appointments.filter((appt) => appt.appointment_date === selectedDateStr);
  const isViewingToday = isSameDay(currentDate, new Date());

  return (
    <DashboardLayout>
      <DashboardHeader
        title="Calendar"
        subtitle="Manage appointments and schedules"
        search={
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ position: 'absolute', left: '10px', width: '16px', height: '16px', color: 'var(--text-muted)' }}>
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.3-4.3"></path>
            </svg>
            <input
              type="text"
              placeholder="Search appointments..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ padding: 'var(--space-2) var(--space-2) var(--space-2) 32px', borderRadius: 'var(--radius-md)', border: '1px solid var(--dash-border)', background: 'var(--bg-card)', color: 'var(--text-main)' }}
            />
          </div>
        }
      />

      <div className="calendar-controls">
        <div className="calendar-nav" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <button className="btn btn-outline btn-sm" aria-label="Previous" onClick={handlePrev}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <h2 className="calendar-month" style={{ margin: 0 }}>
              {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              {viewType === 'day' && ` ${currentDate.getDate()}`}
            </h2>
          </div>
          <button className="btn btn-outline btn-sm" aria-label="Next" onClick={handleNext}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
              <path d="m9 18 6-6-6-6" />
            </svg>
          </button>
          <input
            type="date"
            className="form-control"
            title="Jump to specific date"
            onChange={handleDateJump}
            style={{ marginLeft: 'var(--space-2)', padding: '4px 8px', borderRadius: 'var(--radius-md)', border: '1px solid var(--dash-border)', background: 'var(--bg-card)', color: 'var(--text-main)', cursor: 'pointer', height: '32px' }}
          />
        </div>
        <div className="calendar-actions">
          <div className="view-toggle">
            <button className={`btn btn-sm ${viewType === 'month' ? 'active' : ''}`} onClick={() => setViewType('month')}>Month</button>
            <button className={`btn btn-sm ${viewType === 'week' ? 'active' : ''}`} onClick={() => setViewType('week')}>Week</button>
            <button className={`btn btn-sm ${viewType === 'day' ? 'active' : ''}`} onClick={() => setViewType('day')}>Day</button>
          </div>
          <Link to="/dashboard/book" className="btn btn-primary">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16" style={{ marginRight: '8px' }}>
              <path d="M12 5v14M5 12h14" />
            </svg>
            New Appointment
          </Link>
        </div>
      </div>

      {isLoading ? (
        <p style={{ padding: 'var(--space-6)', color: 'var(--text-muted)' }}>Loading appointments...</p>
      ) : (
        <div className="calendar-layout">
          <div className="calendar-grid-container">
            {viewType !== 'day' && (
              <div className="calendar-weekdays" style={viewType === 'week' ? { gridTemplateColumns: 'repeat(7, 1fr)' } : {}}>
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                  <div key={d} className="weekday">{d}</div>
                ))}
              </div>
            )}
            <div className="calendar-grid" id="calendarGrid" style={viewType === 'day' ? { gridTemplateColumns: '1fr' } : {}}>
              {gridDays.map((d, idx) => {
                const dayStr = formatDateStr(d.date);
                const dayEvents = filteredAppointments.filter((appt) => appt.appointment_date === dayStr);
                const isSelectedDay = isSameDay(d.date, currentDate);

                return (
                  <div
                    key={idx}
                    className={`calendar-day${d.otherMonth ? ' other-month' : ''}${isSameDay(d.date, new Date()) ? ' today' : ''}${isSelectedDay && !isSameDay(d.date, new Date()) ? ' selected' : ''}`}
                    onClick={() => setCurrentDate(d.date)}
                    style={{ cursor: 'pointer', border: isSelectedDay ? '2px solid var(--color-primary)' : '' }}
                  >
                    <span className="day-number">
                      {viewType === 'day'
                        ? d.date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
                        : d.date.getDate()}
                    </span>
                    {dayEvents.map((evt) => {
                      const duration = getAppointmentDuration(evt);
                      const endTime = addMinutes(evt.appointment_time, duration);
                      return (
                        <div
                          key={evt.id}
                          className="calendar-event"
                          onClick={(e) => { e.stopPropagation(); setSelectedEvent(evt); }}
                          style={{ 
                            padding: '4px 8px', 
                            margin: '4px 0', 
                            cursor: 'pointer', 
                            background: 'var(--color-primary-light)', 
                            color: 'var(--color-primary)', 
                            borderRadius: '4px', 
                            fontSize: '0.75rem', 
                            fontWeight: '600', 
                            overflow: 'hidden', 
                            whiteSpace: 'nowrap', 
                            textOverflow: 'ellipsis',
                            borderLeft: '3px solid var(--color-primary)'
                          }}
                          title={`${patientName(evt)} — ${duration} mins`}
                        >
                          {formatTimeRange(evt.appointment_time, endTime)} — {patientName(evt)}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Sidebar */}
          <div className="today-schedule">
            <div className="schedule-header">
              <h3>{isViewingToday ? "Today's Schedule" : 'Selected Day'}</h3>
              <span className="schedule-date">{currentDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
            </div>
            <div className="schedule-list">
              {selectedDaySchedule.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)', padding: 'var(--space-4)' }}>
                  No appointments scheduled for this date.
                </p>
              ) : (
                selectedDaySchedule.map((item) => {
                  const duration = getAppointmentDuration(item);
                  const endTime = addMinutes(item.appointment_time, duration);
                  return (
                    <div key={item.id} className={`schedule-item${item.status === 'In Chair' ? ' current' : ''}`} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                        <div className="appointment-time" style={{ fontWeight: '600' }}>
                          {formatTimeRange(item.appointment_time, endTime)}
                        </div>
                        <select
                          value={item.status}
                          onChange={(e) => handleStatusChange(item.id, e.target.value)}
                          style={{ fontSize: 'var(--text-xs)', padding: 'var(--space-1)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--dash-border)', background: 'var(--bg-card)', color: 'var(--text-main)', cursor: 'pointer' }}
                        >
                          {VALID_STATUSES.map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </div>
                      <div className="schedule-details">
                        <div className="schedule-patient">{patientName(item)}</div>
                        <div className="schedule-service" style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                          {serviceLabel(item)} — {duration} mins
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Event Details Modal */}
      {selectedEvent && (
        <div className="modal active" id="eventDetailsModal">
          <div className="modal-backdrop" onClick={() => setSelectedEvent(null)}></div>
          <div className="modal-content">
            <div className="modal-header">
              <h3>Appointment Details</h3>
              <button className="btn btn-icon modal-close" aria-label="Close" onClick={() => setSelectedEvent(null)}>&times;</button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4 style={{ fontSize: 'var(--text-lg)', fontWeight: 'bold', margin: 0 }}>{patientName(selectedEvent)}</h4>
                <span className="status-badge" style={{ padding: 'var(--space-1) var(--space-2)', borderRadius: 'var(--radius-sm)', fontSize: 'var(--text-xs)', fontWeight: 'bold', background: 'var(--dash-hover)' }}>
                  {selectedEvent.status}
                </span>
              </div>
              <div className="info-list" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', marginTop: 'var(--space-4)' }}>
                <div className="info-item" style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="info-label" style={{ color: 'var(--text-muted)' }}>Date:</span>
                  <span className="info-value" style={{ fontWeight: 500 }}>
                    {new Date(selectedEvent.appointment_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>
                <div className="info-item" style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="info-label" style={{ color: 'var(--text-muted)' }}>Time:</span>
                  <span className="info-value" style={{ fontWeight: 500 }}>
                    {formatTimeRange(selectedEvent.appointment_time, addMinutes(selectedEvent.appointment_time, getAppointmentDuration(selectedEvent)))}
                  </span>
                </div>
                <div className="info-item" style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="info-label" style={{ color: 'var(--text-muted)' }}>Duration:</span>
                  <span className="info-value" style={{ fontWeight: 500 }}>{getAppointmentDuration(selectedEvent)} minutes</span>
                </div>
                <div className="info-item" style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="info-label" style={{ color: 'var(--text-muted)' }}>Service:</span>
                  <span className="info-value" style={{ fontWeight: 500 }}>{serviceLabel(selectedEvent)}</span>
                </div>
                <div className="info-item" style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="info-label" style={{ color: 'var(--text-muted)' }}>Source:</span>
                  <span className="info-value" style={{ fontWeight: 500 }}>{selectedEvent.source}</span>
                </div>
                <div className="info-item" style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="info-label" style={{ color: 'var(--text-muted)' }}>Status:</span>
                  <select
                    value={selectedEvent.status}
                    onChange={(e) => handleStatusChange(selectedEvent.id, e.target.value)}
                    style={{ fontSize: 'var(--text-sm)', padding: 'var(--space-1)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--dash-border)', background: 'var(--bg-card)', color: 'var(--text-main)' }}
                  >
                    {VALID_STATUSES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                type="button"
                className="btn btn-sm"
                style={{ background: '#ef4444', color: 'white', border: 'none', fontWeight: 'bold' }}
                onClick={handleDeleteAppointment}
              >
                Delete Appointment
              </button>
              <button type="button" className="btn btn-primary" onClick={() => setSelectedEvent(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
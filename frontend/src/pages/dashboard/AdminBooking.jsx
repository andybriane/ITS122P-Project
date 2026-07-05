import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../layouts/DashboardLayout';
import appointmentService from '../../services/appointmentService';
import servicesService from '../../services/servicesService';
import LoadingButton from '../../components/LoadingButton';
import { sendEmail } from '../../services/emailService';
import { emailTemplates } from '../../services/emailTemplates';
import {
  findDuration,
  getAppointmentDuration,
  computeAvailableSlots,
  validateBooking,
  formatTime,
  formatTimeRange,
  formatPeso,
  sanitizeText,
} from '../../services/scheduleUtils';

const doctorOptions = [
  { value: '', label: 'Select a doctor' },
  { value: '2', label: 'Dr. Raymond E. Pineda' },
  { value: '3', label: 'Dr. Sarah Yzabel D. Malit' },
];

export default function AdminBooking() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const [allServices, setAllServices] = useState([]);
  const [groupedServices, setGroupedServices] = useState([]);
  const [isLoadingServices, setIsLoadingServices] = useState(true);

  const [allAppointments, setAllAppointments] = useState([]);
  const [isLoadingAppointments, setIsLoadingAppointments] = useState(false);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    serviceId: '',
    doctor: '',
    date: '',
    time: '',
    notes: '',
  });

  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  useEffect(() => {
    async function loadServices() {
      try {
        const result = await servicesService.getAll();
        if (result.success) {
          setAllServices(result.data);
          const map = new Map();
          for (const s of result.data) {
            const cleanName = sanitizeText(s.name);
            const cleanCategory = sanitizeText(s.category);
            const duration = findDuration(cleanName);
            if (!map.has(cleanCategory)) map.set(cleanCategory, []);
            map.get(cleanCategory).push({ ...s, name: cleanName, category: cleanCategory, duration });
          }
          setGroupedServices(Array.from(map.entries()).map(([title, items]) => ({ title, items })));
        } else {
          alert('Could not load services: ' + result.message);
        }
      } catch (err) {
        alert('Could not reach the server to load services.');
      } finally {
        setIsLoadingServices(false);
      }
    }
    loadServices();
  }, []);

  useEffect(() => {
    async function loadAppointments() {
      setIsLoadingAppointments(true);
      try {
        const result = await appointmentService.getAll();
        if (result.success) setAllAppointments(result.data);
      } catch (err) {
        console.error('Could not load appointments:', err);
      } finally {
        setIsLoadingAppointments(false);
      }
    }
    loadAppointments();
  }, []);

  const getServiceDuration = () => {
    const service = allServices.find(s => s.id === parseInt(formData.serviceId));
    return service ? findDuration(service.name) : 0;
  };

  const getEndTime = () => {
    const duration = getServiceDuration();
    if (!formData.time || duration <= 0) return '';
    const [h, m] = formData.time.split(':').map(Number);
    const totalMins = h * 60 + m + duration;
    const endH = Math.floor(totalMins / 60);
    const endM = totalMins % 60;
    return formatTime(`${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`);
  };

  const timeSlots = computeAvailableSlots(formData.date, getServiceDuration(), allAppointments);
  const hasAvailableSlots = timeSlots.some(s => !s.isOccupied);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.serviceId) {
      alert('Please select a service.');
      return;
    }

    const duration = getServiceDuration();
    if (duration <= 0) {
      alert('Could not determine service duration. Please re-select the service.');
      return;
    }

    const validation = validateBooking(formData.date, formData.time, duration, allAppointments);
    if (!validation.isValid) {
      alert(validation.errors.join('\n'));
      return;
    }

    const freshResult = await appointmentService.getAll();
    if (freshResult.success) {
      const freshValidation = validateBooking(formData.date, formData.time, duration, freshResult.data);
      if (!freshValidation.isValid) {
        alert(freshValidation.errors.join('\n'));
        return;
      }
    }

    setLoading(true);

    try {
      const payload = {
        first_name: formData.firstName,
        last_name: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        doctor_id: formData.doctor ? parseInt(formData.doctor, 10) : null,
        date: formData.date,
        time: formData.time,
        duration_minutes: duration,
        service_ids: [parseInt(formData.serviceId, 10)],
        notes: formData.notes || '',
      };

      const result = await appointmentService.create(payload);

      if (result.success) {
        const updated = await appointmentService.getAll();
        if (updated.success) setAllAppointments(updated.data);

        const serviceName = allServices.find(s => s.id === parseInt(formData.serviceId))?.name || 'Dental Service';
        const doctorLabel = doctorOptions.find(o => o.value === formData.doctor)?.label || 'No preference';

        // ===== EMAIL TRIGGER: Booking Confirmation (Admin-created) =====
        const { subject, text, html } = emailTemplates.bookingConfirmation({
          name: `${formData.firstName} ${formData.lastName}`.trim(),
          date: formData.date,
          time: formatTime(formData.time),
          service: serviceName,
        });

        sendEmail({
          to: formData.email,
          subject,
          text,
          html,
          templateType: 'booking-confirmation',
          data: {
            firstName: formData.firstName,
            lastName: formData.lastName,
            date: formData.date,
            time: formData.time,
            service: serviceName,
            doctor: doctorLabel,
            duration,
          },
        }).catch((err) => {
          console.error('Admin booking confirmation email failed:', err);
        });
        // ===============================================================

 

        alert('Appointment scheduled successfully!');
        navigate('/dashboard/calendar');
      } else {
        alert(result.message || 'Could not schedule appointment. Please try again.');
      }
    } catch (err) {
      alert('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: '100%',
    padding: 'var(--space-3)',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--dash-border)',
    background: 'var(--bg-card)',
    color: 'var(--text-main)',
  };

  const labelStyle = {
    display: 'block',
    marginBottom: 'var(--space-2)',
  };

  return (
    <DashboardLayout>
      <header className="dashboard-header">
        <div className="header-left">
          <h1>New Appointment</h1>
          <p className="header-subtitle">Schedule a patient appointment</p>
        </div>
      </header>

      <div style={{ maxWidth: '700px', margin: '0 auto', marginTop: 'var(--space-4)', padding: '12px 16px', background: '#fef3c7', border: '1px solid #f59e0b', borderRadius: '8px', color: '#92400e', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
        </svg>
        <span><strong>Single Chair Policy:</strong> This clinic has 1 operating chair. If either doctor is booked, the time slot is unavailable for both.</span>
      </div>

      <div className="dashboard-panel" style={{ padding: 'var(--space-6)', maxWidth: '700px', margin: '0 auto', marginTop: 'var(--space-4)' }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
            <div className="form-group">
              <label className="info-label" style={labelStyle}>First Name</label>
              <input type="text" required placeholder="Juan" className="form-control" style={inputStyle}
                value={formData.firstName} onChange={(e) => updateField('firstName', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="info-label" style={labelStyle}>Last Name</label>
              <input type="text" required placeholder="Dela Cruz" className="form-control" style={inputStyle}
                value={formData.lastName} onChange={(e) => updateField('lastName', e.target.value)} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
            <div className="form-group">
              <label className="info-label" style={labelStyle}>Email</label>
              <input type="email" required placeholder="juan@email.com" className="form-control" style={inputStyle}
                value={formData.email} onChange={(e) => updateField('email', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="info-label" style={labelStyle}>Phone</label>
              <input type="tel" required placeholder="09XX XXX XXXX" className="form-control" style={inputStyle}
                value={formData.phone} onChange={(e) => updateField('phone', e.target.value)} />
            </div>
          </div>

          <div className="form-group">
            <label className="info-label" style={labelStyle}>Service</label>
            <select required className="form-control" style={inputStyle}
              value={formData.serviceId} onChange={(e) => updateField('serviceId', e.target.value)}
              disabled={isLoadingServices}>
              <option value="">{isLoadingServices ? 'Loading services...' : 'Select a service'}</option>
              {groupedServices.map((category) => (
                <optgroup key={category.title} label={category.title}>
                  {category.items.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({formatPeso(s.price)}) — {s.duration} mins
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="info-label" style={labelStyle}>Doctor</label>
            <select className="form-control" style={inputStyle}
              value={formData.doctor} onChange={(e) => updateField('doctor', e.target.value)}>
              {doctorOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
            <div className="form-group">
              <label className="info-label" style={labelStyle}>Date</label>
              <input type="date" required className="form-control" style={inputStyle}
                value={formData.date} onChange={(e) => updateField('date', e.target.value)} />
              {formData.date && new Date(formData.date).getDay() === 0 && (
                <p style={{ color: '#b91c1c', fontSize: '0.8rem', marginTop: '4px' }}>⚠️ Closed on Sundays</p>
              )}
            </div>
            <div className="form-group">
              <label className="info-label" style={labelStyle}>Time</label>
              <select required className="form-control" style={inputStyle}
                value={formData.time} onChange={(e) => updateField('time', e.target.value)}
                disabled={!formData.serviceId || isLoadingAppointments}>
                <option value="">
                  {!formData.serviceId ? 'Select service first' : isLoadingAppointments ? 'Loading...' : 'Select time'}
                </option>
                {timeSlots.map((slot) => (
                  <option key={slot.start} value={slot.start} disabled={slot.isOccupied}
                    style={slot.isOccupied ? { color: '#9ca3af', background: '#f3f4f6' } : {}}>
                    {slot.label} {slot.isOccupied 
                      ? `(Chair occupied by ${slot.occupiedInfo?.doctor} until ${formatTime(slot.occupiedInfo?.until)})` 
                      : ''}
                  </option>
                ))}
              </select>
              {formData.time && formData.serviceId && (
                <p style={{ fontSize: '0.8rem', color: '#666', marginTop: '4px' }}>
                  Ends at {getEndTime()} ({getServiceDuration()} mins)
                </p>
              )}
            </div>
          </div>

          <div className="form-group">
            <label className="info-label" style={labelStyle}>Notes (Optional)</label>
            <textarea rows="3" placeholder="Any additional notes..." className="form-control"
              style={{ ...inputStyle, resize: 'vertical' }}
              value={formData.notes} onChange={(e) => updateField('notes', e.target.value)} />
          </div>

          <LoadingButton
            type="submit"
            variant="primary"
            loading={loading}
            loadingText="Saving..."
            style={{ marginTop: 'var(--space-4)', padding: 'var(--space-3)', fontWeight: 'bold', display: 'flex', justifyContent: 'center' }}
          >
            Save Appointment
          </LoadingButton>
        </form>
      </div>
    </DashboardLayout>
  );
}
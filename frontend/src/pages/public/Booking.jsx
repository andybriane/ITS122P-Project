import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import PublicLayout from '../../layouts/PublicLayout';
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
  formatDate,
  formatPeso,
  sanitizeText,
  minutesToTime,
} from '../../services/scheduleUtils';
import '../../assets/css/pages/booking.css';

const doctorOptions = [
  { value: '', label: 'No preference' },
  { value: '2', label: 'Dr. Raymond E. Pineda' },
  { value: '3', label: 'Dr. Sarah Yzabel D. Malit' },
];

export default function Booking() {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showProgress, setShowProgress] = useState(true);

  const [pricingData, setPricingData] = useState([]);
  const [rawServices, setRawServices] = useState([]);
  const [isLoadingServices, setIsLoadingServices] = useState(true);
  const [servicesError, setServicesError] = useState(null);

  const [allAppointments, setAllAppointments] = useState([]);
  const [isLoadingAppointments, setIsLoadingAppointments] = useState(false);

  const [formData, setFormData] = useState(() => {
    const today = new Date().toISOString().split('T')[0];
    return {
      service: '',
      doctor: '',
      date: today,
      time: '',
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      notes: '',
    };
  });

  const dateInputRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    async function loadServices() {
      try {
        const result = await servicesService.getAll();
        if (cancelled) return;
        if (result.success) {
          setRawServices(result.data);
          const map = new Map();
          for (const s of result.data) {
            const cleanName = sanitizeText(s.name);
            const cleanCategory = sanitizeText(s.category);
            const duration = findDuration(cleanName);
            if (!map.has(cleanCategory)) map.set(cleanCategory, []);
            map.get(cleanCategory).push({
              id: s.id,
              name: cleanName,
              price: formatPeso(s.price),
              duration,
            });
          }
          setPricingData(Array.from(map.entries()).map(([title, items]) => ({ title, items })));
        } else {
          setServicesError(result.message || 'Could not load services.');
        }
      } catch (err) {
        if (!cancelled) setServicesError('Could not reach the server. Please try again later.');
      } finally {
        if (!cancelled) setIsLoadingServices(false);
      }
    }
    loadServices();
    return () => { cancelled = true; };
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

  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const getDoctorLabel = () => {
    if (!formData.doctor) return 'No preference';
    const opt = doctorOptions.find((o) => o.value === formData.doctor);
    return opt ? opt.label : 'No preference';
  };

  const getServiceDuration = () => {
    if (!formData.service) return 0;
    const match = formData.service.match(/-\s(.+?)\s\(/);
    const name = match ? match[1].trim() : '';
    return findDuration(name);
  };

  const getEndTime = () => {
    const duration = getServiceDuration();
    if (!formData.time || duration <= 0) return '';
    const [h, m] = formData.time.split(':').map(Number);
    const totalMins = h * 60 + m + duration;
    return minutesToTime(totalMins);
  };

  const timeSlots = computeAvailableSlots(formData.date, getServiceDuration(), allAppointments);
  const hasAvailableSlots = timeSlots.some(s => !s.isOccupied);

  const validateStep1 = () => {
    if (!formData.service) { alert('Please select a service.'); return false; }
    if (!formData.date) { alert('Please select a date.'); return false; }
    if (!formData.time) { alert('Please select a time.'); return false; }

    const duration = getServiceDuration();
    const validation = validateBooking(formData.date, formData.time, duration, allAppointments);
    if (!validation.isValid) {
      alert(validation.errors.join('\n'));
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!formData.firstName) { alert('Please enter your first name.'); return false; }
    if (!formData.lastName) { alert('Please enter your last name.'); return false; }
    if (!formData.email) { alert('Please enter your email.'); return false; }
    if (!formData.phone) { alert('Please enter your phone number.'); return false; }
    return true;
  };

  const goToStep = (targetStep) => {
    if (targetStep === 2 && !validateStep1()) return;
    if (targetStep === 3 && !validateStep2()) return;
    setStep(targetStep);
  };

  const handleConfirmBooking = async (e) => {
    if (e) e.preventDefault();
    setIsSubmitting(true);

    try {
      const matchedService = rawServices.find((s) => {
        const cleanName = sanitizeText(s.name);
        const cleanCategory = sanitizeText(s.category);
        const label = `${cleanCategory} - ${cleanName} (${formatPeso(s.price)})`;
        return label === formData.service;
      });

      if (!matchedService) {
        alert('Selected service could not be matched. Please re-select.');
        setIsSubmitting(false);
        return;
      }

      const duration = findDuration(matchedService.name);

      const freshResult = await appointmentService.getAll();
      if (freshResult.success) {
        const validation = validateBooking(formData.date, formData.time, duration, freshResult.data);
        if (!validation.isValid) {
          alert(validation.errors.join('\n'));
          setIsSubmitting(false);
          return;
        }
      }

      const payload = {
        first_name: formData.firstName,
        last_name: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        doctor_id: formData.doctor ? parseInt(formData.doctor, 10) : null,
        date: formData.date,
        time: formData.time,
        duration_minutes: duration,
        service_ids: [matchedService.id],
        notes: formData.notes || '',
      };

      const result = await appointmentService.create(payload);

      if (result.success) {
        const updated = await appointmentService.getAll();
        if (updated.success) setAllAppointments(updated.data);

        // ===== EMAIL TRIGGER: Booking Confirmation =====
        const { subject, text, html } = emailTemplates.bookingConfirmation({
          name: `${formData.firstName} ${formData.lastName}`.trim(),
          date: formData.date,
          time: formatTime(formData.time),
          service: matchedService.name,
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
            service: matchedService.name,
            doctor: getDoctorLabel(),
            duration,
          },
        }).catch((err) => {
          console.error('Booking confirmation email failed:', err);
        });
        // ================================================

 
        setShowSuccess(true);
        setShowProgress(false);
      } else {
        alert(result.message || 'Could not book appointment. Please try again.');
      }
    } catch (error) {
      alert('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await handleConfirmBooking(e);
  };

  const getProgressStepClass = (stepNum) => {
    if (stepNum < step) return 'progress-step completed';
    if (stepNum === step) return 'progress-step active';
    return 'progress-step';
  };

  const getLineClass = (lineIndex) => {
    return 'progress-line' + (lineIndex < step - 1 ? ' completed' : '');
  };

  return (
    <PublicLayout>
      <section className="booking-section">
        <div className="container">
          <div className="booking-card">
            {showProgress && (
              <div className="booking-progress" id="bookingProgress">
                <div className={getProgressStepClass(1)}>
                  <div className="step-circle">1</div>
                  <span className="step-label">Schedule</span>
                </div>
                <div className={getLineClass(0)}></div>
                <div className={getProgressStepClass(2)}>
                  <div className="step-circle">2</div>
                  <span className="step-label">Details</span>
                </div>
                <div className={getLineClass(1)}></div>
                <div className={getProgressStepClass(3)}>
                  <div className="step-circle">3</div>
                  <span className="step-label">Confirm</span>
                </div>
              </div>
            )}

            {!showSuccess && (
              <>
                <h1 className="booking-title">Book Your Appointment</h1>
                <p className="booking-subtitle">Schedule your visit at <strong>Pineda Dental Clinic</strong></p>
              </>
            )}

            <form className="booking-form" onSubmit={handleSubmit}>
              <div className={step === 1 && !showSuccess ? 'form-step active' : 'form-step'} id="step1">
                <div className="form-group">
                  <label htmlFor="service">Select Service</label>
                  <select id="service" required value={formData.service} onChange={(e) => updateField('service', e.target.value)} disabled={isLoadingServices}>
                    <option value="">{isLoadingServices ? '-- Loading services... --' : '-- Choose a service --'}</option>
                    {pricingData.map((category) => (
                      <optgroup key={category.title} label={category.title}>
                        {category.items.map(service => (
                          <option key={service.id} value={`${category.title} - ${service.name} (${service.price})`}>
                            {service.name} — {service.price} ({service.duration} mins)
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                  {servicesError && <p style={{ color: '#b91c1c', fontSize: '0.875rem', marginTop: '4px' }}>{servicesError}</p>}
                </div>

                <div className="form-group">
                  <label htmlFor="doctor">Preferred Doctor (Optional)</label>
                  <select id="doctor" value={formData.doctor} onChange={(e) => updateField('doctor', e.target.value)}>
                    {doctorOptions.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                  </select>
                  <p style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '6px', display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, marginTop: '2px' }}>
                      <circle cx="12" cy="12" r="10"></circle>
                      <path d="M12 16v-4M12 8h.01"></path>
                    </svg>
                    <span>Our clinic operates with 1 chair. If either doctor is booked, the time slot is unavailable.</span>
                  </p>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="date">Preferred Date</label>
                    <input type="date" id="date" required ref={dateInputRef} value={formData.date} onChange={(e) => updateField('date', e.target.value)} />
                    {formData.date && new Date(formData.date).getDay() === 0 && (
                      <p style={{ color: '#b91c1c', fontSize: '0.8rem', marginTop: '4px' }}>⚠️ Closed on Sundays</p>
                    )}
                  </div>
                </div>

                <div className="form-group" style={{ marginTop: '16px' }}>
                  <label style={{ display: 'block', marginBottom: '10px', fontWeight: '600' }}>
                    Preferred Time
                    {formData.service && <span style={{ color: '#666', fontWeight: '400', fontSize: '0.9rem', marginLeft: '8px' }}>(Duration: {getServiceDuration()} mins)</span>}
                  </label>
                  
                  {!formData.service && (
                    <div style={{ padding: '20px', background: '#f9fafb', border: '1px dashed #d1d5db', borderRadius: '8px', textAlign: 'center', color: '#6b7280' }}>
                      Please select a service first to see available time slots.
                    </div>
                  )}

                  {formData.service && isLoadingAppointments && <p style={{ color: '#888', fontStyle: 'italic' }}>Loading schedule...</p>}

                  {formData.service && !isLoadingAppointments && (
                    <>
                      {!hasAvailableSlots ? (
                        <div style={{ padding: '24px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#b91c1c', textAlign: 'center' }}>
                          <p style={{ margin: 0, fontWeight: '600', fontSize: '1rem' }}>No available slots for this date</p>
                          <p style={{ margin: '8px 0 0 0', fontSize: '0.875rem' }}>
                            All time blocks are occupied or remaining hours are insufficient for this {getServiceDuration()}-minute service.
                          </p>
                        </div>
                      ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '10px', maxHeight: '360px', overflowY: 'auto', padding: '4px' }}>
                          {timeSlots.map((slot) => (
                            <button
                              key={slot.start}
                              type="button"
                              onClick={() => !slot.isOccupied && updateField('time', slot.start)}
                              disabled={slot.isOccupied}
                              style={{
                                padding: '14px 10px',
                                borderRadius: '10px',
                                border: formData.time === slot.start ? '2px solid #2563eb' : '1px solid #e5e7eb',
                                background: slot.isOccupied ? '#f3f4f6' : formData.time === slot.start ? '#eff6ff' : '#ffffff',
                                color: slot.isOccupied ? '#9ca3af' : '#1f2937',
                                cursor: slot.isOccupied ? 'not-allowed' : 'pointer',
                                fontSize: '0.875rem',
                                fontWeight: formData.time === slot.start ? '600' : '400',
                                position: 'relative',
                                transition: 'all 0.15s ease',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: '4px',
                                opacity: slot.isOccupied ? 0.5 : 1,
                              }}
                              title={slot.isOccupied ? `Occupied by ${slot.occupiedInfo?.patient || 'another patient'}` : 'Click to select'}
                            >
                              <span style={{ fontWeight: '600', fontSize: '0.95rem' }}>{slot.label}</span>
                              {slot.isOccupied && (
                                <span style={{ fontSize: '0.75rem', color: '#ef4444', fontWeight: '500' }}>
                                  Chair occupied until {formatTime(slot.occupiedInfo?.until)}
                                </span>
                              )}
                              {!slot.isOccupied && formData.time === slot.start && (
                                <span style={{ position: 'absolute', top: '-6px', right: '-6px', background: '#2563eb', color: 'white', borderRadius: '50%', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem' }}>✓</span>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>

                <LoadingButton type="button" variant="primary" className="btn-full" loading={isLoadingServices || isLoadingAppointments} loadingText="Loading..." onClick={() => goToStep(2)} style={{ marginTop: '24px' }}>
                  Continue to Details
                </LoadingButton>
              </div>

              <div className={step === 2 ? 'form-step active' : 'form-step'} id="step2">
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="firstName">First Name</label>
                    <input type="text" id="firstName" required placeholder="Enter first name" value={formData.firstName} onChange={(e) => updateField('firstName', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label htmlFor="lastName">Last Name</label>
                    <input type="text" id="lastName" required placeholder="Enter last name" value={formData.lastName} onChange={(e) => updateField('lastName', e.target.value)} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="email">Email Address</label>
                    <input type="email" id="email" required placeholder="Enter email" value={formData.email} onChange={(e) => updateField('email', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label htmlFor="phone">Phone Number</label>
                    <input type="tel" id="phone" required placeholder="Enter phone number" value={formData.phone} onChange={(e) => updateField('phone', e.target.value)} />
                  </div>
                </div>
                <div className="form-group">
                  <label htmlFor="notes">Additional Notes (Optional)</label>
                  <textarea id="notes" rows="3" placeholder="Any specific concerns..." value={formData.notes} onChange={(e) => updateField('notes', e.target.value)}></textarea>
                </div>
                <div className="form-actions">
                  <LoadingButton type="button" variant="outline" onClick={() => setStep(1)}>Back</LoadingButton>
                  <LoadingButton type="button" variant="primary" onClick={() => goToStep(3)}>Review Booking</LoadingButton>
                </div>
              </div>

              <div className={step === 3 ? 'form-step active' : 'form-step'} id="step3">
                <div className="booking-summary">
                  <h3>Booking Summary</h3>
                  <div className="summary-item">
                    <span className="summary-label">Service:</span>
                    <span className="summary-value" style={{ fontWeight: '600' }}>{formData.service || '-'}</span>
                  </div>
                  <div className="summary-item">
                    <span className="summary-label">Duration:</span>
                    <span className="summary-value">{getServiceDuration()} minutes</span>
                  </div>
                  <div className="summary-item">
                    <span className="summary-label">Doctor:</span>
                    <span className="summary-value">{getDoctorLabel()}</span>
                  </div>
                  <div className="summary-item">
                    <span className="summary-label">Date & Time:</span>
                    <span className="summary-value">
                      {formatDate(formData.date)}<br />
                      {formatTimeRange(formData.time, getEndTime())}
                    </span>
                  </div>
                  <div className="summary-item">
                    <span className="summary-label">Patient:</span>
                    <span className="summary-value">{`${formData.firstName} ${formData.lastName}`.trim() || '-'}</span>
                  </div>
                  <div className="summary-item">
                    <span className="summary-label">Contact:</span>
                    <span className="summary-value">{`${formData.email}${formData.phone ? ' / ' + formData.phone : ''}` || '-'}</span>
                  </div>
                </div>
                <div className="form-actions">
                  <LoadingButton type="button" variant="outline" onClick={() => setStep(2)}>Back</LoadingButton>
                  <LoadingButton type="submit" variant="primary" loading={isSubmitting} loadingText="Confirming..." onClick={handleConfirmBooking}>
                    Confirm Booking
                  </LoadingButton>
                </div>
                <div className="security-footer">
                  <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                  </svg>
                  <span>Your information is securely processed by Pineda Dental Clinic</span>
                </div>
              </div>

              {showSuccess && (
                <div className="form-step active" id="stepSuccess">
                  <div className="booking-success">
                    <div className="booking-success-icon">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </div>
                    <h2>Booking Confirmed!</h2>
                    <p>Your appointment request has been securely recorded. We will contact you shortly.</p>
                    <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '12px', padding: '20px', margin: '20px auto', textAlign: 'left', maxWidth: '320px' }}>
                      <div style={{ marginBottom: '8px' }}>
                        <span style={{ color: '#6b7280', fontSize: '0.8rem' }}>Service</span>
                        <div style={{ fontWeight: '600', color: '#111827' }}>{sanitizeText(formData.service).split(' - ')[1]?.split(' (')[0] || 'Dental Service'}</div>
                      </div>
                      <div style={{ marginBottom: '8px' }}>
                        <span style={{ color: '#6b7280', fontSize: '0.8rem' }}>Duration</span>
                        <div style={{ fontWeight: '600', color: '#111827' }}>{getServiceDuration()} minutes</div>
                      </div>
                      <div style={{ marginBottom: '8px' }}>
                        <span style={{ color: '#6b7280', fontSize: '0.8rem' }}>Start</span>
                        <div style={{ fontWeight: '600', color: '#111827' }}>{formatTime(formData.time)}</div>
                      </div>
                      <div>
                        <span style={{ color: '#6b7280', fontSize: '0.8rem' }}>End</span>
                        <div style={{ fontWeight: '600', color: '#111827' }}>{formatTime(getEndTime())}</div>
                      </div>
                    </div>
                    <Link to="/" className="btn btn-primary" style={{ marginTop: '8px' }}>Return to Home</Link>
                  </div>
                </div>
              )}
            </form>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
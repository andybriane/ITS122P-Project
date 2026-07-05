// ============================================
// SCHEDULE UTILITIES — Single Source of Truth
// ============================================

export const SERVICE_DURATIONS = {
 'Dental Check-up': 40,
 'Dental Check-up + Certification': 40,
 'Oral Prophylaxis Mild': 45,
 'Oral Prophylaxis Moderate': 60,
 'Oral Prophylaxis Heavy': 90,
 'Composite Restoration': 60,
 'Temporary Filling': 40,
 'Fluoride': 20,
 'Pit and Fissure Sealant': 30,
 'Whitening': 90,
 'Dental Laminates': 90,
 'RCT Incisor/Cuspid': 90,
 'RCT Premolar': 120,
 'RCT Molar': 150,
 'PMMA Crown': 75,
 'PFM Crown': 75,
 'Zirconia Crown': 75,
 'Complete Denture': 75,
 'Flexible Denture': 75,
 'Flexible Partial Denture': 75,
 'RPD Plastic Ant/Post': 75,
 'RPD Plastic Full': 90,
 'RPD Porcelain Ant/Post': 75,
 'RPD Porcelain Full': 90,
 'Metal Framework RPD': 90,
 'Extraction': 60,
 'Odontectomy': 150,
 'Braces Installation': 120,
};

export function timeToMinutes(timeStr) {
 if (!timeStr) return 0;
 const [h, m] = timeStr.split(':').map(Number);
 return h * 60 + m;
}

export function minutesToTime(mins) {
 const h = Math.floor(mins / 60);
 const m = mins % 60;
 return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function addMinutes(timeStr, minutes) {
 return minutesToTime(timeToMinutes(timeStr) + minutes);
}

export function formatTime(timeStr) {
 if (!timeStr) return '';
 const [h, m] = timeStr.split(':').map(Number);
 const ampm = h >= 12 ? 'PM' : 'AM';
 const h12 = h % 12 || 12;
 return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
}

export function formatTimeRange(start, end) {
 return `${formatTime(start)} – ${formatTime(end)}`;
}

export function formatDate(dateStr) {
 const d = new Date(dateStr + 'T00:00:00');
 if (isNaN(d)) return dateStr;
 return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

export function formatPeso(price) {
 const num = Number(price);
 return `₱${num.toLocaleString('en-PH', { maximumFractionDigits: 0 })}`;
}

export function findDuration(apiName) {
 if (!apiName) return 60;
 if (SERVICE_DURATIONS[apiName] !== undefined) return SERVICE_DURATIONS[apiName];
 
 const normalized = apiName.toLowerCase().replace(/\s+/g, ' ').trim();
 for (const [key, duration] of Object.entries(SERVICE_DURATIONS)) {
   if (key.toLowerCase().replace(/\s+/g, ' ').trim() === normalized) return duration;
 }
 
 for (const [key, duration] of Object.entries(SERVICE_DURATIONS)) {
   const keyLower = key.toLowerCase();
   const nameLower = normalized;
   if (keyLower.includes(nameLower) || nameLower.includes(keyLower)) return duration;
 }
 
 console.warn(`[scheduleUtils] No duration found for: "${apiName}". Defaulting to 60.`);
 return 60;
}

export function getAppointmentDuration(appt) {
 if (appt.duration_minutes) return appt.duration_minutes;
 if (appt.services && appt.services.length > 0) {
   return appt.services.reduce((sum, s) => sum + findDuration(s.name), 0);
 }
 if (appt.service_name) return findDuration(appt.service_name);
 return 60;
}

// ============================================
// CLINIC HOURS: 9:00 AM – 4:00 PM
// ============================================

const CLINIC_OPEN_MINUTES = 540;   // 9:00 AM
const CLINIC_CLOSE_MINUTES = 960;  // 4:00 PM

export function generateTimeSlots() {
 const slots = [];
 for (let mins = CLINIC_OPEN_MINUTES; mins < CLINIC_CLOSE_MINUTES; mins += 15) {
   slots.push(minutesToTime(mins));
 }
 return slots;
}

export function hasTimeConflict(startTime, duration, existingAppointments) {
 const start = timeToMinutes(startTime);
 const end = start + duration;
 for (const appt of existingAppointments) {
   const apptStart = timeToMinutes(appt.appointment_time || appt.start_time);
   const apptDuration = getAppointmentDuration(appt);
   const apptEnd = apptStart + apptDuration;
   if (start < apptEnd && end > apptStart) return true;
 }
 return false;
}

export function getOccupiedInfo(startTime, existingAppointments) {
 const start = timeToMinutes(startTime);
 let latestEnd = 0;
 let occupyingDoctor = null;
 let patientName = null;
 
 for (const appt of existingAppointments) {
   const apptStart = timeToMinutes(appt.appointment_time || appt.start_time);
   const apptDuration = getAppointmentDuration(appt);
   const apptEnd = apptStart + apptDuration;
   if (start >= apptStart && start < apptEnd) {
     if (apptEnd > latestEnd) {
       latestEnd = apptEnd;
       occupyingDoctor = appt.doctor_name || 
         (appt.doctor_id === 2 ? 'Dr. Pineda' : appt.doctor_id === 3 ? 'Dr. Malit' : 'Another doctor');
       patientName = `${appt.first_name || ''} ${appt.last_name || ''}`.trim();
     }
   }
 }
 
 return latestEnd > 0 ? { until: minutesToTime(latestEnd), doctor: occupyingDoctor, patient: patientName } : null;
}

export function computeAvailableSlots(dateStr, duration, allAppointments, clinicOpen = '09:00', clinicClose = '16:00') {
 const dateAppointments = allAppointments.filter(appt => (appt.appointment_date || appt.date) === dateStr);
 const openMins = timeToMinutes(clinicOpen);
 const closeMins = timeToMinutes(clinicClose);
 const slots = [];
 
 // Enforce clinic hours: 9:00 AM – 4:00 PM
 const effectiveOpen = Math.max(openMins, CLINIC_OPEN_MINUTES);
 const effectiveClose = Math.min(closeMins, CLINIC_CLOSE_MINUTES);
 
 for (let mins = effectiveOpen; mins < effectiveClose; mins += 15) {
   const start = minutesToTime(mins);
   const end = mins + duration;
   if (end > effectiveClose) continue;
   
   const isOccupied = hasTimeConflict(start, duration, dateAppointments);
   const occupiedInfo = isOccupied ? getOccupiedInfo(start, dateAppointments) : null;
   
   slots.push({ start, end: minutesToTime(end), label: formatTimeRange(start, minutesToTime(end)), isOccupied, occupiedInfo });
 }
 
 return slots;
}

export function validateBooking(dateStr, startTime, duration, existingAppointments) {
 const errors = [];
 const dayOfWeek = new Date(dateStr).getDay();
 if (dayOfWeek === 0) errors.push('Clinic is closed on Sundays.');
 
 const startMins = timeToMinutes(startTime);
 const endMins = startMins + duration;
 
 // Must start at or after 9:00 AM
 if (startMins < CLINIC_OPEN_MINUTES) {
   errors.push('Appointments cannot start before 9:00 AM.');
 }
 
 // Must end at or before 4:00 PM
 if (endMins > CLINIC_CLOSE_MINUTES) {
   errors.push(`Appointment ends at ${minutesToTime(endMins)}, which is after closing time (4:00 PM).`);
 }
 
 const dateAppointments = existingAppointments.filter(appt => (appt.appointment_date || appt.date) === dateStr);
 if (hasTimeConflict(startTime, duration, dateAppointments)) {
   errors.push('This time slot overlaps with an existing appointment. The chair is occupied.');
 }
 
 return { isValid: errors.length === 0, errors };
}

export function sanitizeText(text) {
 if (!text) return '';
 return text
   .replace(/â[€‚]?[,,]?\s*±/g, '₱')
   .replace(/â‚±/g, '₱')
   .replace(/Â±/g, '±');
}

export function formatDateStr(d) {
 const year = d.getFullYear();
 const month = String(d.getMonth() + 1).padStart(2, '0');
 const day = String(d.getDate()).padStart(2, '0');
 return `${year}-${month}-${day}`;
}
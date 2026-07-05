import { useState } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../layouts/DashboardLayout';
import DashboardHeader from '../../components/DashboardHeader';
import { useClinic } from '../../context/ClinicContext';

const badgeClass = (type) => {
  switch (type) {
    case 'blue': return 'badge badge-blue';
    case 'amber': return 'badge badge-amber';
    case 'green': return 'badge badge-green';
    case 'gray': return 'badge badge-gray';
    case 'Pending': return 'badge badge-gray';
    case 'Confirmed': return 'badge badge-blue';
    case 'In Chair': return 'badge badge-amber';
    case 'Completed': return 'badge badge-green';
    case 'Cancelled': return 'badge badge-red';
    default: return 'badge badge-blue';
  }
};

export default function Overview() {
  const { appointments, patients } = useClinic();
  
  // 1. STATE: Track the currently selected date (defaults to Today)
  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState(null);

  // 2. FILTER: Only show appointments for the selected date
  const filteredAppointments = appointments.filter(a => a.date === selectedDate);
  
  // 3. AUTO-SELECT: Safely grab the clicked appointment, or default to the first one in the filtered list
  const selectedAppointment = filteredAppointments.find(a => a.id === selectedAppointmentId) || filteredAppointments[0] || null;

  const selectedPatientData = selectedAppointment 
    ? patients.find(p => p.name === selectedAppointment.patientName) || { age: 'N/A', notes: '' } 
    : null;

  return (
    <DashboardLayout>
      <DashboardHeader 
        title="Dashboard Overview" 
        subtitle="Welcome back"
        action={
          <Link to="/dashboard/book" className="btn btn-primary">
            <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '8px' }}>
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            New Appointment
          </Link>
        }
      />

      {/* Stats - Scrubbed of fake data */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon blue">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
          </div>
          <div className="stat-content">
            <span className="stat-value">{filteredAppointments.length}</span>
            <span className="stat-label">Appointments</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon amber">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
            </svg>
          </div>
          <div className="stat-content">
            <span className="stat-value">0</span>
            <span className="stat-label">Pending Lab Results</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="1" x2="12" y2="23"></line>
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
            </svg>
          </div>
          <div className="stat-content">
            <span className="stat-value">₱0</span>
            <span className="stat-label">Daily Revenue</span>
          </div>
        </div>
      </div>

      {/* Content Grid */}
      <div className="dashboard-content-grid">
        {/* Schedule Panel */}
        <div className="dashboard-panel">
          <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <h2 style={{ margin: 0 }}>Schedule</h2>
              {/* THE NEW DATE FILTER */}
              <input 
                type="date" 
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  setSelectedAppointmentId(null); // Reset selection when changing days
                }}
                className="form-control"
                style={{ 
                  padding: 'var(--space-2) var(--space-3)', 
                  borderRadius: 'var(--radius-md)', 
                  border: '1px solid var(--dash-border)', 
                  background: 'var(--bg-card)', 
                  color: 'var(--text-main)',
                  cursor: 'pointer'
                }}
              />
            </div>
            <Link to="/dashboard/calendar" className="view-all">View Calendar &rarr;</Link>
          </div>
          <div className="appointments-list selectable-list">
            {filteredAppointments.length === 0 && <div style={{padding: 'var(--space-4)', color: 'var(--text-muted)'}}>No appointments for this date.</div>}
            
            {filteredAppointments.map((apt) => (
              <div
                key={apt.id}
                className={`appointment-item${selectedAppointment?.id === apt.id ? ' active' : ''}`}
                onClick={() => setSelectedAppointmentId(apt.id)}
                style={{ cursor: 'pointer' }}
              >
                <div className="appointment-time">{apt.time}</div>
                <div className="appointment-info">
                  <span className="patient-name">{apt.patientName}</span>
                  <span className="appointment-reason">{apt.service}</span>
                </div>
                <div className="appointment-badges">
                  <span className={badgeClass(apt.status)}>{apt.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Active Patient Panel */}
        <div className="dashboard-panel patient-panel">
          <div className="panel-header">
            <h2>Active Patient</h2>
          </div>
          {selectedAppointment ? (
            <div className="patient-card" id="patientCard">
              <div className="patient-header">
                <div className="patient-avatar">
                  {selectedAppointment.patientName.split(' ').map(n => n[0]).join('')}
                </div>
                <div className="patient-details">
                  <h3>{selectedAppointment.patientName}</h3>
                  <p>Age: {selectedPatientData?.age}</p>
                </div>
              </div>
              <div className="patient-info-grid">
                <div className="patient-info-item">
                  <span className="info-label">Reason: </span>
                  <span className="info-value">{selectedAppointment.service}</span>
                </div>
                <div className="patient-info-item">
                  <span className="info-label">Doctor: </span>
                  <span className="info-value">{selectedAppointment.doctor}</span>
                </div>
                <div className="patient-info-item">
                  <span className="info-label">Status: </span>
                  <span className={badgeClass(selectedAppointment.status)}>
                    {selectedAppointment.status}
                  </span>
                </div>
              </div>
              <div className="xray-gallery">
                <h4>X-Ray Images</h4>
                <div className="xray-grid">
                  <div className="xray-thumb">
                    <img src="/images/placeholder.jpg" alt="X-Ray 1" />
                  </div>
                  <div className="xray-thumb">
                    <img src="/images/placeholder.jpg" alt="X-Ray 2" />
                  </div>
                  <div className="xray-thumb">
                    <img src="/images/placeholder.jpg" alt="X-Ray 3" />
                  </div>
                </div>
              </div>
              <div className="treatment-notes">
                <h4>Treatment Notes</h4>
                <textarea 
                  placeholder="Enter treatment notes here..." 
                  defaultValue={selectedPatientData?.notes || ''}
                  readOnly // Set to readOnly since this is just an overview panel
                ></textarea>
              </div>
            </div>
          ) : (
             <div style={{padding: 'var(--space-6)', color: 'var(--text-muted)'}}>No active patient selected for this date.</div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
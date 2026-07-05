import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import DashboardLayout from '../../layouts/DashboardLayout';
import DashboardHeader from '../../components/DashboardHeader';
import patientService from '../../services/patientService';

const emptyForm = {
  first_name: '',
  last_name: '',
  age: '',
  phone: '',
  email: '',
  is_high_risk: false,
  notes: '',
};

export default function Patients() {
  const navigate = useNavigate();

  const [patients, setPatients] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const [selectedPatientId, setSelectedPatientId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Forms state
  const [formData, setFormData] = useState(emptyForm);

  // Notes are edited locally and only sent to the server on "Save Notes"
  const [notesDraft, setNotesDraft] = useState('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);

  const fullName = (p) => `${p.first_name} ${p.last_name}`.trim();

  const loadPatients = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const result = await patientService.getAll();
      if (result.success) {
        setPatients(result.data);
      } else {
        setLoadError(result.message || 'Could not load patients.');
      }
    } catch (err) {
      setLoadError('Could not reach the server. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPatients();
  }, [loadPatients]);

  const filteredPatients = patients.filter((p) =>
    fullName(p).toLowerCase().includes(searchQuery.toLowerCase())
  );

  // If the selected patient was deleted, safely fall back to the first patient in the list
  const selectedPatient = patients.find((p) => p.id === selectedPatientId) || (patients.length > 0 ? patients[0] : null);
  const activePatientId = selectedPatient ? selectedPatient.id : null;

  // Keep the notes draft in sync whenever the selected patient changes
  useEffect(() => {
    setNotesDraft(selectedPatient?.notes || '');
  }, [selectedPatient?.id]);

  const handleOpenAdd = () => {
    setFormData(emptyForm);
    setShowAddModal(true);
  };

  const handleOpenEdit = () => {
    if (selectedPatient) {
      setFormData({
        first_name: selectedPatient.first_name || '',
        last_name: selectedPatient.last_name || '',
        age: selectedPatient.age ?? '',
        phone: selectedPatient.phone || '',
        email: selectedPatient.email || '',
        is_high_risk: !!selectedPatient.is_high_risk,
        notes: selectedPatient.notes || '',
      });
      setShowEditModal(true);
    }
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const result = await patientService.create(formData);
      if (result.success) {
        setShowAddModal(false);
        await loadPatients();
        setSelectedPatientId(result.data.id);
      } else {
        alert(result.message || 'Could not add patient.');
      }
    } catch (err) {
      alert('Could not reach the server. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!activePatientId) return;
    setIsSaving(true);
    try {
      const result = await patientService.update(activePatientId, formData);
      if (result.success) {
        setShowEditModal(false);
        await loadPatients();
      } else {
        alert(result.message || 'Could not update patient.');
      }
    } catch (err) {
      alert('Could not reach the server. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveNotes = async () => {
    if (!selectedPatient) return;
    setIsSavingNotes(true);
    try {
      // Send the full record back with just notes changed — the API expects
      // the complete patient object, not a partial patch.
      const result = await patientService.update(selectedPatient.id, {
        first_name: selectedPatient.first_name,
        last_name: selectedPatient.last_name,
        age: selectedPatient.age,
        phone: selectedPatient.phone,
        email: selectedPatient.email,
        is_high_risk: !!selectedPatient.is_high_risk,
        notes: notesDraft,
      });
      if (result.success) {
        await loadPatients();
      } else {
        alert(result.message || 'Could not save notes.');
      }
    } catch (err) {
      alert('Could not reach the server. Please try again.');
    } finally {
      setIsSavingNotes(false);
    }
  };

  const handleDeletePatient = async () => {
    if (!selectedPatient) return;
    if (!window.confirm(`Are you sure you want to delete ${fullName(selectedPatient)}'s profile? This will also remove their appointments, invoices, and lab results. This cannot be undone.`)) {
      return;
    }
    try {
      const result = await patientService.remove(activePatientId);
      if (result.success) {
        setSelectedPatientId(null);
        await loadPatients();
      } else {
        alert(result.message || 'Could not delete patient.');
      }
    } catch (err) {
      alert('Could not reach the server. Please try again.');
    }
  };

  return (
    <DashboardLayout>
      <DashboardHeader
        title="Patient Hub"
        subtitle="Manage patient records and history"
        search={
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ position: 'absolute', left: '10px', width: '16px', height: '16px', color: 'var(--text-muted)' }}>
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.3-4.3"></path>
            </svg>
            <input
              type="text"
              placeholder="Search patients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ padding: 'var(--space-2) var(--space-2) var(--space-2) 32px', borderRadius: 'var(--radius-md)', border: '1px solid var(--dash-border)', background: 'var(--bg-card)', color: 'var(--text-main)' }}
            />
          </div>
        }
        action={
          <button className="btn btn-primary" onClick={handleOpenAdd}>
             <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16" style={{marginRight: 'var(--space-2)'}}>
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            Add Patient
          </button>
        }
      />

      {loadError && (
        <div style={{ padding: 'var(--space-4)', marginBottom: 'var(--space-4)', borderRadius: 'var(--radius-md)', background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca' }}>
          {loadError}
        </div>
      )}

      {/* Stats */}
      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-icon blue">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
            </svg>
          </div>
          <div className="stat-content">
            <span className="stat-value">{patients.length}</span>
            <span className="stat-label">Total Patients</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon red">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
              <line x1="12" y1="9" x2="12" y2="13"></line>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
          </div>
          <div className="stat-content">
            <span className="stat-value">{patients.filter((p) => p.is_high_risk).length}</span>
            <span className="stat-label">High-Risk Patients</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon purple">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
          </div>
          <div className="stat-content">
            <span className="stat-value">{patients.length}</span>
            <span className="stat-label">Active Patients</span>
          </div>
        </div>
      </div>

      {/* Patient Layout */}
      <div className="patient-layout">
        <div className="list-container">
          <div className="list-header">
            <h3>Patient Directory</h3>
          </div>
          <div className="list-header" style={{ paddingTop: 0 }}>
            <button className="filter-btn" onClick={() => setSearchQuery('')} style={{ visibility: searchQuery ? 'visible' : 'hidden' }}>Clear Search</button>
          </div>
          <div className="patient-list selectable-list" id="patientList">
            {isLoading && <p style={{padding: 'var(--space-4)', color: 'var(--text-muted)'}}>Loading patients...</p>}
            {!isLoading && filteredPatients.length === 0 && <p style={{padding: 'var(--space-4)', color: 'var(--text-muted)'}}>No patients found.</p>}
            {!isLoading && filteredPatients.map((p) => (
              <div
                key={p.id}
                className={`patient-item ${activePatientId === p.id ? 'active' : ''}`}
                onClick={() => setSelectedPatientId(p.id)}
                style={{ cursor: 'pointer' }}
              >
                <div className="patient-avatar" style={{width: '40px', height: '40px', borderRadius: '50%', background: 'var(--color-primary-light)', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold'}}>
                  {fullName(p).split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
                <div className="patient-info">
                  <h4>
                    {fullName(p)}
                    {!!p.is_high_risk && (
                      <span style={{ marginLeft: '6px', fontSize: '0.7rem', color: '#b91c1c', fontWeight: 700 }} title="High-risk patient">⚠ HIGH-RISK</span>
                    )}
                  </h4>
                  <p>Age: {p.age ?? 'N/A'}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Patient Details */}
        <div className="details-panel" id="patientDetails">
          {selectedPatient ? (
            <>
              <div className="details-header">
                <div className="details-title">
                  <h2>
                    {fullName(selectedPatient)}
                    {!!selectedPatient.is_high_risk && (
                      <span style={{ marginLeft: '8px', fontSize: '0.75rem', color: '#b91c1c', fontWeight: 700 }}>⚠ HIGH-RISK</span>
                    )}
                  </h2>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Patient ID: {selectedPatient.id}</p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button className="btn btn-outline btn-sm" onClick={handleOpenEdit}>Edit Profile</button>
                  <button className="btn btn-primary btn-sm" onClick={() => navigate('/dashboard/book')}>Book Appointment</button>
                  <button className="btn btn-sm" style={{ background: '#ef4444', color: 'white', border: 'none' }} onClick={handleDeletePatient}>Delete</button>
                </div>
              </div>
              <div className="details-grid">
                <div className="details-card">
                  <h4>Contact Information</h4>
                  <div className="info-list">
                    <div className="info-item"><span className="info-label">Email</span><span className="info-value">{selectedPatient.email || 'N/A'}</span></div>
                    <div className="info-item"><span className="info-label">Phone</span><span className="info-value">{selectedPatient.phone || 'N/A'}</span></div>
                    <div className="info-item"><span className="info-label">Age</span><span className="info-value">{selectedPatient.age ?? 'N/A'}</span></div>
                  </div>
                </div>
                <div className="details-card">
                  <h4>Findings & Notes</h4>
                  <textarea
                    style={{ width: '100%', height: '100px', padding: 'var(--space-2)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--dash-border)', background: 'var(--bg-card)', color: 'var(--text-main)' }}
                    placeholder="Enter medical findings and notes here..."
                    value={notesDraft}
                    onChange={(e) => setNotesDraft(e.target.value)}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'var(--space-1)' }}>
                    <p style={{ fontSize: '10px', color: 'var(--text-muted)', margin: 0 }}>Notes are saved manually.</p>
                    <button
                      className="btn btn-sm btn-primary"
                      onClick={handleSaveNotes}
                      disabled={isSavingNotes || notesDraft === (selectedPatient.notes || '')}
                    >
                      {isSavingNotes ? 'Saving...' : 'Save Notes'}
                    </button>
                  </div>
                </div>
              </div>
            </>
          ) : (
             <div style={{ color: 'var(--text-muted)' }}>
               {isLoading ? 'Loading...' : 'Select a patient from the directory to view details.'}
             </div>
          )}
        </div>
      </div>

      {/* Add Patient Modal */}
      {showAddModal && (
        <div className="modal active" id="addPatientModal">
          <div className="modal-backdrop" onClick={() => setShowAddModal(false)}></div>
          <div className="modal-content">
            <div className="modal-header">
              <h3>Add New Patient</h3>
              <button className="btn btn-icon modal-close" aria-label="Close" onClick={() => setShowAddModal(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleAddSubmit}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
                  <div className="form-group">
                    <label htmlFor="patientFirstName" style={{ display: 'block', marginBottom: 'var(--space-2)', fontSize: 'var(--text-sm)', fontWeight: 500 }}>First Name</label>
                    <input type="text" id="patientFirstName" required value={formData.first_name} onChange={e => setFormData({...formData, first_name: e.target.value})} style={{ width: '100%', padding: 'var(--space-2)', borderRadius: 'var(--radius-md)', border: '1px solid var(--dash-border)', background: 'var(--bg-card)', color: 'var(--text-main)' }} />
                  </div>
                  <div className="form-group">
                    <label htmlFor="patientLastName" style={{ display: 'block', marginBottom: 'var(--space-2)', fontSize: 'var(--text-sm)', fontWeight: 500 }}>Last Name</label>
                    <input type="text" id="patientLastName" required value={formData.last_name} onChange={e => setFormData({...formData, last_name: e.target.value})} style={{ width: '100%', padding: 'var(--space-2)', borderRadius: 'var(--radius-md)', border: '1px solid var(--dash-border)', background: 'var(--bg-card)', color: 'var(--text-main)' }} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
                  <div className="form-group">
                    <label htmlFor="patientAge" style={{ display: 'block', marginBottom: 'var(--space-2)', fontSize: 'var(--text-sm)', fontWeight: 500 }}>Age</label>
                    <input type="number" id="patientAge" value={formData.age} onChange={e => setFormData({...formData, age: e.target.value})} style={{ width: '100%', padding: 'var(--space-2)', borderRadius: 'var(--radius-md)', border: '1px solid var(--dash-border)', background: 'var(--bg-card)', color: 'var(--text-main)' }} />
                  </div>
                  <div className="form-group">
                    <label htmlFor="patientPhone" style={{ display: 'block', marginBottom: 'var(--space-2)', fontSize: 'var(--text-sm)', fontWeight: 500 }}>Phone</label>
                    <input type="tel" id="patientPhone" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} style={{ width: '100%', padding: 'var(--space-2)', borderRadius: 'var(--radius-md)', border: '1px solid var(--dash-border)', background: 'var(--bg-card)', color: 'var(--text-main)' }} />
                  </div>
                </div>
                <div className="form-group" style={{ marginBottom: 'var(--space-4)' }}>
                  <label htmlFor="patientEmail" style={{ display: 'block', marginBottom: 'var(--space-2)', fontSize: 'var(--text-sm)', fontWeight: 500 }}>Email Address</label>
                  <input type="email" id="patientEmail" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} style={{ width: '100%', padding: 'var(--space-2)', borderRadius: 'var(--radius-md)', border: '1px solid var(--dash-border)', background: 'var(--bg-card)', color: 'var(--text-main)' }} />
                </div>
                <div className="form-group" style={{ marginBottom: 'var(--space-4)' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 'var(--text-sm)', fontWeight: 500, cursor: 'pointer' }}>
                    <input type="checkbox" checked={formData.is_high_risk} onChange={e => setFormData({...formData, is_high_risk: e.target.checked})} />
                    Mark as High-Risk Patient
                  </label>
                </div>
                <div className="modal-footer" style={{ padding: 0, marginTop: 'var(--space-6)', border: 'none', background: 'transparent' }}>
                  <button type="button" className="btn btn-outline" onClick={() => setShowAddModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={isSaving}>{isSaving ? 'Saving...' : 'Save Patient'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Patient Modal */}
      {showEditModal && (
        <div className="modal active" id="editPatientModal">
          <div className="modal-backdrop" onClick={() => setShowEditModal(false)}></div>
          <div className="modal-content">
            <div className="modal-header">
              <h3>Edit Patient Profile</h3>
              <button className="btn btn-icon modal-close" aria-label="Close" onClick={() => setShowEditModal(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleEditSubmit}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
                  <div className="form-group">
                    <label htmlFor="editFirstName" style={{ display: 'block', marginBottom: 'var(--space-2)', fontSize: 'var(--text-sm)', fontWeight: 500 }}>First Name</label>
                    <input type="text" id="editFirstName" required value={formData.first_name} onChange={e => setFormData({...formData, first_name: e.target.value})} style={{ width: '100%', padding: 'var(--space-2)', borderRadius: 'var(--radius-md)', border: '1px solid var(--dash-border)', background: 'var(--bg-card)', color: 'var(--text-main)' }} />
                  </div>
                  <div className="form-group">
                    <label htmlFor="editLastName" style={{ display: 'block', marginBottom: 'var(--space-2)', fontSize: 'var(--text-sm)', fontWeight: 500 }}>Last Name</label>
                    <input type="text" id="editLastName" required value={formData.last_name} onChange={e => setFormData({...formData, last_name: e.target.value})} style={{ width: '100%', padding: 'var(--space-2)', borderRadius: 'var(--radius-md)', border: '1px solid var(--dash-border)', background: 'var(--bg-card)', color: 'var(--text-main)' }} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
                  <div className="form-group">
                    <label htmlFor="editAge" style={{ display: 'block', marginBottom: 'var(--space-2)', fontSize: 'var(--text-sm)', fontWeight: 500 }}>Age</label>
                    <input type="number" id="editAge" value={formData.age} onChange={e => setFormData({...formData, age: e.target.value})} style={{ width: '100%', padding: 'var(--space-2)', borderRadius: 'var(--radius-md)', border: '1px solid var(--dash-border)', background: 'var(--bg-card)', color: 'var(--text-main)' }} />
                  </div>
                  <div className="form-group">
                    <label htmlFor="editPhone" style={{ display: 'block', marginBottom: 'var(--space-2)', fontSize: 'var(--text-sm)', fontWeight: 500 }}>Phone</label>
                    <input type="tel" id="editPhone" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} style={{ width: '100%', padding: 'var(--space-2)', borderRadius: 'var(--radius-md)', border: '1px solid var(--dash-border)', background: 'var(--bg-card)', color: 'var(--text-main)' }} />
                  </div>
                </div>
                <div className="form-group" style={{ marginBottom: 'var(--space-4)' }}>
                  <label htmlFor="editEmail" style={{ display: 'block', marginBottom: 'var(--space-2)', fontSize: 'var(--text-sm)', fontWeight: 500 }}>Email Address</label>
                  <input type="email" id="editEmail" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} style={{ width: '100%', padding: 'var(--space-2)', borderRadius: 'var(--radius-md)', border: '1px solid var(--dash-border)', background: 'var(--bg-card)', color: 'var(--text-main)' }} />
                </div>
                <div className="form-group" style={{ marginBottom: 'var(--space-4)' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 'var(--text-sm)', fontWeight: 500, cursor: 'pointer' }}>
                    <input type="checkbox" checked={formData.is_high_risk} onChange={e => setFormData({...formData, is_high_risk: e.target.checked})} />
                    Mark as High-Risk Patient
                  </label>
                </div>
                <div className="modal-footer" style={{ padding: 0, marginTop: 'var(--space-6)', border: 'none', background: 'transparent' }}>
                  <button type="button" className="btn btn-outline" onClick={() => setShowEditModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={isSaving}>{isSaving ? 'Saving...' : 'Save Changes'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import DashboardHeader from '../../components/DashboardHeader';
import staffService from '../../services/staffService';

const MAX_STAFF = 3;
const ROLES = ['Dentist', 'Admin/Secretary'];

const emptyInviteForm = { email: '', role: 'Dentist' };

export default function Staff() {
  const [staff, setStaff] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const [selectedId, setSelectedId] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [showAddModal, setShowAddModal] = useState(false);
  const [showDayOffModal, setShowDayOffModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState(emptyInviteForm);
  const [dayOffDate, setDayOffDate] = useState('');

  // Backend returns first_name/last_name; the rest of this page deals in
  // a single display name, so derive it once at the boundary.
  const fullName = (s) => `${s.first_name} ${s.last_name}`.trim();

  const loadStaff = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const result = await staffService.getAll();
      if (result.success) {
        setStaff(result.data);
        // Keep the current selection if it still exists, otherwise default to the first row
        setSelectedId((prev) =>
          prev && result.data.some((s) => s.id === prev) ? prev : (result.data[0]?.id ?? null)
        );
      } else {
        setLoadError(result.message || 'Could not load staff.');
      }
    } catch (err) {
      setLoadError('Could not reach the server. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStaff();
  }, [loadStaff]);

  const searchFilteredStaff = staff.filter((s) =>
    fullName(s).toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredStaff =
    activeFilter === 'all'
      ? searchFilteredStaff
      : searchFilteredStaff.filter((s) => s.role === activeFilter);

  const selectedStaff = staff.find((s) => s.id === selectedId) || null;

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (staff.length >= MAX_STAFF) {
      alert(`The clinic strictly limits staff to exactly ${MAX_STAFF} members. Cannot add more.`);
      return;
    }
    setIsSaving(true);
    try {
      const result = await staffService.invite(formData);
      if (result.success) {
        setShowAddModal(false);
        setFormData(emptyInviteForm);
        alert(
          `Invite code generated for ${formData.email}:\n\n${result.data.invite_code}\n\n` +
          'Share this with them to complete registration (dev mode — no real email is sent yet).'
        );
      } else {
        alert(result.message || 'Could not generate invite.');
      }
    } catch (err) {
      alert('Could not reach the server. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDayOffSubmit = async (e) => {
    e.preventDefault();
    if (!selectedId || !dayOffDate) return;
    setIsSaving(true);
    try {
      const result = await staffService.addDayOff(selectedId, dayOffDate);
      if (result.success) {
        setShowDayOffModal(false);
        setDayOffDate('');
        await loadStaff();
        alert('Day Off recorded.');
      } else {
        alert(result.message || 'Could not record day off.');
      }
    } catch (err) {
      alert('Could not reach the server. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemove = async () => {
    if (!selectedStaff) return;
    if (!window.confirm(`Are you sure you want to remove ${fullName(selectedStaff)}?`)) return;
    try {
      const result = await staffService.remove(selectedStaff.id);
      if (result.success) {
        await loadStaff();
      } else {
        alert(result.message || 'Could not remove staff member.');
      }
    } catch (err) {
      alert('Could not reach the server. Please try again.');
    }
  };

  const filters = ['all', ...ROLES];

  return (
    <DashboardLayout>
      <DashboardHeader
        title="Staff Management"
        subtitle="Manage team members and schedules"
        search={
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <svg
              className="search-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              style={{ position: 'absolute', left: '10px', width: '16px', height: '16px', color: 'var(--text-muted)' }}
            >
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.3-4.3"></path>
            </svg>
            <input
              type="text"
              placeholder="Search staff..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                padding: 'var(--space-2) var(--space-2) var(--space-2) 32px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--dash-border)',
                background: 'var(--bg-card)',
                color: 'var(--text-main)'
              }}
            />
          </div>
        }
        action={
          <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16" style={{ marginRight: 'var(--space-2)' }}>
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            Add Staff
          </button>
        }
      />

      {loadError && (
        <div style={{ padding: 'var(--space-4)', color: '#ef4444' }}>{loadError}</div>
      )}

      {/* Stats */}
      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-icon blue">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
          </div>
          <div className="stat-content">
            <span className="stat-value">{staff.length}</span>
            <span className="stat-label">Total Staff</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon purple">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
            </svg>
          </div>
          <div className="stat-content">
            <span className="stat-value">{staff.filter((s) => s.role === 'Dentist').length}</span>
            <span className="stat-label">Dentists</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon green">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
            </svg>
          </div>
          <div className="stat-content">
            <span className="stat-value">{staff.filter((s) => s.role === 'Admin/Secretary').length}</span>
            <span className="stat-label">Admin / Secretary</span>
          </div>
        </div>
      </div>

      <div className="staff-layout">
        <div className="list-container">
          <div className="list-header">
            <h3>Staff Directory</h3>
          </div>
          <div className="list-filters">
            {filters.map((f) => (
              <button
                key={f}
                className={`filter-btn${activeFilter === f ? ' active' : ''}`}
                onClick={() => setActiveFilter(f)}
              >
                {f === 'all' ? 'All' : f === 'Admin/Secretary' ? 'Admin' : f}
              </button>
            ))}
          </div>

          <div className="staff-list selectable-list" style={{ display: 'block' }}>
            {isLoading && <p style={{ padding: 'var(--space-4)', color: 'var(--text-muted)' }}>Loading...</p>}
            {!isLoading && filteredStaff.length === 0 && (
              <p style={{ padding: 'var(--space-4)', color: 'var(--text-muted)' }}>No staff found.</p>
            )}
            {filteredStaff.map((s) => (
              <div
                key={s.id}
                className={`staff-item${selectedId === s.id ? ' active' : ''}`}
                onClick={() => setSelectedId(s.id)}
                style={{
                  cursor: 'pointer',
                  padding: 'var(--space-3)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-3)',
                  borderBottom: '1px solid var(--dash-border)'
                }}
              >
                <div
                  className="staff-avatar"
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    background: 'var(--color-primary-light)',
                    color: 'var(--color-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    fontWeight: 'bold'
                  }}
                >
                  {fullName(s).split(' ').map((n) => n[0]).join('')}
                </div>
                <div className="staff-info">
                  <h4 style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--text-main)' }}>{fullName(s)}</h4>
                  <p style={{ margin: 0, fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{s.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="details-panel">
          {selectedStaff ? (
            <>
              <div className="details-header" style={{ marginBottom: 'var(--space-6)' }}>
                <div style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'center' }}>
                  <div
                    className="staff-avatar"
                    style={{
                      width: '80px',
                      height: '80px',
                      borderRadius: '50%',
                      background: 'var(--color-primary-light)',
                      color: 'var(--color-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 'var(--text-2xl)',
                      fontWeight: 'bold',
                      flexShrink: 0
                    }}
                  >
                    {fullName(selectedStaff).split(' ').map((n) => n[0]).join('')}
                  </div>
                  <div>
                    <h2 style={{ margin: 0, fontSize: 'var(--text-xl)', color: 'var(--text-main)' }}>{fullName(selectedStaff)}</h2>
                    <p style={{ margin: 0, color: 'var(--text-muted)' }}>
                      {selectedStaff.role} • ID: {selectedStaff.id}
                    </p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'var(--space-4)' }}>
                  <button className="btn btn-outline btn-sm" onClick={() => setShowDayOffModal(true)}>
                    Set Day Off
                  </button>
                  <button
                    className="btn btn-sm"
                    onClick={handleRemove}
                    style={{ background: '#ef4444', color: 'white', border: 'none' }}
                  >
                    Remove
                  </button>
                </div>
              </div>

              <div className="details-grid">
                <div className="details-card">
                  <h4>Profile Information</h4>
                  <div className="info-list">
                    <div className="info-item">
                      <span className="info-label">Name</span>
                      <span className="info-value">{fullName(selectedStaff)}</span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">Email</span>
                      <span className="info-value">{selectedStaff.email}</span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">Role</span>
                      <span className="info-value">{selectedStaff.role}</span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">Status</span>
                      <span className="info-value">
                        <span className="status-badge" style={{ background: '#10b981', color: 'white', border: 'none' }}>
                          Active
                        </span>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="details-card">
                  <h4>Days Off Tracker</h4>
                  {(selectedStaff.days_off || []).length === 0 ? (
                    <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>No days off scheduled.</p>
                  ) : (
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: 'var(--text-sm)' }}>
                      {(selectedStaff.days_off || []).map((d, i) => (
                        <li key={i} style={{ padding: 'var(--space-2) 0', borderBottom: '1px solid var(--dash-border)' }}>
                          <span className="status-badge" style={{ background: 'var(--dash-hover)', color: 'var(--text-main)' }}>
                            {new Date(d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div style={{ color: 'var(--text-muted)' }}>
              {isLoading ? 'Loading...' : 'Select a staff member to view details.'}
            </div>
          )}
        </div>
      </div>

      {/* Invite Staff Modal */}
      {showAddModal && (
        <div className="modal active">
          <div className="modal-backdrop" onClick={() => setShowAddModal(false)}></div>
          <div className="modal-content" style={{ background: 'var(--bg-card)', borderColor: 'var(--dash-border)' }}>
            <div className="modal-header" style={{ background: 'var(--bg-main)', borderBottom: '1px solid var(--dash-border)' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: 'var(--text-main)' }}>
                <svg viewBox="0 0 24 24" fill="var(--color-primary)" width="20" height="20">
                  <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"></path>
                </svg>
                Invite New Staff Member
              </h3>
              <button className="btn btn-icon modal-close" aria-label="Close" onClick={() => setShowAddModal(false)}>
                &times;
              </button>
            </div>
            <div className="modal-body" style={{ padding: 'var(--space-6)' }}>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginBottom: 'var(--space-4)' }}>
                Generates a one-time invite code for this email. Share the code with them to
                complete their own registration (dev mode — no real email is sent yet).
              </p>
              <form onSubmit={handleAddSubmit}>
                <div className="form-group" style={{ marginBottom: 'var(--space-4)' }}>
                  <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--text-main)' }}>Email Address</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    style={{ width: '100%', padding: 'var(--space-2)', borderRadius: '4px', border: '1px solid var(--dash-border)', background: 'var(--bg-main)', color: 'var(--text-main)' }}
                    placeholder="colleague@clinic.com"
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 'var(--space-4)' }}>
                  <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--text-main)' }}>Role</label>
                  <select
                    required
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    style={{ width: '100%', padding: 'var(--space-2)', borderRadius: '4px', border: '1px solid var(--dash-border)', background: 'var(--bg-main)', color: 'var(--text-main)' }}
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>{r === 'Admin/Secretary' ? 'Admin / Secretary' : r}</option>
                    ))}
                  </select>
                </div>

                <div className="modal-footer" style={{ padding: 0, marginTop: 'var(--space-6)', border: 'none', background: 'transparent' }}>
                  <button type="button" className="btn btn-outline" onClick={() => setShowAddModal(false)} style={{ border: 'none' }}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" style={{ background: 'var(--color-primary)' }} disabled={isSaving}>
                    {isSaving ? 'Generating...' : 'Send Invite'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Set Day Off Modal */}
      {showDayOffModal && (
        <div className="modal active">
          <div className="modal-backdrop" onClick={() => setShowDayOffModal(false)}></div>
          <div className="modal-content">
            <div className="modal-header">
              <h3>Schedule Day Off for {selectedStaff ? fullName(selectedStaff) : ''}</h3>
              <button className="btn btn-icon modal-close" aria-label="Close" onClick={() => setShowDayOffModal(false)}>
                &times;
              </button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleDayOffSubmit}>
                <div className="form-group" style={{ marginBottom: 'var(--space-4)' }}>
                  <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontSize: 'var(--text-sm)', fontWeight: 500 }}>Date</label>
                  <input
                    type="date"
                    required
                    value={dayOffDate}
                    onChange={(e) => setDayOffDate(e.target.value)}
                    style={{ width: '100%', padding: 'var(--space-2)', borderRadius: 'var(--radius-md)', border: '1px solid var(--dash-border)', background: 'var(--bg-card)', color: 'var(--text-main)' }}
                  />
                </div>

                <div className="modal-footer" style={{ padding: 0, marginTop: 'var(--space-6)', border: 'none', background: 'transparent' }}>
                  <button type="button" className="btn btn-outline" onClick={() => setShowDayOffModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={isSaving}>
                    {isSaving ? 'Saving...' : 'Save Day Off'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

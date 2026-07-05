import { useState, useEffect, useCallback, useRef } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import DashboardHeader from '../../components/DashboardHeader';
import labsService from '../../services/labsService';
import patientService from '../../services/patientService';

// Added all statuses to match the top stat cards
const filters = ['all', 'Ready', 'Pending', 'Delayed', 'Reviewed'];

function patientName(lab) {
  return `${lab.first_name || ''} ${lab.last_name || ''}`.trim();
}

function statusColor(status) {
  switch (status) {
    case 'Pending':  return { background: '#f59e0b', color: 'white' };  // amber
    case 'Delayed':  return { background: '#ef4444', color: 'white' };  // red
    case 'Ready':    return { background: '#3b82f6', color: 'white' };  // blue
    case 'Reviewed': return { background: '#10b981', color: 'white' };  // green
    default:         return {};
  }
}

// Simple HTML escaper to prevent XSS in the PDF print window
function escapeHTML(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export default function Labs() {
  const [labs, setLabs] = useState([]);
  const [patients, setPatients] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [selectedId, setSelectedId] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal States
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadData, setUploadData] = useState({ patientId: '', testType: '', file: null });
  const [isUploading, setIsUploading] = useState(false);
  
  // Ref for clearing the uncontrolled file input
  const fileInputRef = useRef(null);

  const loadLabs = useCallback(async () => {
    try {
      const result = await labsService.getAll();
      if (result.success) setLabs(result.data);
    } catch (err) {
      console.error('Could not load lab results:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadPatients = useCallback(async () => {
    try {
      const result = await patientService.getAll();
      if (result.success) setPatients(result.data);
    } catch (err) {
      console.error('Could not load patients:', err);
    }
  }, []);

  useEffect(() => {
    loadLabs();
    loadPatients();
  }, [loadLabs, loadPatients]);

  // Fix: Added optional chaining and fallback for test_type to prevent crashes
  const searchFilteredLabs = labs.filter(l => 
    patientName(l).toLowerCase().includes(searchQuery.toLowerCase()) || 
    (l.test_type?.toLowerCase() || '').includes(searchQuery.toLowerCase())
  );

  const filteredLabs = activeFilter === 'all'
    ? searchFilteredLabs
    : activeFilter === 'Ready'
      ? searchFilteredLabs.filter((l) => l.status === 'Ready' || l.status === 'Reviewed')
      : searchFilteredLabs.filter((l) => l.status === activeFilter);

  // Fix: Base the selected lab strictly on the currently filtered list
  const selectedLab = filteredLabs.find(l => l.id === selectedId) || (filteredLabs.length > 0 ? filteredLabs[0] : null);

  const handleNotesChange = (e) => {
    if (selectedLab) {
      const notes = e.target.value;
      setLabs(prev => prev.map(l => l.id === selectedLab.id ? { ...l, doctor_notes: notes } : l));
    }
  };

  const handleNotesBlur = async () => {
    if (!selectedLab) return;
    try {
      // Fix: Ensured payload key matches the database schema convention (snake_case)
      await labsService.update(selectedLab.id, { doctor_notes: selectedLab.doctor_notes });
    } catch (err) {
      console.error('Could not save notes:', err);
    }
  };

  const handleStatusChange = async (status) => {
    if (!selectedLab) return;
    try {
      const result = await labsService.update(selectedLab.id, { status });
      if (result.success) {
        setLabs(prev => prev.map(l => l.id === selectedLab.id ? { ...l, status } : l));
      } else {
        alert(result.message || 'Could not update status.');
      }
    } catch (err) {
      alert('Something went wrong.');
    }
  };

  const handleDeleteLab = async () => {
    if (!selectedLab) return;
    if (window.confirm(`Warning: Permanently delete ${selectedLab.test_type} results for ${patientName(selectedLab)}?`)) {
      try {
        const result = await labsService.remove(selectedLab.id);
        if (result.success) {
          setLabs(prev => prev.filter(l => l.id !== selectedLab.id));
          setSelectedId(null);
        } else {
          alert(result.message || 'Could not delete lab result.');
        }
      } catch (err) {
        alert('Something went wrong.');
      }
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setUploadData({ ...uploadData, file: file });
    }
  };

  const submitUpload = async (e) => {
    e.preventDefault();
    if (!uploadData.patientId || !uploadData.testType || !uploadData.file) {
      alert("Please select a patient, test type, and attach a file.");
      return;
    }

    setIsUploading(true);
    try {
      const result = await labsService.upload({
        patientId: uploadData.patientId,
        testType: uploadData.testType,
        file: uploadData.file,
      });

      if (result.success) {
        // Fix: Clear state and reset the physical file input via ref
        setUploadData({ patientId: '', testType: '', file: null });
        if (fileInputRef.current) fileInputRef.current.value = '';
        
        setShowUploadModal(false);
        await loadLabs();
        setSelectedId(result.data.id);
      } else {
        alert(result.message || "Could not upload lab result.");
      }
    } catch (err) {
      alert("Something went wrong. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownloadPDF = () => {
    if (!selectedLab) return;
    
    // Fix: Sanitize user-generated content before writing to DOM
    const safeName = escapeHTML(patientName(selectedLab));
    const safeTestType = escapeHTML(selectedLab.test_type);
    const safeNotes = escapeHTML(selectedLab.doctor_notes || 'No clinical findings have been recorded for this test yet.');
    const safeStatus = escapeHTML(selectedLab.status);
    const safeDate = escapeHTML(selectedLab.created_at);
    
    const printWindow = window.open('', '_blank', 'width=800,height=900');
    printWindow.document.write(`
      <html>
        <head>
          <title>${safeName} - Diagnostic Report</title>
          <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; color: #1e293b; line-height: 1.6; }
            .header { text-align: center; border-bottom: 3px solid #1e88e5; padding-bottom: 20px; margin-bottom: 30px; }
            .header h1 { color: #1e88e5; margin: 0; font-size: 28px; text-transform: uppercase; letter-spacing: 1px; }
            .header p { margin: 5px 0; color: #64748b; }
            .report-title { text-align: center; font-size: 22px; font-weight: bold; margin-bottom: 30px; background: #f1f5f9; padding: 10px; border-radius: 6px; }
            .section { margin-bottom: 30px; }
            .section-title { font-size: 16px; font-weight: bold; border-bottom: 1px solid #cbd5e1; padding-bottom: 8px; margin-bottom: 15px; color: #0f172a; text-transform: uppercase; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px; }
            .info-item { background: #f8fafc; padding: 12px; border-radius: 6px; border: 1px solid #e2e8f0; }
            .info-label { font-weight: bold; color: #64748b; display: block; font-size: 12px; text-transform: uppercase; }
            .info-value { font-size: 16px; font-weight: 600; color: #0f172a; }
            .xray-box { background: #f8fafc; border: 2px dashed #94a3b8; height: 350px; display: flex; align-items: center; justify-content: center; color: #64748b; margin-bottom: 20px; border-radius: 8px; }
            .notes-box { background: #ffffff; padding: 20px; border-radius: 8px; border: 1px solid #cbd5e1; min-height: 150px; white-space: pre-wrap; }
            .footer { margin-top: 60px; border-top: 1px solid #cbd5e1; padding-top: 20px; display: flex; justify-content: space-between; color: #64748b; font-size: 14px; }
            .signature { text-align: right; }
            .signature-line { border-bottom: 1px solid #1e293b; width: 200px; margin-bottom: 5px; height: 40px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>DentalCare Clinic</h1>
            <p>1395 Rizal Avenue, corner W 14th St, West Tapinac, Olongapo City</p>
            <p>Tel: (047) 123-4567 | Email: diagnostics@dentalcare.com</p>
          </div>
          <div class="report-title">Official Diagnostic Lab Report</div>
          <div class="section">
            <div class="section-title">Patient and Test Information</div>
            <div class="info-grid">
              <div class="info-item"><span class="info-label">Patient Name</span><span class="info-value">${safeName}</span></div>
              <div class="info-item"><span class="info-label">Diagnostic Test</span><span class="info-value">${safeTestType}</span></div>
              <div class="info-item"><span class="info-label">Date Taken</span><span class="info-value">${safeDate}</span></div>
              <div class="info-item"><span class="info-label">Current Status</span><span class="info-value">${safeStatus}</span></div>
            </div>
          </div>
          <div class="section">
            <div class="section-title">Radiography / Scan Data</div>
            <div class="xray-box">
              [ High-Resolution Medical Image Attachment: ${safeTestType} ]
            </div>
          </div>
          <div class="section">
            <div class="section-title">Doctor's Findings and Clinical Notes</div>
            <div class="notes-box">${safeNotes}</div>
          </div>
          <div class="footer">
            <div>
              <p>Generated on: ${new Date().toLocaleDateString()}</p>
              <p>Document ID: LAB-${String(selectedLab.id).padStart(5, '0')}</p>
            </div>
            <div class="signature">
              <div class="signature-line"></div>
              <strong>Attending Physician / Radiologist</strong>
              <p>DentalCare Clinic</p>
            </div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  return (
    <DashboardLayout>
      <DashboardHeader
        title="Lab Results"
        subtitle="View and manage diagnostic results"
        search={
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ position: 'absolute', left: '10px', width: '16px', height: '16px', color: 'var(--text-muted)' }}>
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.3-4.3"></path>
            </svg>
            <input
              type="text"
              placeholder="Search results..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ padding: 'var(--space-2) var(--space-2) var(--space-2) 32px', borderRadius: 'var(--radius-md)', border: '1px solid var(--dash-border)', background: 'var(--bg-card)', color: 'var(--text-main)' }}
            />
          </div>
        }
      />

      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-icon green">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
          </div>
          <div className="stat-content">
            <span className="stat-value">{labs.filter(l => l.status === 'Ready' || l.status === 'Reviewed').length}</span>
            <span className="stat-label">Ready for Review</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon amber">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
          </div>
          <div className="stat-content">
            <span className="stat-value">{labs.filter(l => l.status === 'Pending').length}</span>
            <span className="stat-label">Pending Results</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon blue">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="2" x2="12" y2="6"></line>
              <line x1="12" y1="18" x2="12" y2="22"></line>
              <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
              <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
              <line x1="2" y1="12" x2="6" y2="12"></line>
              <line x1="18" y1="12" x2="22" y2="12"></line>
              <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
              <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
            </svg>
          </div>
          <div className="stat-content">
            <span className="stat-value">{labs.filter(l => l.status === 'Delayed').length}</span>
            <span className="stat-label">Delayed</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon purple">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
            </svg>
          </div>
          <div className="stat-content">
            <span className="stat-value">{labs.filter(l => l.status === 'Reviewed').length}</span>
            <span className="stat-label">Reviewed</span>
          </div>
        </div>
      </div>

      <div className="labs-layout">
        <div className="list-container">
          <div className="list-header">
            <h3>Lab Results</h3>
            <button className="btn btn-primary btn-sm" onClick={() => setShowUploadModal(true)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16" style={{ marginRight: '8px' }}>
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="17 8 12 3 7 8"></polyline>
                <line x1="12" y1="3" x2="12" y2="15"></line>
              </svg>
              Upload New
            </button>
          </div>
          <div className="list-filters">
            {filters.map((f) => (
              <button key={f} className={`filter-btn${activeFilter === f ? ' active' : ''}`} onClick={() => setActiveFilter(f)}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
          <div className="results-list selectable-list">
            {isLoading && <p style={{ padding: 'var(--space-4)', color: 'var(--text-muted)' }}>Loading lab results...</p>}
            {!isLoading && filteredLabs.length === 0 && <p style={{ padding: 'var(--space-4)', color: 'var(--text-muted)' }}>No lab results found.</p>}
            {filteredLabs.map((lab) => (
              <div
                key={lab.id}
                className={`result-item${selectedLab?.id === lab.id ? ' active' : ''}`}
                onClick={() => setSelectedId(lab.id)}
                style={{ cursor: 'pointer' }}
              >
                <div className="result-icon" style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'var(--dash-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-primary)', flexShrink: 0 }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                    <circle cx="8.5" cy="8.5" r="1.5"></circle>
                    <polyline points="21 15 16 10 5 21"></polyline>
                  </svg>
                </div>
                <div className="result-info">
                  <h4>{lab.test_type}</h4>
                  <p>{patientName(lab)}</p>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{lab.created_at}</span>
                </div>
                <span className="status-badge" style={statusColor(lab.status)}>
                  {lab.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="details-panel">
          {selectedLab ? (
            <>
              <div className="details-header">
                <div className="details-title">
                  <h2>{selectedLab.test_type}</h2>
                  <span className="status-badge" style={statusColor(selectedLab.status)}>
                    {selectedLab.status}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button className="btn btn-outline btn-sm" onClick={handleDownloadPDF}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14" style={{ marginRight: '6px' }}>
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                      <polyline points="7 10 12 15 17 10"></polyline>
                      <line x1="12" y1="15" x2="12" y2="3"></line>
                    </svg>
                    Download PDF
                  </button>
                  <select
                    value={selectedLab.status}
                    onChange={(e) => handleStatusChange(e.target.value)}
                    style={{ padding: 'var(--space-2) var(--space-3)', borderRadius: 'var(--radius-md)', border: '1px solid var(--dash-border)', background: 'var(--bg-card)', color: 'var(--text-main)', fontWeight: '500', cursor: 'pointer' }}
                  >
                    <option value="Pending">Pending</option>
                    <option value="Delayed">Delayed</option>
                    <option value="Ready">Ready</option>
                    <option value="Reviewed">Reviewed</option>
                  </select>
                  <button
                    className="btn btn-sm"
                    style={{ background: '#ef4444', color: 'white', border: 'none' }}
                    onClick={handleDeleteLab}
                  >
                    Delete
                  </button>
                </div>
              </div>
              <div className="xray-preview" style={{ background: 'var(--dash-hover)', borderRadius: '8px', padding: '3rem', textAlign: 'center', marginBottom: '1.5rem', border: '2px dashed var(--dash-border)' }}>
                {selectedLab.file_path ? (
                  <a href={`http://localhost/pineda-dentalclinic-api/${selectedLab.file_path}`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-primary)', textDecoration: 'underline' }}>
                    View Uploaded File
                  </a>
                ) : (
                  <p style={{ color: 'var(--text-muted)' }}>No file attached.</p>
                )}
              </div>
              <div className="details-grid">
                <div className="details-card">
                  <h4>Patient Information</h4>
                  <div className="info-list">
                    <div className="info-item"><span className="info-label">Patient</span><span className="info-value">{patientName(selectedLab)}</span></div>
                    <div className="info-item"><span className="info-label">Date Taken</span><span className="info-value">{selectedLab.created_at}</span></div>
                    <div className="info-item"><span className="info-label">Status</span><span className="info-value">{selectedLab.status}</span></div>
                  </div>
                </div>
                <div className="details-card">
                  <h4>Findings &amp; Notes</h4>
                  <textarea
                    style={{ width: '100%', height: '100px', padding: 'var(--space-3)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--dash-border)', background: 'var(--bg-main)', color: 'var(--text-main)', resize: 'vertical' }}
                    placeholder="Enter official medical findings and notes here..."
                    value={selectedLab.doctor_notes || ''}
                    onChange={handleNotesChange}
                    onBlur={handleNotesBlur}
                  />
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 'var(--space-2)' }}>Notes save when you click away from the box.</p>
                </div>
              </div>
            </>
          ) : (
            <div style={{ color: 'var(--text-muted)' }}>Select a lab result to view details.</div>
          )}
        </div>
      </div>

      {showUploadModal && (
        <div className="modal active" id="uploadLabModal">
          <div className="modal-backdrop" onClick={() => setShowUploadModal(false)}></div>
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3>Upload New Lab Result</h3>
              <button className="btn btn-icon modal-close" aria-label="Close" onClick={() => setShowUploadModal(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <form onSubmit={submitUpload}>
                <div className="form-group" style={{ marginBottom: 'var(--space-4)' }}>
                  <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontWeight: '500' }}>1. Select Registered Patient</label>
                  <select
                    required
                    className="form-control"
                    style={{ width: '100%', padding: 'var(--space-3)', borderRadius: 'var(--radius-md)', border: '1px solid var(--dash-border)', background: 'var(--bg-card)', color: 'var(--text-main)' }}
                    value={uploadData.patientId}
                    onChange={(e) => setUploadData({ ...uploadData, patientId: e.target.value })}
                  >
                    <option value="">-- Choose a Patient --</option>
                    {patients.length === 0 && <option disabled>No patients registered yet!</option>}
                    {patients.map(p => (
                      <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: 'var(--space-4)' }}>
                  <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontWeight: '500' }}>2. Test Type</label>
                  <select
                    required
                    className="form-control"
                    style={{ width: '100%', padding: 'var(--space-3)', borderRadius: 'var(--radius-md)', border: '1px solid var(--dash-border)', background: 'var(--bg-card)', color: 'var(--text-main)' }}
                    value={uploadData.testType}
                    onChange={(e) => setUploadData({ ...uploadData, testType: e.target.value })}
                  >
                    <option value="">-- Choose Test Type --</option>
                    <option value="Panoramic X-Ray">Panoramic X-Ray</option>
                    <option value="Bitewing X-Ray">Bitewing X-Ray</option>
                    <option value="CBCT Scan">CBCT Scan</option>
                    <option value="Cephalometric">Cephalometric</option>
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: 'var(--space-4)' }}>
                  <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontWeight: '500' }}>3. Attach File</label>
                  <input
                    type="file"
                    required
                    accept="image/*,.pdf"
                    className="form-control"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    style={{ width: '100%', padding: 'var(--space-3)', borderRadius: 'var(--radius-md)', border: '1px solid var(--dash-border)', background: 'var(--bg-card)', color: 'var(--text-main)' }}
                  />
                </div>

                <div className="modal-footer" style={{ marginTop: 'var(--space-6)', padding: '0', background: 'transparent', border: 'none' }}>
                  <button type="button" className="btn btn-outline" onClick={() => setShowUploadModal(false)} disabled={isUploading}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={isUploading}>
                    {isUploading ? 'Uploading...' : 'Upload & Save to Profile'}
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
const API_BASE = 'http://localhost/pineda-dentalclinic-api/api/labs.php';

function getAuthHeaders() {
  const token = localStorage.getItem('authToken');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

// File uploads use FormData — never set Content-Type manually here,
// the browser sets the multipart boundary itself.
function getAuthHeadersNoContentType() {
  const token = localStorage.getItem('authToken');
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

const labsService = {
  /**
   * GET all lab results — staff only.
   */
  async getAll() {
    const res = await fetch(API_BASE, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  /**
   * GET one lab result by ID.
   */
  async getById(id) {
    const res = await fetch(`${API_BASE}?id=${id}`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  /**
   * POST — upload a new lab result. multipart/form-data.
   *
   * data shape:
   * {
   *   patientId: 3,
   *   testType: 'Panoramic X-Ray',
   *   file: File,              (the actual File object from an <input type="file">)
   *   doctorNotes: ''           (optional)
   * }
   */
  async upload(data) {
    const formData = new FormData();
    formData.append('patient_id', data.patientId);
    formData.append('test_type', data.testType);
    formData.append('file', data.file);
    if (data.doctorNotes) {
      formData.append('doctor_notes', data.doctorNotes);
    }

    const res = await fetch(API_BASE, {
      method: 'POST',
      headers: getAuthHeadersNoContentType(),
      body: formData,
    });
    return res.json();
  },

  /**
   * PUT — update status and/or doctor_notes. JSON body.
   *
   * data shape (any subset):
   * {
   *   status: 'Reviewed',
   *   doctorNotes: '...'
   * }
   */
  async update(id, data) {
    const body = {};
    if (data.status !== undefined) body.status = data.status;
    if (data.doctorNotes !== undefined) body.doctor_notes = data.doctorNotes;

    const res = await fetch(`${API_BASE}?id=${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(body),
    });
    return res.json();
  },

  /**
   * DELETE — soft-delete a lab result. Staff only.
   */
  async remove(id) {
    const res = await fetch(`${API_BASE}?id=${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return res.json();
  },
};

export default labsService;
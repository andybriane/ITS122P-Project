import { useState } from 'react';
import '../assets/css/staff.css';

export default function StaffFlipCard({ staff }) {
  const [isFlipped, setIsFlipped] = useState(false);

  // Strictly block navigation and bubbling
  const handleFlip = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsFlipped(!isFlipped);
  };

  const avatarText = (staff?.name || 'Staff')
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('');

  // Data masking - strict fields only (No Email, No Phone, No ID)
  const yearsOfExperience = staff?.yearsOfExperience ?? staff?.experienceYears ?? staff?.experience ?? 'N/A';
  const degree = staff?.degree || 'N/A';
  const education = staff?.education || staff?.almaMater || 'N/A';

  const certifications = Array.isArray(staff?.certifications)
    ? staff.certifications
    : typeof staff?.certifications === 'string'
      ? staff.certifications.split(',').map((s) => s.trim()).filter(Boolean)
      : staff?.certifications
        ? [String(staff.certifications)]
        : ['N/A'];

  const specializations = Array.isArray(staff?.specializations)
    ? staff.specializations
    : typeof staff?.specializations === 'string'
      ? staff.specializations.split(',').map((s) => s.trim()).filter(Boolean)
      : staff?.specializations
        ? [String(staff.specializations)]
        : ['N/A'];

  const joinedCerts = certifications.join(', ');
  const joinedSpecs = specializations.join(', ');

  return (
    <div className={`staff-flipcard ${isFlipped ? 'is-flipped' : ''}`}>
      <div className="staff-flipcard-inner">
        {/* Front Side */}
        <div className="card-front flip-card-front">
          {staff?.image ? (
            <img src={staff.image} alt={staff.name} className="staff-image" />
          ) : (
            <div className="staff-image-placeholder">
              <div className="staff-flipcard-avatar">{avatarText}</div>
            </div>
          )}

          <div className="staff-flipcard-content">
            <div>
              <h3 className="staff-flipcard-name">{staff?.name || 'Unnamed Staff'}</h3>
              <p className="staff-flipcard-role">{staff?.role || 'N/A'}</p>
            </div>
            <button
              className="btn btn-primary btn-sm staff-flipcard-cta"
              type="button"
              onClick={handleFlip}
            >
              View Profile
            </button>
          </div>
        </div>

        {/* Back Side (Masked Privacy Data) */}
        <div className="card-back flip-card-back">
          <div className="card-back-content">
            <h3 className="staff-flipcard-back-title">Professional Details</h3>

            <div className="staff-flipcard-details">
              <div className="detail-block">
                <div className="detail-label">Years of Experience</div>
                <div className="detail-value">{yearsOfExperience}</div>
              </div>

              <div className="detail-block">
                <div className="detail-label">Degree / Education</div>
                <div className="detail-row">
                  <span className="detail-key">Degree</span>
                  <span className="detail-value">{degree}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-key">Education</span>
                  <span className="detail-value">{education}</span>
                </div>
              </div>

              <div className="detail-block">
                <div className="detail-label">Specializations</div>
                <div className="detail-value">{joinedSpecs}</div>
              </div>

              <div className="detail-block">
                <div className="detail-label">Certifications</div>
                <div className="detail-value">{joinedCerts}</div>
              </div>
            </div>

            <button
              className="btn btn-outline btn-sm staff-flipcard-cta"
              type="button"
              onClick={handleFlip}
            >
              Flip Back
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

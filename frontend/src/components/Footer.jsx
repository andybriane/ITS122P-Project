import { Link } from "react-router-dom";
import useClinicStatus from "../hooks/useClinicStatus";

export default function Footer() {
  const isOpen = useClinicStatus();

  return (
    <footer className="footer" style={{ padding: '3rem 0 1rem 0', backgroundColor: '#17345b', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
      <div className="container">
        <div 
          className="footer-grid" 
          style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', 
            gap: '2rem', 
            marginBottom: '2rem' 
          }}
        >
          
          {/* Column 1: Brand & Logo */}
          <div className="footer-brand" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <Link to="/" style={{ display: 'inline-block' }}>
              <img
                src="/images/pineda_dental_logo.jpg"
                alt="Pineda Dental Clinic"
                style={{ height: '48px', width: 'auto', borderRadius: '6px', objectFit: 'contain' }} 
              />
            </Link>
            <p className="footer-desc" style={{ fontSize: '0.875rem', color: '#dbeafe', margin: 0, lineHeight: '1.6' }}>
              Providing exceptional dental care with a gentle touch. Your comfort and confidence are our priority.
            </p>
            <div className="footer-social">
              <a
                href="https://www.facebook.com/p/Pineda-Dental-Clinic-100064029945721/?_rdc=1&_rdr#"
                target="_blank"
                rel="noopener noreferrer"
                title="Follow us on Facebook"
                aria-label="Pineda Dental Clinic Facebook"
                style={{ color: '#bfdbfe', display: 'inline-block', transition: 'color 0.2s' }}
              >
                <svg style={{ width: '20px', height: '20px' }} viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18 2h-3a6 6 0 0 0-6 6v3H7v4h2v8h4v-8h3l1-4h-4V8a2 2 0 0 1 2-2h3z"></path>
                </svg>
              </a>
            </div>
          </div>

          {/* Column 2: Quick Links */}
          <div className="footer-links" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <h4 style={{ fontSize: '1rem', fontWeight: '600', color: '#ffffff', margin: '0 0 0.5rem 0' }}>Quick Links</h4>
            <Link to="/" style={{ fontSize: '0.875rem', color: '#dbeafe', textDecoration: 'none' }}>Home</Link>
            <Link to="/services" style={{ fontSize: '0.875rem', color: '#dbeafe', textDecoration: 'none' }}>Services</Link>
            <Link to="/team" style={{ fontSize: '0.875rem', color: '#dbeafe', textDecoration: 'none' }}>Our Team</Link>
            <Link to="/contact" style={{ fontSize: '0.875rem', color: '#dbeafe', textDecoration: 'none' }}>Contact</Link>
          </div>

          {/* Column 3: Contact Info */}
          <div className="footer-contact" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <h4 style={{ fontSize: '1rem', fontWeight: '600', color: '#ffffff', margin: '0 0 0.5rem 0' }}>Contact Us</h4>
            <p style={{ fontSize: '0.875rem', color: '#dbeafe', margin: 0, lineHeight: '1.5' }}>
              1395 Rizal Avenue, corner W 14th St,<br />West Tapinac, Olongapo City
            </p>
            <p style={{ fontSize: '0.875rem', color: '#dbeafe', margin: 0 }}>0992-838-0952</p>
            <p style={{ fontSize: '0.875rem', color: '#dbeafe', margin: 0 }}>info@pinedadentalclinic.com</p>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: isOpen ? '#4ade80' : '#f87171', boxShadow: '0 0 4px rgba(0,0,0,0.2)' }}></span>
              <span style={{ fontSize: '0.875rem', color: '#f0f9ff', fontWeight: '500' }}>
                {isOpen ? "Open Now — Ends 4PM" : "Closed — Opens Mon 9AM"}
              </span>
            </div>
          </div>

          {/* Column 4: Accreditations */}
          <div className="footer-tricare" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h4 style={{ fontSize: '1rem', fontWeight: '600', color: '#ffffff', margin: 0 }}>Accreditations</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <img
                src="/images/tricare.svg"
                alt="TRICARE"
                style={{ height: '32px', width: 'auto', objectFit: 'contain', alignSelf: 'flex-start', filter: 'drop-shadow(0px 2px 4px rgba(0,0,0,0.15))' }}
              />
              <p style={{ fontSize: '0.75rem', color: '#dbeafe', margin: 0, lineHeight: '1.4' }}>
                Accredited Tricare Dental Services Provider.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <a href="https://www.tricare.mil" target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.75rem', color: '#bfdbfe', textDecoration: 'underline', textUnderlineOffset: '2px', fontWeight: '500' }}>
                  Visit TRICARE.mil
                </a>
                <a href="https://www.tricare-overseas.com" target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.75rem', color: '#bfdbfe', textDecoration: 'underline', textUnderlineOffset: '2px', fontWeight: '500' }}>
                  Visit TRICARE Overseas
                </a>
              </div>
            </div>
          </div>
          
        </div>

        {/* Bottom Copyright Bar */}
        <div 
          className="footer-bottom" 
          style={{ 
            borderTop: '1px solid rgba(255, 255, 255, 0.1)', 
            paddingTop: '1.5rem', 
            display: 'flex', 
            justifyContent: 'space-between', 
            flexWrap: 'wrap', 
            gap: '1rem' 
          }}
        >
          <p style={{ fontSize: '0.875rem', color: '#bfdbfe', margin: 0 }}>&copy; 2026 Pineda Dental Clinic. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
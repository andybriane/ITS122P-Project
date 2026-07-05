import { useState } from 'react';
import PublicLayout from '../../layouts/PublicLayout';
import useClinicStatus from '../../hooks/useClinicStatus';
import '../../assets/css/pages/contact.css';

export default function Contact() {
  const isOpen = useClinicStatus();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    // TODO: Laravel API endpoint
    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      alert('Thank you! Your message has been sent successfully. We will get back to you shortly.');
      setFormData({ name: '', email: '', phone: '', subject: '', message: '' });
    } catch (error) {
      alert('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PublicLayout>
      <section className="page-header">
        <div className="container">
          <h1 className="page-title">Contact Us</h1>
          <p className="page-subtitle">We are here to help with any questions you may have</p>
        </div>
      </section>

      {/* Tricare Accreditation Banner */}
      <section className="tricare-banner">
        <div className="container">
          <div className="tricare-content">
            <h2>Accredited Tricare Dental Services Provider</h2>
            <p>Pineda Dental Clinic is proud to be an accredited Tricare Dental Services Provider, serving military families with quality dental care.</p>
            <div className="tricare-links">
              <a href="https://www.tricare.mil" target="_blank" rel="noopener noreferrer" className="btn btn-outline">Visit TRICARE.mil</a>
              <a href="https://www.tricare-overseas.com" target="_blank" rel="noopener noreferrer" className="btn btn-outline">Visit TRICARE Overseas</a>
            </div>
          </div>
        </div>
      </section>

      <section className="contact-section">
        <div className="container">
          <div className="contact-grid">
            {/* Contact Form */}
            <div className="contact-form-wrapper">
              <h2 className="contact-form-title">Send us a Message</h2>
              <form className="contact-form" onSubmit={handleSubmit}>
                <div className="form-group">
                  <label htmlFor="name">Full Name</label>
                  <input type="text" id="name" name="name" required placeholder="Enter your full name" value={formData.name} onChange={handleChange} />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="email">Email Address</label>
                    <input type="email" id="email" name="email" required placeholder="Enter your email" value={formData.email} onChange={handleChange} />
                  </div>
                  <div className="form-group">
                    <label htmlFor="phone">Phone Number</label>
                    <input type="tel" id="phone" name="phone" placeholder="Enter your phone number" value={formData.phone} onChange={handleChange} />
                  </div>
                </div>
                <div className="form-group">
                  <label htmlFor="subject">Subject</label>
                  <select id="subject" name="subject" required value={formData.subject} onChange={handleChange}>
                    <option value="">Select a subject</option>
                    <option value="appointment">Appointment Inquiry</option>
                    <option value="services">Services Information</option>
                    <option value="billing">Billing Question</option>
                    <option value="feedback">Feedback</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="message">Message</label>
                  <textarea id="message" name="message" rows="5" required placeholder="Type your message here..." value={formData.message} onChange={handleChange}></textarea>
                </div>
                <button type="submit" className="btn btn-primary btn-full" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <span className="spinner"></span> Sending...
                    </>
                  ) : 'Send Message'}
                </button>
              </form>
            </div>

            {/* Contact Info */}
            <div className="contact-info">
              <div className="contact-card">
                <div className="contact-card-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                    <circle cx="12" cy="10" r="3"></circle>
                  </svg>
                </div>
                <h3>Our Location</h3>
                <p>1395 Rizal Avenue <br /> corner W 14th St<br /> West Tapinac<br /> Olongapo City</p>
              </div>

              <div className="contact-card">
                <div className="contact-card-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.15.5.42 1.62.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c1.19.28 2.31.55 2.81.7A2 2 0 0 1 22 16.92z"></path>
                  </svg>
                </div>
                <h3>Phone Numbers</h3>
                <p>Main: 0992-838-0952<br />Emergency: 0992-838-0952<br />Landline: N/A</p>
              </div>

              <div className="contact-card">
                <div className="contact-card-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                    <polyline points="22,6 12,13 2,6"></polyline>
                  </svg>
                </div>
                <h3>Email Address</h3>
                <p>info@pinedadentalclinic.com<br />info@pinedadentalclinic.com<br />appointments@pinedadentalclinic.com<br />support@pinedadentalclinic.com</p>
              </div>

              <div className="contact-card">
                <div className="contact-card-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <polyline points="12 6 12 12 16 14"></polyline>
                  </svg>
                </div>
                <h3>Clinic Hours</h3>
                <p>Monday &ndash; Friday: 9:00 AM &ndash; 4:00 PM<br />Saturday: 9:00 AM &ndash; 4:00 PM<br />Sunday: Closed</p>
                <div className={`clinic-hours-live${isOpen ? ' open' : ' closed'}`} id="clinicStatus">
                  <span className={`open-indicator${isOpen ? '' : ' closed'}`} id="contact-indicator"></span>
                  <span className="status-text" id="contact-status-text" style={{ color: isOpen ? 'var(--color-success)' : 'var(--color-emergency)' }}>
                    {isOpen ? 'Open Now' : 'Currently Closed'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Map Section */}
      <section className="map-section">
        <div className="container">
          <h2 className="section-title">Find Us</h2>
          <iframe
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3856.8408658633607!2d120.2810717!3d14.8341867!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3396711c315afad7%3A0xe9cbc469644c111!2sPineda%20Dental%20Office!5e0!3m2!1sen!2sph!4v1780235962617!5m2!1sen!2sph"
            width="100%"
            height="450"
            style={{ border: 0, borderRadius: '8px' }}
            allowFullScreen=""
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          ></iframe>
        </div>
      </section>
    </PublicLayout>
  );
}

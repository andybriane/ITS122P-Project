import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import PublicLayout from '../../layouts/PublicLayout';
import useClinicStatus from '../../hooks/useClinicStatus';

export default function Home() {
  // 1. MODAL STATE
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  
  // 2. CLINIC STATUS
  const isOpen = useClinicStatus();

  // 🚨 THE FIX: Lock the background from scrolling when the video is playing
  useEffect(() => {
    if (isVideoModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    // Cleanup function just in case
    return () => { document.body.style.overflow = 'unset'; };
  }, [isVideoModalOpen]);

  // 3. TESTIMONIALS STATE
  const [testimonials] = useState([
    {
      name: 'Maria Santos',
      rating: 5,
      text: 'I was nervous at first, but the team was patient and explained everything clearly. My teeth look amazing!',
      avatar: '/images/placeholder.jpg',
      date: 'May 12, 2025'
    },
    {
      name: 'John Reyes',
      rating: 5,
      text: 'Professional, friendly, and on time. The virtual tour helped me feel comfortable before my visit.',
      avatar: '/images/placeholder.jpg',
      date: 'January 22, 2026'
    },
    {
      name: 'Catherine Dela Cruz',
      rating: 4,
      text: 'Great care and a clean, modern clinic. I appreciated the follow-up and guidance after the checkup.',
      avatar: '/images/placeholder.jpg',
      date: 'August 30, 2025'
    }
  ]);

  const [activeIndex, setActiveIndex] = useState(0);

  const handlePrev = () => {
    setActiveIndex((prev) => (prev === 0 ? testimonials.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setActiveIndex((prev) => (prev === testimonials.length - 1 ? 0 : prev + 1));
  };

  return (
    <PublicLayout>
      {/* Hero Section */}
      <section className="hero hero-prototype">
        <div className="hero-prototype-bg">
          <img
            src="/images/home_dental1.JPG"
            alt="Modern dental clinic interior"
            className="hero-image"
          />
          <div className="hero-overlay"></div>
        </div>

        <div className="hero-prototype-content">
          <div className="hero-prototype-grid">
            {/* Left: Content */}
            <div className="hero-prototype-left">
              <div className="trust-badge" aria-label="Top Rated Dental Clinic">
                <span className={`trust-badge-dot${isOpen ? '' : ' closed'}`} aria-hidden="true" />
                <span>Top Rated Dental Clinic</span>
              </div>

              <h1 className="hero-prototype-title">
                A Smile You Can Trust —
                <span className="hero-prototype-title-accent">Every Visit</span>
              </h1>

              <p className="hero-prototype-subtitle">
                Compassionate, modern dental care designed to feel calm, clear, and confident from booking to aftercare.
              </p>

              <div className="hero-prototype-actions">
                <Link to="/booking" className="btn btn-primary btn-hero-primary">
                  Book Appointment
                </Link>

                <button 
                  type="button" 
                  className="btn btn-lg" 
                  style={{
                    backgroundColor: '#111827',
                    color: '#ffffff',
                    border: 'none',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '0.75rem 1.5rem',
                    borderRadius: '8px',
                    fontWeight: 'bold',
                    transition: 'transform 0.2s ease'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                  onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                  onClick={(e) => { 
                    e.preventDefault(); 
                    setIsVideoModalOpen(true); 
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <polygon points="5 3 19 12 5 21 5 3"></polygon>
                  </svg>
                  Watch Virtual Tour
                </button>
              </div>

              <div className="trust-indicators" aria-label="Clinic trust indicators">
                <div className="trust-indicator">
                  <span className="trust-indicator-value">5+ Years</span>
                  <span className="trust-indicator-label">Experience</span>
                </div>
                <div className="trust-indicator">
                  <span className="trust-indicator-value">1k+ Happy</span>
                  <span className="trust-indicator-label">Patients</span>
                </div>
              </div>
            </div>

            {/* Right: Image */}
            <div className="hero-prototype-right" aria-hidden="true">
              <div className="hero-prototype-image-card">
                <img
                  src="/images/home_dental2.JPG"
                  alt="Dental Clinic Room"
                  className="hero-prototype-image"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Patient Stories */}
      <section className="testimonials-section" aria-label="Patient Stories">
        <div className="container">
          <h2 className="section-title section-title-left">Patient Stories</h2>
          <p className="patient-stories-subtitle">Real experiences from real people.</p>

          <div className="testimonial-slider-container" role="region" aria-roledescription="carousel">
            <button
              type="button"
              className="testimonial-nav testimonial-nav-prev"
              onClick={handlePrev}
              aria-label="Previous testimonial"
            >
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>

            <article className="testimonial-active-card" aria-live="polite">
              <p className="testimonial-active-text">{testimonials[activeIndex].text}</p>

              <div className="testimonial-active-author">
                <div className="testimonial-active-avatar" aria-hidden="true">
                  <img src={testimonials[activeIndex].avatar} alt="" />
                </div>
                <div className="testimonial-active-name">{testimonials[activeIndex].name}</div>
                <div className="testimonial-active-date">{testimonials[activeIndex].date}</div>
              </div>
            </article>

            <button
              type="button"
              className="testimonial-nav testimonial-nav-next"
              onClick={handleNext}
              aria-label="Next testimonial"
            >
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 6l6 6-6 6" />
              </svg>
            </button>
          </div>

          <div className="testimonial-dots" role="tablist" aria-label="Testimonial navigation">
            {testimonials.map((_, idx) => (
              <button
                key={idx}
                type="button"
                className={`testimonial-dot${idx === activeIndex ? ' is-active' : ''}`}
                onClick={() => setActiveIndex(idx)}
                aria-label={`Go to testimonial ${idx + 1}`}
                aria-selected={idx === activeIndex}
                role="tab"
              />
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features">
        <div className="container">
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
              </div>
              <h3 className="feature-title">Easy Scheduling</h3>
              <p className="feature-desc">Book appointments online 24/7 with our simple scheduling system</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                  <polyline points="9 12 11 14 15 10"></polyline>
                </svg>
              </div>
              <h3 className="feature-title">Trusted Care</h3>
              <p className="feature-desc">Board-certified dentists with decades of combined experience</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                </svg>
              </div>
              <h3 className="feature-title">Family Friendly</h3>
              <p className="feature-desc">Welcoming environment for patients of all ages</p>
            </div>
          </div>
        </div>
      </section>

      {/* Services Preview */}
      <section className="services-preview">
        <div className="container">
          <h2 className="section-title">Our Services</h2>
          <p className="section-subtitle">Comprehensive dental care for every need</p>
          <div className="services-grid">
            <div className="service-card">
              <div className="service-image">
                <img src="/images/general_dentistry1.jpg" alt="General Dentistry" />
              </div>
              <h3 className="service-title">General Dentistry</h3>
              <p className="service-desc">Routine checkups, cleanings, and preventive care to keep your smile healthy</p>
              <Link to="/services#general" className="service-link">
                Learn More &rarr;
              </Link>
            </div>
            <div className="service-card">
              <div className="service-image">
                <img src="/images/cosmetic_dentistry1.jpg" alt="Cosmetic Dentistry" />
              </div>
              <h3 className="service-title">Cosmetic Dentistry</h3>
              <p className="service-desc">Teeth whitening, veneers, and smile makeovers for a confident you</p>
              <Link to="/services#cosmetic" className="service-link">
                Learn More &rarr;
              </Link>
            </div>
            <div className="service-card">
              <div className="service-image">
                <img src="/images/orthodontics1.jpg" alt="Orthodontics" />
              </div>
              <h3 className="service-title">Orthodontics</h3>
              <p className="service-desc">Braces, aligners, and corrective treatments for perfect alignment</p>
              <Link to="/services#orthodontics" className="service-link">
                Learn More &rarr;
              </Link>
            </div>
            <div className="service-card">
              <div className="service-image">
                <img src="/images/pediatrics_1.jpg" alt="Pediatric Care" />
              </div>
              <h3 className="service-title">Pediatric Care</h3>
              <p className="service-desc">Gentle, kid-friendly dental care in a fun, welcoming environment</p>
              <Link to="/services#pediatric" className="service-link">
                Learn More &rarr;
              </Link>
            </div>
          </div>
          <div className="services-cta">
            <Link to="/services" className="btn btn-primary">
              View All Services
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="container">
          <div className="cta-content">
            <h2 className="cta-title">Ready to Transform Your Smile?</h2>
            <p className="cta-text">Schedule your appointment today and experience the DentalCare difference.</p>
            <Link to="/booking" className="btn btn-white">
              Book Your Appointment
            </Link>
          </div>
        </div>
      </section>

      {/* 🚨 THE FIX: REACT PORTAL ESCAPES THE CSS TRANSFORM 🚨 */}
      {isVideoModalOpen && createPortal(
        <div 
          style={{ 
            position: 'fixed', 
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 99999, /* Boosted z-index just in case */
            backgroundColor: 'rgba(0, 0, 0, 0.75)', 
            backdropFilter: 'blur(10px)', 
            WebkitBackdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem'
          }} 
          onClick={() => setIsVideoModalOpen(false)}
        >
          <div 
            style={{ 
              position: 'relative',
              width: '100%', 
              maxWidth: '1000px', 
              aspectRatio: '16/9',
              backgroundColor: '#000', 
              borderRadius: '16px', 
              overflow: 'hidden', 
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.75)' 
            }} 
            onClick={(e) => e.stopPropagation()}
          >
            {/* Floating Close Button */}
            <button 
              type="button" 
              style={{ 
                position: 'absolute', 
                top: '16px', 
                right: '16px', 
                zIndex: 10,
                width: '40px',
                height: '40px',
                border: 'none', 
                background: 'rgba(0,0,0,0.6)', 
                color: '#FFF',
                borderRadius: '50%',
                fontSize: '24px', 
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 0.2s'
              }} 
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.9)'} 
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.6)'}
              onClick={() => setIsVideoModalOpen(false)}
            >
              &times;
            </button>
            
            {/* YouTube Embed */}
            <iframe 
              src="https://www.youtube.com/embed/_5x-zWOJk7k?autoplay=1&si=xQZInV4hODw3egMz" 
              title="YouTube video player" 
              style={{ width: '100%', height: '100%', border: 'none' }}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
              referrerPolicy="strict-origin-when-cross-origin" 
              allowFullScreen
            ></iframe>
          </div>
        </div>,
        document.body // Injects directly into the body tag!
      )}
    </PublicLayout>
  );
}
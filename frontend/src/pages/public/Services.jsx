import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import PublicLayout from '../../layouts/PublicLayout';
import servicesService from '../../services/servicesService';
import '../../assets/css/pages/services.css';

// Format a raw numeric price (e.g. 1500.00) as a peso string (e.g. "₱1,500")
function formatPeso(price) {
  const num = Number(price);
  return `\u20B1${num.toLocaleString('en-PH', { maximumFractionDigits: 0 })}`;
}

// Group flat service rows from the database into the
// [{ title, prices: [{ name, price }] }] shape the accordion UI expects.
function groupByCategory(services) {
  const map = new Map();
  for (const s of services) {
    if (!map.has(s.category)) {
      map.set(s.category, []);
    }
    map.get(s.category).push({ name: s.name, price: formatPeso(s.price) });
  }
  return Array.from(map.entries()).map(([title, prices]) => ({ title, prices }));
}

// Accordion item component
function AccordionItem({ title, prices, isActive, onToggle }) {
  return (
    <div className={`accordion-item${isActive ? ' active' : ''}`}>
      <button className="accordion-header" onClick={onToggle} type="button">
        <span>{title}</span>
        <span className="accordion-icon">+</span>
      </button>
      <div className="accordion-content">
        <ul className="service-price-list">
          {prices.map((item, idx) => (
            <li key={idx}>
              <span className="service-name">{item.name}</span>
              <span className="service-price">{item.price}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default function Services() {
  const [activeAccordion, setActiveAccordion] = useState(null);
  const [pricingData, setPricingData] = useState([]);
  const [isLoadingPricing, setIsLoadingPricing] = useState(true);
  const [pricingError, setPricingError] = useState(null);

  // 🚨 NEW STATE ADDED FOR THE SLIDER 🚨
  const [sliderPosition, setSliderPosition] = useState(50);

  const toggleAccordion = (index) => {
    setActiveAccordion(activeAccordion === index ? null : index);
  };

  useEffect(() => {
    let cancelled = false;

    async function loadPricing() {
      try {
        const result = await servicesService.getAll();
        if (cancelled) return;

        if (result.success) {
          setPricingData(groupByCategory(result.data));
        } else {
          setPricingError(result.message || 'Could not load services.');
        }
      } catch (err) {
        if (!cancelled) {
          setPricingError('Could not reach the server. Please try again later.');
        }
      } finally {
        if (!cancelled) setIsLoadingPricing(false);
      }
    }

    loadPricing();
    return () => { cancelled = true; };
  }, []);

  const serviceDetails = [
  {
    id: 'general',
    title: 'General Dentistry',
    desc: 'Our general dentistry services focus on maintaining your oral health through regular checkups, professional cleanings, and preventive care. We use state-of-the-art equipment to detect issues early and keep your smile healthy.',
    image: '/images/general_dentistry2.jpg', 
    items: ['Comprehensive Oral Exams', 'Professional Teeth Cleaning', 'Dental X-Rays', 'Fluoride Treatments', 'Cavity Fillings', 'Root Canal Treatment'],
  },
  {
    id: 'cosmetic',
    title: 'Cosmetic Dentistry',
    desc: 'Transform your smile with our cosmetic dental services. From teeth whitening to complete smile makeovers, we help you achieve the confident, beautiful smile you deserve.',
    image: '/images/cosmetic_dentistry2.jpg', 
    items: ['Professional Teeth Whitening', 'Porcelain Veneers', 'Dental Bonding', 'Smile Makeovers', 'Gum Contouring', 'Tooth Reshaping'],
    reverse: true,
  },
  {
    id: 'orthodontics',
    title: 'Orthodontics',
    desc: 'Achieve perfectly aligned teeth with our orthodontic treatments. Whether you prefer traditional braces or clear aligners, we have solutions for patients of all ages.',
    image: '/images/orthodontics2.jpg',       
    items: ['Traditional Metal Braces', 'Clear Ceramic Braces', 'Invisalign Clear Aligners', 'Retainers', 'Bite Correction', 'Space Maintainers'],
  },
  {
    id: 'pediatric',
    title: 'Pediatric Dentistry',
    desc: 'We make dental visits fun and comfortable for children. Our kid-friendly approach helps young patients develop positive attitudes toward oral health care.',
    image: '/images/pediatrics_2.jpg', 
    items: ['Child-Friendly Checkups', 'Dental Sealants', 'Fluoride Treatments', 'Early Orthodontic Assessment', 'Space Maintainers', 'Emergency Pediatric Care'],
    reverse: true,
  },
  {
    id: 'surgery',
    title: 'Oral Surgery',
    desc: 'Our experienced oral surgeons provide safe and effective surgical treatments, from wisdom tooth extractions to dental implants, ensuring your comfort throughout the process.',
    image: '/images/oral_surgery1.jpg',        
    items: ['Wisdom Tooth Extraction', 'Dental Implants', 'Bone Grafting', 'Jaw Surgery', 'Biopsy Procedures', 'Pre-Prosthetic Surgery'],
  },
  {
    id: 'emergency',
    title: 'Emergency Dental Care',
    desc: 'Dental emergencies can happen anytime. Our team is ready to provide prompt, compassionate care when you need it most. Contact us immediately for urgent dental issues.',
    image: '/images/emergency_1.JPG',    
    items: ['Severe Toothache Relief', 'Broken or Chipped Teeth', 'Knocked-Out Teeth', 'Lost Fillings or Crowns', 'Dental Abscess Treatment', 'Trauma Care'],
    isEmergency: true,
    reverse: true,
  },
];

  return (
    <PublicLayout>
      {/* Page Header */}
      <section className="page-header">
        <div className="container">
          <h1 className="page-title">Our Services</h1>
          <p className="page-subtitle">Comprehensive dental care tailored to your needs</p>
        </div>
      </section>

      {/* Services Detail */}
      <section className="services-section">
        <div className="container">
          {serviceDetails.map((service) => (
            <div key={service.id} className={`service-detail-card${service.reverse ? ' reverse' : ''}`} id={service.id}>
              
              <div className="service-detail-image">
                <img src={service.image} alt={service.title} />
              </div>

              <div className="service-detail-content">
                <h2 className="service-detail-title">{service.title}</h2>
                <p className="service-detail-desc">{service.desc}</p>
                <ul className="service-list">
                  {service.items.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
                
                {service.isEmergency ? (
                  <a href="tel:09123456789" className="btn btn-emergency-large">
                    <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.15.5.42 1.62.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c1.19.28 2.31.55 2.81.7A2 2 0 0 1 22 16.92z"></path>
                    </svg>
                    Call Emergency Line
                  </a>
                ) : (
                  <Link to="/booking" className="btn btn-primary">Book Consultation</Link>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 🚨 NEWLY INTEGRATED REAL RESULTS SLIDER 🚨 */}
      <section style={{ width: '100%', padding: '96px 24px', background: '#F9FAFB', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <h2 style={{ fontSize: '36px', fontWeight: 500, color: '#1E2939', margin: '0 0 12px 0' }}>Real Results</h2>
        <p style={{ fontSize: '20px', color: '#4A5565', margin: '0 0 40px 0' }}>Drag the slider to see the transformation</p>
        
        <div style={{ position: 'relative', width: '100%', maxWidth: '976px', height: '549px', borderRadius: '10px', overflow: 'hidden', background: '#E5E7EB', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
          {/* After Image (Background) */}
          <div style={{ position: 'absolute', inset: 0, backgroundImage: 'url(https://centurystonedental.com/wp-content/webp-express/webp-images/uploads/2022/05/How-Often-To-Visit-The-Dentist-With-Braces.jpg.webp)', backgroundSize: 'cover', backgroundPosition: 'center' }} />
          
          {/* Before Image (Foreground) */}
          <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: `${sliderPosition}%`, backgroundImage: 'url(https://valleyranchorthodontics.com/wp-content/uploads/orthodontist-shares-causes-crooked-teeth.jpg)', backgroundSize: 'cover', backgroundPosition: 'left center', borderRight: '2px solid #FFFFFF' }} />
          
          {/* Labels */}
          <div style={{ position: 'absolute', top: '16px', left: '16px', background: 'rgba(0,0,0,0.6)', color: '#FFF', padding: '4px 12px', borderRadius: '4px', fontSize: '14px' }}>Before</div>
          <div style={{ position: 'absolute', top: '16px', right: '16px', background: '#155DFC', color: '#FFF', padding: '4px 12px', borderRadius: '4px', fontSize: '14px' }}>After</div>
          
          {/* Slider Control */}
          <input type="range" min="0" max="100" value={sliderPosition} onChange={(e) => setSliderPosition(Number(e.target.value))} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'ew-resize', zIndex: 10 }} />
          
          {/* Slider Handle UI */}
          <div style={{ position: 'absolute', left: `${sliderPosition}%`, top: '50%', transform: 'translate(-50%, -50%)', width: '40px', height: '40px', background: '#FFF', border: '2px solid #155DFC', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#155DFC" strokeWidth="2.5"><polyline points="15 18 21 12 15 6" /><polyline points="9 18 3 12 9 6" /></svg>
          </div>
        </div>

        <div style={{ marginTop: '40px' }}>
          <Link to="/booking" style={{ display: 'inline-flex', padding: '16px 32px', background: '#155DFC', color: '#FFF', borderRadius: '10px', fontSize: '18px', fontWeight: 500, textDecoration: 'none', boxShadow: '0 4px 6px rgba(21,93,252,0.3)' }}>Start Your Transformation</Link>
        </div>
      </section>

      {/* Service Highlights */}
      <section className="service-highlights">
        <div className="container">
          <h2 className="section-title">Specialized Care</h2>
          <div className="highlights-grid">
            <div className="highlight-card">
              <div className="highlight-icon-wrapper">
                <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
              </div>
              <h3 className="highlight-title">Preventive Care</h3>
              <p className="highlight-desc">Advanced screenings and cleanings to protect your natural teeth.</p>
              <Link to="/booking" className="highlight-link">Book This Service</Link>
            </div>
            <div className="highlight-card">
              <div className="highlight-icon-wrapper">
                <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><path d="M12 8v8M8 12h8"></path></svg>
              </div>
              <h3 className="highlight-title">Dental Implants</h3>
              <p className="highlight-desc">Permanent solutions for missing teeth with natural-looking results.</p>
              <Link to="/booking" className="highlight-link">Book This Service</Link>
            </div>
            <div className="highlight-card">
              <div className="highlight-icon-wrapper">
                <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path></svg>
              </div>
              <h3 className="highlight-title">Orthodontics</h3>
              <p className="highlight-desc">Modern alignment solutions including clear ceramic braces.</p>
              <Link to="/booking" className="highlight-link">Book This Service</Link>
            </div>
            <div className="highlight-card">
              <div className="highlight-icon-wrapper">
                <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path></svg>
              </div>
              <h3 className="highlight-title">Cosmetic Bonding</h3>
              <p className="highlight-desc">Artistic restoration to fix chips and gaps in a single visit.</p>
              <Link to="/booking" className="highlight-link">Book This Service</Link>
            </div>
          </div>
        </div>
      </section>

      {/* Service Pricing Accordion */}
      <section className="pricing-section">
        <div className="container">
          <h2 className="section-title">Service Pricing</h2>
          <p className="section-subtitle">Transparent, affordable dental care pricing</p>
          {isLoadingPricing && <p>Loading current pricing...</p>}
          {pricingError && <p style={{ color: '#b91c1c' }}>{pricingError}</p>}
          {!isLoadingPricing && !pricingError && (
            <div className="accordion-container">
              {pricingData.map((item, idx) => (
                <AccordionItem
                  key={idx}
                  title={item.title}
                  prices={item.prices}
                  isActive={activeAccordion === idx}
                  onToggle={() => toggleAccordion(idx)}
                />
              ))}
            </div>
          )}
        </div>
      </section>
    </PublicLayout>
  );
}
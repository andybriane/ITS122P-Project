import { useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import TopBar from '../components/TopBar';
import Header from '../components/Header';
import Footer from '../components/Footer';
import PageTransition from '../components/PageTransition'; 

export default function PublicLayout({ children }) {
  const location = useLocation();

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <div>
      <TopBar />
      <Header />
      
      {/* 🚨 THE UPGRADE: The PageTransition Wrapper 🚨 */}
      <main>
        <PageTransition>
          {children}
        </PageTransition>
      </main>

      <Footer />
      
      {/* Floating CTA Button */}
      <Link to="/booking" className="floating-cta" aria-label="Book appointment">
        <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
          <line x1="16" y1="2" x2="16" y2="6"></line>
          <line x1="8" y1="2" x2="8" y2="6"></line>
          <line x1="3" y1="10" x2="21" y2="10"></line>
        </svg>
        Book Now
      </Link>
    </div>
  );
}
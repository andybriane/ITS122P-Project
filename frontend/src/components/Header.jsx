import { useState } from "react";
import { Link, useLocation } from "react-router-dom";

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  const getNavClass = (path) => {
    const isActive = location.pathname === path;
    return "nav-link" + (isActive ? " active" : "");
  };

  const getMobileNavClass = (path) => {
    const isActive = location.pathname === path;
    return "mobile-nav-link" + (isActive ? " active" : "");
  };

  return (
    <>
      <header className="header" id="header">
        <div className="container header-content">
          <Link to="/" className="logo" aria-label="Pineda Dental Clinic Home">
            <span className="logo-text">Pineda Dental Clinic</span>
          </Link>

          <nav className="nav" aria-label="Main navigation">
            <Link to="/" className={getNavClass("/")}>
              Home
            </Link>
            <Link to="/services" className={getNavClass("/services")}>
              Services
            </Link>
            <Link to="/team" className={getNavClass("/team")}>
              Our Team
            </Link>
            <Link to="/contact" className={getNavClass("/contact")}>
              Contact
            </Link>
          </nav>
          <div className="header-actions">
            <a href="tel:09123456789" className="btn btn-emergency">
              <svg
                className="icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.15.5.42 1.62.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c1.19.28 2.31.55 2.81.7A2 2 0 0 1 22 16.92z"></path>
              </svg>
              Emergency
            </a>
            <a href="tel:09123456789" className="btn btn-primary">
              <svg
                className="icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.15.5.42 1.62.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c1.19.28 2.31.55 2.81.7A2 2 0 0 1 22 16.92z"></path>
              </svg>
              Call to Book 0992-838-0952
            </a>
          </div>
          <button
            className="mobile-menu-btn"
            id="mobileMenuBtn"
            aria-label="Toggle mobile menu"
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <svg
              className="icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>
        </div>
      </header>
      <div
        className={`mobile-menu${mobileMenuOpen ? " active" : ""}`}
        id="mobileMenu"
      >
        <Link
          to="/"
          className={getMobileNavClass("/")}
          onClick={() => setMobileMenuOpen(false)}
        >
          Home
        </Link>
        <Link
          to="/services"
          className={getMobileNavClass("/services")}
          onClick={() => setMobileMenuOpen(false)}
        >
          Services
        </Link>
        <Link
          to="/team"
          className={getMobileNavClass("/team")}
          onClick={() => setMobileMenuOpen(false)}
        >
          Our Team
        </Link>
        <Link
          to="/contact"
          className={getMobileNavClass("/contact")}
          onClick={() => setMobileMenuOpen(false)}
        >
          Contact
        </Link>
        <Link
          to="/booking"
          className="btn btn-primary mobile-cta"
          onClick={() => setMobileMenuOpen(false)}
        >
          Book Appointment
        </Link>
      </div>
    </>
  );
}

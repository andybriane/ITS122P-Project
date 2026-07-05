import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import authService from '../services/authService';

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path) => location.pathname === path;

  const handleLogout = async (e) => {
    e.preventDefault();
    await authService.logout(); // deletes the token on the backend + clears localStorage
    navigate('/login');
  };

  const navItems = [
    { to: '/dashboard', nav: 'overview', label: 'Overview', icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="7" height="7"></rect>
        <rect x="14" y="3" width="7" height="7"></rect>
        <rect x="14" y="14" width="7" height="7"></rect>
        <rect x="3" y="14" width="7" height="7"></rect>
      </svg>
    )},
    { to: '/dashboard/calendar', nav: 'calendar', label: 'Calendar', icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
        <line x1="16" y1="2" x2="16" y2="6"></line>
        <line x1="8" y1="2" x2="8" y2="6"></line>
        <line x1="3" y1="10" x2="21" y2="10"></line>
      </svg>
    )},
    { to: '/dashboard/patients', nav: 'patients', label: 'Patient Hub', icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
        <circle cx="9" cy="7" r="4"></circle>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
      </svg>
    )},
    { to: '/dashboard/labs', nav: 'labs', label: 'Lab Results', icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path>
        <polyline points="14 2 14 8 20 8"></polyline>
        <line x1="16" y1="13" x2="8" y2="13"></line>
        <line x1="16" y1="17" x2="8" y2="17"></line>
        <polyline points="10 9 9 9 8 9"></polyline>
      </svg>
    )},
    { to: '/dashboard/billing', nav: 'billing', label: 'Billing', icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="12" y1="1" x2="12" y2="23"></line>
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
      </svg>
    )},
    { to: '/dashboard/staff', nav: 'staff', label: 'Staff', icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
        <circle cx="9" cy="7" r="4"></circle>
        <line x1="19" y1="8" x2="19" y2="14"></line>
        <line x1="22" y1="11" x2="16" y2="11"></line>
      </svg>
    )},
  ];

  return (
    <>
      <aside className={`sidebar${isOpen ? ' active' : ''}`} id="sidebar">
        <div className="sidebar-header">
          {/* 🚨 UPDATED LOGO BRANDING 🚨 */}
          <Link to="/" className="sidebar-logo" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', textAlign: 'center' }}>
            <svg className="sidebar-logo-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '32px', height: '32px' }}>
              <path d="M12 2C8.5 2 6 4 6 7c0 2 1 3 1 5s-1 4-1 6c0 3 2 4 4 4 1.5 0 2-1 2-2s.5-2 2-2 2 1 2 2 .5 2 2 2c2 0 4-1 4-4 0-2-1-4-1-6s1-3 1-5c0-3-2.5-5-6-5z"/>
            </svg>
            <span style={{ fontSize: '1rem', lineHeight: '1.2' }}>Pineda Dental<br/>Clinic</span>
          </Link>
        </div>
        <nav className="sidebar-nav" aria-label="Dashboard navigation">
          {navItems.map((item) => (
            <Link
              key={item.nav}
              to={item.to}
              className={`sidebar-link${isActive(item.to) ? ' active' : ''}`}
              data-nav={item.nav}
              onClick={() => setIsOpen(false)}
            >
              {item.icon}
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="sidebar-footer">
          <a href="#" className="sidebar-link logout" onClick={handleLogout}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
            Logout
          </a>
        </div>
      </aside>
      <div
        className={`sidebar-overlay${isOpen ? ' active' : ''}`}
        id="sidebarOverlay"
        onClick={() => setIsOpen(false)}
      />
    </>
  );
}
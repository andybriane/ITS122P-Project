import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useClinic } from '../context/ClinicContext';
import { useTheme } from '../context/ThemeContext';

export default function DashboardHeader({ title, subtitle, search, action }) {
  const { isDarkMode, toggleTheme } = useTheme();
  const [showNotifications, setShowNotifications] = useState(false);
  const { staff } = useClinic();
  
  // Use Dr. Pineda as the default signed-in user
  const currentUser = staff && staff.length > 0 ? staff[0] : null;

  // ==========================================
  // NOTIFICATION STATE (To be replaced by API)
  // ==========================================
  const [notifications, setNotifications] = useState([
    { id: 1, title: 'Appointment Today', message: 'Maria Santos at 9:00 AM', isRead: false },
    { id: 2, title: 'Pending Lab Result', message: 'Action required for Juan Dela Cruz', isRead: false }
  ]);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const handleMarkAllRead = () => {
    // Updates UI state instantly
    setNotifications(notifications.map(n => ({ ...n, isRead: true })));
    // TODO: Send PUT request to PHP backend here to mark as read
  };

  const handleClearAll = () => {
    // Instantly clears UI to keep the dashboard clean
    setNotifications([]);
    // TODO: Send PATCH request to PHP backend here to set deleted_at = NOW()
  };

  return (
    <header className="dashboard-header">
      <div className="header-left">
        <button className="dashboard-menu-btn" aria-label="Open sidebar" onClick={() => document.querySelector('.sidebar')?.classList.toggle('active')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>
        <div>
          <h1>{title}</h1>
          <p className="header-subtitle">{subtitle}</p>
        </div>
      </div>
      
      <div className="header-right" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
        {search && <div className="header-search-container">{search}</div>}
        
        {/* Dark Mode Toggle */}
        <button className="btn btn-icon" onClick={toggleTheme} aria-label="Toggle Dark Mode" title="Toggle Dark Mode">
          {isDarkMode ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
              <circle cx="12" cy="12" r="5"></circle>
              <line x1="12" y1="1" x2="12" y2="3"></line>
              <line x1="12" y1="21" x2="12" y2="23"></line>
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
              <line x1="1" y1="12" x2="3" y2="12"></line>
              <line x1="21" y1="12" x2="23" y2="12"></line>
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
            </svg>
          )}
        </button>

        {/* Notifications */}
        <div style={{ position: 'relative' }}>
          <button className="btn btn-icon" aria-label="Notifications" onClick={() => setShowNotifications(!showNotifications)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
            </svg>
            {/* Only show the red dot if there are UNREAD notifications */}
            {unreadCount > 0 && (
              <span style={{ position: 'absolute', top: '4px', right: '4px', width: '8px', height: '8px', background: 'var(--color-emergency, #ef4444)', borderRadius: '50%' }}></span>
            )}
          </button>
          
          {showNotifications && (
            <div style={{ position: 'absolute', top: '100%', right: 0, width: '320px', background: 'var(--bg-card)', border: '1px solid var(--dash-border)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-lg)', zIndex: 100, padding: 'var(--space-4)', marginTop: 'var(--space-2)' }}>
              
              {/* Dropdown Header with Actions */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--dash-border)', paddingBottom: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
                <h4 style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--text-main)', fontWeight: 'bold' }}>
                  Alerts {unreadCount > 0 && `(${unreadCount})`}
                </h4>
                
                {notifications.length > 0 && (
                  <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                    {/* Mark All Read Button */}
                    <button 
                      onClick={handleMarkAllRead} 
                      title="Mark all as read"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', padding: '4px' }}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16" className="hover:text-blue-500 transition-colors">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    </button>
                    
                    {/* Trash / Clear All Button */}
                    <button 
                      onClick={handleClearAll} 
                      title="Clear notifications"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', padding: '4px' }}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16" className="hover:text-red-500 transition-colors">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                      </svg>
                    </button>
                  </div>
                )}
              </div>

              {/* Notification List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', maxHeight: '300px', overflowY: 'auto' }}>
                {notifications.length === 0 ? (
                  <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 'var(--space-4) 0', fontSize: 'var(--text-xs)' }}>
                    No active alerts.
                  </div>
                ) : (
                  notifications.map(notif => (
                    <div key={notif.id} style={{ 
                      fontSize: 'var(--text-xs)', 
                      display: 'flex', 
                      flexDirection: 'column', 
                      gap: 'var(--space-1)',
                      opacity: notif.isRead ? 0.6 : 1,
                      padding: 'var(--space-2)',
                      borderRadius: 'var(--radius-sm)',
                      background: notif.isRead ? 'transparent' : 'var(--bg-hover, rgba(0,0,0,0.02))'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {!notif.isRead && <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--color-primary)' }}></span>}
                        <strong style={{ color: 'var(--text-main)' }}>{notif.title}</strong>
                      </div>
                      <span style={{ color: 'var(--text-muted)', paddingLeft: notif.isRead ? '0' : '12px' }}>{notif.message}</span>
                    </div>
                  ))
                )}
              </div>

            </div>
          )}
        </div>

        {/* Avatar */}
        <Link to="/dashboard/staff" className="user-avatar" title={currentUser?.name || "Staff Profile"}>
          <img src="https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=100&h=100&fit=crop&crop=face" alt={currentUser?.name || "Staff"} style={{ border: '2px solid var(--color-primary)' }} />
        </Link>
        
        {action && (
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {action}
          </div>
        )}
      </div>
    </header>
  );
}
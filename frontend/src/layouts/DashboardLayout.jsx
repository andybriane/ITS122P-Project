import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { ThemeProvider, useTheme } from '../context/ThemeContext';
// 🚨 1. IMPORT THE PAGE TRANSITION WRAPPER 🚨
import PageTransition from '../components/PageTransition'; 

function DashboardContent({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const { isDarkMode } = useTheme();

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  // Close sidebar on mobile when clicking outside
  useEffect(() => {
    const handleClick = (e) => {
      if (window.innerWidth > 768) return;
      const sidebar = document.querySelector('.sidebar');
      const menuBtn = document.getElementById('dashboardMenuBtn');
      if (!sidebar?.classList.contains('active')) return;
      if (sidebar?.contains(e.target)) return;
      if (menuBtn?.contains(e.target)) return;
      
      // If clicked outside, remove active class (or set state if you use it in Sidebar)
      sidebar.classList.remove('active'); 
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  return (
    <div className={`dashboard-page dashboard-layout ${isDarkMode ? 'dark' : ''}`}>
      <Sidebar />
      <main className="dashboard-main">
        {/* 🚨 2. WRAP THE DASHBOARD CHILDREN 🚨 */}
        <PageTransition>
          {children}
        </PageTransition>
      </main>
    </div>
  );
}

export default function DashboardLayout({ children }) {
  return (
    <ThemeProvider>
      <DashboardContent>{children}</DashboardContent>
    </ThemeProvider>
  );
}
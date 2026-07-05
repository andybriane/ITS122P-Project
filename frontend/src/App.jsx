import { Routes, Route } from 'react-router-dom';
import Home from './pages/public/Home';
import Services from './pages/public/Services';
import Team from './pages/public/Team';
import Contact from './pages/public/Contact';
import Booking from './pages/public/Booking';
import Login from './pages/auth/Login';
import Overview from './pages/dashboard/Overview';
import AdminBooking from './pages/dashboard/AdminBooking';
import Calendar from './pages/dashboard/Calendar';
import Patients from './pages/dashboard/Patients';
import Labs from './pages/dashboard/Labs';
import Billing from './pages/dashboard/Billing';
import Staff from './pages/dashboard/Staff';
import { ClinicProvider } from './context/ClinicContext';
import ProtectedRoute from './components/ProtectedRoute';

export default function App() {
  return (
    <ClinicProvider>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Home />} />
        <Route path="/services" element={<Services />} />
        <Route path="/team" element={<Team />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/booking" element={<Booking />} />

        {/* Auth Routes */}
        <Route path="/login" element={<Login />} />

        {/* Dashboard Routes (protected) */}
        <Route path="/dashboard" element={<ProtectedRoute><Overview /></ProtectedRoute>} />
        <Route path="/dashboard/book" element={<ProtectedRoute><AdminBooking /></ProtectedRoute>} />
        <Route path="/dashboard/calendar" element={<ProtectedRoute><Calendar /></ProtectedRoute>} />
        <Route path="/dashboard/patients" element={<ProtectedRoute><Patients /></ProtectedRoute>} />
        <Route path="/dashboard/labs" element={<ProtectedRoute><Labs /></ProtectedRoute>} />
        <Route path="/dashboard/billing" element={<ProtectedRoute><Billing /></ProtectedRoute>} />
        <Route path="/dashboard/staff" element={<ProtectedRoute><Staff /></ProtectedRoute>} />
      </Routes>
    </ClinicProvider>
  );
}
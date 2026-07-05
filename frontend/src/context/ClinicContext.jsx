import React, { createContext, useContext, useState, useEffect } from 'react';
import appointmentService from '../services/appointmentService';
import patientService from '../services/patientService';
import staffService from '../services/staffService';
import labsService from '../services/labsService';

const ClinicContext = createContext();
export const useClinic = () => useContext(ClinicContext);

export const ClinicProvider = ({ children }) => {
  const [appointments, setAppointments] = useState([]);
  const [patients, setPatients] = useState([]);
  const [labs, setLabs] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [staff, setStaff] = useState([]);
  const [notifications, setNotifications] = useState([]);

  // ==========================================
  // LOADERS — fetch real data from PHP backend
  // ==========================================

  const loadAppointments = async () => {
    try {
      const result = await appointmentService.getAll();
      if (result.success) {
        const mapped = result.data.map((a) => ({
          ...a,
          date: a.appointment_date,
          time: a.appointment_time,
          patientName: `${a.first_name} ${a.last_name}`,
          service: a.patient_notes || 'Dental Appointment',
          doctor: a.doctor_name || 'TBA',
        }));
        setAppointments(mapped);
      }
    } catch (err) {
      console.error('Could not load appointments:', err);
    }
  };

  const loadPatients = async () => {
    try {
      const result = await patientService.getAll();
      if (result.success) {
        setPatients(result.data);
      }
    } catch (err) {
      console.error('Could not load patients:', err);
    }
  };

  const loadLabs = async () => {
    try {
      const result = await labsService.getAll();
      if (result.success) {
        setLabs(result.data);
      }
    } catch (err) {
      console.error('Could not load labs:', err);
    }
  };

  const loadStaff = async () => {
    try {
      const result = await staffService.getAll();
      if (result.success) {
        setStaff(result.data);
      }
    } catch (err) {
      console.error('Could not load staff:', err);
    }
  };

  // Load everything on mount, refresh appointments every 30s
  useEffect(() => {
    loadAppointments();
    loadPatients();
    loadLabs();
    loadStaff();

    const interval = setInterval(loadAppointments, 30000);
    return () => clearInterval(interval);
  }, []);

  // ==========================================
  // NOTIFICATIONS (client-side for now)
  // ==========================================

  const addNotification = (type, message) => {
    const newNotif = {
      id: Date.now(),
      type,
      message,
      is_read: false,
      created_at: new Date().toISOString(),
    };
    setNotifications((prev) => [newNotif, ...prev]);
  };

  const markAllNotificationsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  // ==========================================
  // APPOINTMENTS
  // ==========================================

  const addAppointment = (newAppt) => {
    setAppointments((prev) => [...prev, newAppt]);
    addNotification('booking', `New appointment booked for ${newAppt.patientName}`);
  };

  const updateAppointmentStatus = async (id, newStatus) => {
    try {
      await appointmentService.update(id, { status: newStatus });
      setAppointments((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: newStatus } : a))
      );
    } catch (err) {
      console.error('Failed to update appointment status:', err);
    }
  };

  const removeAppointment = async (id) => {
    try {
      await appointmentService.remove(id);
      setAppointments((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      console.error('Failed to remove appointment:', err);
    }
  };

  // ==========================================
  // PATIENTS
  // ==========================================

  const addPatient = async (data) => {
    try {
      const result = await patientService.create(data);
      if (result.success) {
        setPatients((prev) => [...prev, result.data]);
        if (data.is_high_risk) {
          addNotification('emergency', `🚨 MEDICAL ALERT: ${data.first_name} ${data.last_name} flagged as High-Risk.`);
        }
        return result;
      }
    } catch (err) {
      console.error('Failed to add patient:', err);
    }
  };

  const updatePatient = async (id, data) => {
    try {
      const result = await patientService.update(id, data);
      if (result.success) {
        setPatients((prev) =>
          prev.map((p) => (p.id === id ? { ...p, ...result.data } : p))
        );
        return result;
      }
    } catch (err) {
      console.error('Failed to update patient:', err);
    }
  };

  const removePatient = async (id) => {
    try {
      await patientService.remove(id);
      setPatients((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      console.error('Failed to remove patient:', err);
    }
  };

  // ==========================================
  // LABS
  // ==========================================

  const addLab = async (data) => {
    try {
      const result = await labsService.upload(data);
      if (result.success) {
        setLabs((prev) => [result.data, ...prev]);
        addNotification('upload', `New lab result uploaded.`);
        return result;
      }
    } catch (err) {
      console.error('Failed to upload lab:', err);
    }
  };

  const updateLabStatus = async (id, status) => {
    try {
      const result = await labsService.update(id, { status });
      if (result.success) {
        setLabs((prev) =>
          prev.map((l) => (l.id === id ? { ...l, status } : l))
        );
        if (status === 'Delayed') {
          addNotification('warning', `⚠️ Lab result delayed.`);
        }
      }
    } catch (err) {
      console.error('Failed to update lab status:', err);
    }
  };

  const updateLabNotes = async (id, doctorNotes) => {
    try {
      await labsService.update(id, { doctorNotes });
      setLabs((prev) =>
        prev.map((l) => (l.id === id ? { ...l, doctor_notes: doctorNotes } : l))
      );
    } catch (err) {
      console.error('Failed to update lab notes:', err);
    }
  };

  const removeLab = async (id) => {
    try {
      await labsService.remove(id);
      setLabs((prev) => prev.filter((l) => l.id !== id));
    } catch (err) {
      console.error('Failed to remove lab:', err);
    }
  };

  // ==========================================
  // INVOICES (still local until invoiceService wired)
  // ==========================================

  const addInvoice = (newInvoice) => {
    const updated = { ...newInvoice, id: `inv${Date.now()}` };
    setInvoices((prev) => [...prev, updated]);
    addNotification('payment', `New invoice created.`);
  };

  const updateInvoiceStatus = (id, newStatus) => {
    setInvoices((prev) =>
      prev.map((i) => (i.id === id ? { ...i, status: newStatus } : i))
    );
  };

  // ==========================================
  // STAFF
  // ==========================================

  const addStaff = async (data) => {
    try {
      const result = await staffService.invite(data);
      if (result.success) {
        await loadStaff();
        return result;
      }
    } catch (err) {
      console.error('Failed to add staff:', err);
    }
  };

  const removeStaff = async (id) => {
    try {
      await staffService.remove(id);
      setStaff((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      console.error('Failed to remove staff:', err);
    }
  };

  const addDayOff = async (userId, date) => {
    try {
      await staffService.addDayOff(userId, date);
      setStaff((prev) =>
        prev.map((s) =>
          s.id === userId
            ? { ...s, daysOff: [...(s.daysOff || []), date] }
            : s
        )
      );
    } catch (err) {
      console.error('Failed to add day off:', err);
    }
  };

  // ==========================================
  // CONTEXT VALUE
  // ==========================================

  const value = {
    // Appointments
    appointments,
    addAppointment,
    updateAppointmentStatus,
    removeAppointment,
    setAppointments,
    loadAppointments,

    // Patients
    patients,
    addPatient,
    updatePatient,
    removePatient,
    loadPatients,

    // Labs
    labs,
    addLab,
    updateLabStatus,
    updateLabNotes,
    removeLab,
    loadLabs,

    // Invoices
    invoices,
    addInvoice,
    updateInvoiceStatus,

    // Staff
    staff,
    addStaff,
    removeStaff,
    addDayOff,
    loadStaff,

    // Notifications
    notifications,
    addNotification,
    markAllNotificationsRead,
    clearAllNotifications,
  };

  return (
    <ClinicContext.Provider value={value}>
      {children}
    </ClinicContext.Provider>
  );
};
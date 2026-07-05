// src/hooks/useAppointmentEmail.js
import { useState } from 'react';
import { updateAppointmentStatus } from '../services/appointmentService';

export function useAppointmentEmail() {
  const [sending, setSending] = useState(false);

  const updateAndNotify = async (id, status, patientData) => {
    setSending(true);
    try {
      const result = await updateAppointmentStatus(id, status, patientData);
      return result;
    } finally {
      setSending(false);
    }
  };

  return { updateAndNotify, sending };
}
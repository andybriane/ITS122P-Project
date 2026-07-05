import { useState, useEffect } from 'react';

export function isClinicOpen(date = new Date()) {
  // Convert time to the clinic's local timezone (Philippine Time)
  // This ensures accuracy regardless of the user's device timezone.
  const clinicTimeStr = date.toLocaleString('en-US', { timeZone: 'Asia/Manila' });
  const clinicDate = new Date(clinicTimeStr);
  
  const day = clinicDate.getDay();
  const hour = clinicDate.getHours();
  
  return (day >= 1 && day <= 6) && (hour >= 9 && hour < 16);
}

export default function useClinicStatus() {
  const [isOpen, setIsOpen] = useState(() => isClinicOpen());

  useEffect(() => {
    const interval = setInterval(() => {
      setIsOpen(isClinicOpen());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  return isOpen;
}

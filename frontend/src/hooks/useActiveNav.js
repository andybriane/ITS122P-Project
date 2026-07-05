import { useState, useEffect } from 'react';

export default function useActiveNav(navKey) {
  const [activeNav, setActiveNav] = useState(navKey);

  useEffect(() => {
    setActiveNav(navKey);
  }, [navKey]);

  return activeNav;
}

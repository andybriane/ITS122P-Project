import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export default function PageTransition({ children }) {
  const location = useLocation();

  // This automatically scrolls the user to the top of the page 
  // whenever they navigate to a new page!
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [location.pathname]);

  return (
    /* The 'key' prop is a Senior React trick. 
      It forces React to re-trigger the CSS animation every single time the URL changes!
    */
    <div key={location.pathname} className="animate-page-in">
      {children}
    </div>
  );
}
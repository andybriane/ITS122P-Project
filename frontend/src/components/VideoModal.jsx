import { useEffect } from 'react';

export default function VideoModal({ isOpen, onClose }) {
  // Lock the background scrolling when the modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    /* 1. THE FROSTED GLASS OVERLAY */
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 sm:p-8"
      style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh' }}
    >
      
      {/* 2. INVISIBLE CLICK-CATCHER TO CLOSE */}
      <div 
        className="absolute inset-0 cursor-pointer" 
        onClick={onClose}
        title="Click outside to close"
      ></div>

      {/* 3. THE VIDEO CONTAINER */}
      <div className="relative z-10 w-full max-w-5xl aspect-video bg-black rounded-2xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)]">
        
        {/* FLOATING CLOSE BUTTON */}
        <button 
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 z-20 flex items-center justify-center w-10 h-10 lg:w-12 lg:h-12 bg-black/50 text-white hover:text-red-500 rounded-full text-2xl lg:text-3xl font-bold transition-all"
        >
          &times;
        </button>

        {/* YOUTUBE PLAYER */}
        <iframe 
          src="https://www.youtube.com/embed/_5x-zWOJk7k?autoplay=1&rel=0" 
          title="DentalCare Virtual Tour"
          className="absolute top-0 left-0 w-full h-full border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
          allowFullScreen
        ></iframe>
        
      </div>
    </div>
  );
}
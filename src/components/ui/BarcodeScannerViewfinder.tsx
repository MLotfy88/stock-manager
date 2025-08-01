import React from 'react';

export const BarcodeScannerViewfinder = () => {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <div className="relative w-3/4 max-w-md h-1/2">
        {/* Overlay */}
        <div className="absolute inset-0 bg-black bg-opacity-50" style={{ clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 0%, 10% 10%, 10% 90%, 90% 90%, 90% 10%, 10% 10%)' }}></div>
        
        {/* Corner brackets */}
        <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-red-500 rounded-tl-lg"></div>
        <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-red-500 rounded-tr-lg"></div>
        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-red-500 rounded-bl-lg"></div>
        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-red-500 rounded-br-lg"></div>

        {/* Laser line */}
        <div className="absolute top-1/2 left-2 right-2 h-0.5 bg-red-500 animate-laser-scan"></div>
      </div>
    </div>
  );
};

// Add this animation to your global CSS file (e.g., src/index.css)
/*
@keyframes laser-scan {
  0% { transform: translateY(-50%); }
  50% { transform: translateY(50%); }
  100% { transform: translateY(-50%); }
}
.animate-laser-scan {
  animation: laser-scan 2s infinite;
}
*/

import React from 'react';
import { cn } from '@/lib/utils';

interface BarcodeScannerViewfinderProps {
  scanCycle: number;
}

export const BarcodeScannerViewfinder: React.FC<BarcodeScannerViewfinderProps> = ({ scanCycle }) => {
  // Create a back-and-forth motion. e.g., 0,1,2,3,4,5,4,3,2,1,0...
  const cyclePosition = scanCycle % 10;
  const laserPosition = cyclePosition < 5 ? cyclePosition * 20 : (10 - cyclePosition) * 20;

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <div className="relative w-3/4 max-w-md h-1/2">
        {/* Bounding box with pulsing border */}
        <div className="absolute inset-0 animate-pulse-border rounded-lg" />
        
        {/* Overlay */}
        <div 
          className="absolute inset-0 bg-black bg-opacity-50" 
          style={{ 
            clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 0%, 10% 10%, 10% 90%, 90% 90%, 90% 10%, 10% 10%)' 
          }}
        />
        
        {/* Corner brackets */}
        <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-red-500 rounded-tl-lg"></div>
        <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-red-500 rounded-tr-lg"></div>
        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-red-500 rounded-bl-lg"></div>
        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-red-500 rounded-br-lg"></div>

        {/* Laser line */}
        <div 
          className="absolute left-2 right-2 h-0.5 bg-red-500 laser-scan-line"
          style={{ top: `${laserPosition}%` }}
        ></div>
      </div>
    </div>
  );
};

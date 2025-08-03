import React from 'react';
import { Button } from '@/components/ui/button';
import { Camera } from 'lucide-react';

interface BarcodeScannerViewfinderProps {
  onCapture: () => void;
}

export const BarcodeScannerViewfinder: React.FC<BarcodeScannerViewfinderProps> = ({ onCapture }) => {
  return (
    <>
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="relative w-11/12 max-w-2xl h-1/4">
          <div className="absolute inset-0 border-4 border-white/50 rounded-lg" />
          <div 
            className="absolute inset-0 bg-black bg-opacity-50" 
            style={{ 
              clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 0%, 5% 5%, 5% 95%, 95% 95%, 95% 5%, 5% 5%)' 
            }}
          />
          <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-red-500 animate-laser-scan" />
        </div>
      </div>
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[51]">
        <Button onClick={onCapture} size="icon" className="rounded-full h-20 w-20 border-4 border-white bg-red-500/80 hover:bg-red-500">
          <Camera className="h-10 w-10 text-white" />
        </Button>
      </div>
    </>
  );
};

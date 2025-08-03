import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Zap, ZapOff } from 'lucide-react';

interface BarcodeScannerViewfinderProps {
  scanCycle: number;
  isTorchOn: boolean;
  toggleTorch: () => void;
}

export const BarcodeScannerViewfinder: React.FC<BarcodeScannerViewfinderProps> = ({ scanCycle, isTorchOn, toggleTorch }) => {
  const cyclePosition = scanCycle % 20;
  const laserPosition = cyclePosition < 10 ? cyclePosition * 10 : (20 - cyclePosition) * 10;

  return (
    <>
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="relative w-11/12 max-w-2xl h-1/4">
          <div className="absolute inset-0 animate-pulse-border rounded-lg" />
          <div 
            className="absolute inset-0 bg-black bg-opacity-50" 
            style={{ 
              clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 0%, 10% 10%, 10% 90%, 90% 90%, 90% 10%, 10% 10%)' 
            }}
          />
          <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-red-500 rounded-tl-lg"></div>
          <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-red-500 rounded-tr-lg"></div>
          <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-red-500 rounded-bl-lg"></div>
          <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-red-500 rounded-br-lg"></div>
          <div 
            className="absolute left-2 right-2 h-0.5 bg-red-500 laser-scan-line"
            style={{ top: `${laserPosition}%` }}
          ></div>
        </div>
      </div>
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[51]">
        <Button onClick={toggleTorch} size="icon" className="rounded-full h-14 w-14 bg-black/50 hover:bg-black/70">
          {isTorchOn ? <ZapOff className="h-7 w-7 text-white" /> : <Zap className="h-7 w-7 text-white" />}
        </Button>
      </div>
    </>
  );
};

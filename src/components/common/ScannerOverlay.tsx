import React from 'react';
import { X, Zap, ZapOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ScannerOverlayProps {
    videoRef: React.RefObject<HTMLVideoElement>;
    isActive: boolean;
    onClose: () => void;
    title?: string;
    scannedCount?: number;
    lastScanned?: string;
    isFlashAvailable?: boolean;
    isFlashOn?: boolean;
    onToggleFlash?: () => void;
}

export const ScannerOverlay: React.FC<ScannerOverlayProps> = ({
    videoRef,
    isActive,
    onClose,
    title = "Scan Barcode",
    scannedCount,
    lastScanned,
    isFlashAvailable = false,
    isFlashOn = false,
    onToggleFlash
}) => {
    if (!isActive) return null;

    return (
        <div className="fixed inset-0 z-50 bg-black flex flex-col">
            {/* Header / Controls */}
            <div className="absolute top-0 left-0 right-0 z-20 p-4 flex justify-between items-start bg-gradient-to-b from-black/80 to-transparent pt-12 pb-8">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={onClose}
                    className="h-10 w-10 text-white hover:bg-white/20 rounded-full"
                >
                    <X className="h-6 w-6" />
                </Button>

                <div className="text-white text-center flex-1 pt-1">
                    <h2 className="font-semibold text-lg drop-shadow-md">{title}</h2>
                    {scannedCount !== undefined && (
                        <p className="text-xs text-green-400 font-medium">
                            Scanned Items: {scannedCount}
                        </p>
                    )}
                </div>

                {isFlashAvailable && (
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onToggleFlash}
                        className={cn(
                            "h-10 w-10 rounded-full text-white hover:bg-white/20",
                            isFlashOn && "text-yellow-400 bg-white/10"
                        )}
                    >
                        {isFlashOn ? <Zap className="h-6 w-6 fill-current" /> : <ZapOff className="h-6 w-6" />}
                    </Button>
                )}
                {!isFlashAvailable && <div className="w-10" />}
            </div>

            {/* Video Feed */}
            <div className="relative flex-1 bg-black overflow-hidden flex items-center justify-center">
                <video
                    ref={videoRef}
                    className="absolute inset-0 w-full h-full object-cover"
                    playsInline
                    muted
                    autoPlay
                />

                {/* Dark Overlay with Transparent Window */}
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute inset-0 bg-black/60"></div>
                    {/* The "Hole" - using clip-path could be complex for rounded corners, 
                        so instead we use a central box with a box-shadow that covers the rest.
                        Or simpler: top/bottom/left/right dark divs. 
                        Let's use a central div with a huge border or shadow.
                    */}
                    <div
                        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] max-w-sm aspect-[4/3] rounded-2xl border-2 border-white/50 bg-transparent shadow-[0_0_0_9999px_rgba(0,0,0,0.6)] overflow-hidden"
                    >
                        {/* Corner Markers */}
                        <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-green-500 rounded-tl-lg"></div>
                        <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-green-500 rounded-tr-lg"></div>
                        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-green-500 rounded-bl-lg"></div>
                        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-green-500 rounded-br-lg"></div>

                        {/* Red Laser Line Animation */}
                        <div className="absolute left-0 right-0 h-0.5 bg-red-600 shadow-[0_0_10px_2px_rgba(220,38,38,0.8)] animate-scan-laser top-0"></div>

                        {/* Guidance Text inside box */}
                        <div className="absolute bottom-4 left-0 right-0 text-center text-white/70 text-xs px-2">
                            Align barcode within frame
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer / Last Scanned */}
            <div className="bg-black/80 text-white p-4 pb-8 z-20 min-h-[100px]">
                {lastScanned ? (
                    <div className="bg-green-900/30 border border-green-500/50 rounded-lg p-3 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2">
                        <div className="bg-green-500/20 p-2 rounded-full">
                            <CheckIcon />
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <p className="font-medium text-sm truncate text-green-100">Scanned Successfully</p>
                            <p className="text-xs text-green-300 font-mono truncate">{lastScanned}</p>
                        </div>
                    </div>
                ) : (
                    <div className="text-center text-white/40 text-sm py-2">
                        Ready to scan...
                    </div>
                )}
            </div>

            <style>{`
                @keyframes scan-laser {
                    0% { top: 0%; opacity: 0; }
                    10% { opacity: 1; }
                    90% { opacity: 1; }
                    100% { top: 100%; opacity: 0; }
                }
                .animate-scan-laser {
                    animation: scan-laser 2s linear infinite;
                }
            `}</style>
        </div>
    );
};

const CheckIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-500"><polyline points="20 6 9 17 4 12"></polyline></svg>
);

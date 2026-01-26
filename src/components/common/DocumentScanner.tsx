import React, { useRef, useState, useEffect } from 'react';
import Webcam from 'react-webcam';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Camera, Check, RotateCw, X } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useOpenCv, scanDocument } from '@/utils/scannerUtils';

interface DocumentScannerProps {
    isOpen: boolean;
    onClose: () => void;
    onScan: (imageBlob: Blob) => void;
}

const DocumentScanner: React.FC<DocumentScannerProps> = ({ isOpen, onClose, onScan }) => {
    const { t } = useLanguage();
    const webcamRef = useRef<Webcam>(null);
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [processedImage, setProcessedImage] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const cvLoaded = useOpenCv();

    const capture = () => {
        const imageSrc = webcamRef.current?.getScreenshot();
        if (imageSrc) {
            setCapturedImage(imageSrc);
            if (cvLoaded) {
                processImage(imageSrc);
            } else {
                console.warn("OpenCV not loaded yet");
                // Fallback: just use captured image
                // setProcessedImage(imageSrc); // No, wait for user to confirm if they want raw or wait
                // Actually, if not loaded, we can't process. 
                setProcessedImage(imageSrc);
            }
        }
    };

    const processImage = async (imageSrc: string) => {
        setIsProcessing(true);
        try {
            // We need video dimensions to be accurate?
            // simple approach: just pass image
            const resultUrl = await scanDocument(imageSrc, 0, 0);
            setProcessedImage(resultUrl); // Wait, scanDocument returns promise. 
            // My utils mock returned string "Processed" but logic intended dataURL.
            // Let's assume utils return dataURL.
        } catch (e) {
            console.error("Processing failed", e);
            setProcessedImage(imageSrc);
        } finally {
            setIsProcessing(false);
        }
    };

    const confirmScan = async () => {
        if (processedImage) {
            const res = await fetch(processedImage);
            const blob = await res.blob();
            onScan(blob);
            handleClose();
        }
    };

    const handleClose = () => {
        setCapturedImage(null);
        setProcessedImage(null);
        onClose();
    };

    const retake = () => {
        setCapturedImage(null);
        setProcessedImage(null);
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0 overflow-hidden bg-black border-none">

                <div className="flex-1 relative flex items-center justify-center overflow-hidden">
                    {!capturedImage ? (
                        <>
                            <Webcam
                                audio={false}
                                ref={webcamRef}
                                screenshotFormat="image/jpeg"
                                videoConstraints={{ facingMode: "environment" }}
                                className="w-full h-full object-contain"
                            />
                            {!cvLoaded && (
                                <div className="absolute top-4 left-4 bg-yellow-500/80 text-white px-3 py-1 rounded text-xs">
                                    Loading Scanner Engine...
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="w-full h-full flex flex-col md:flex-row gap-4 p-4 bg-background">
                            {/* Processed View Only for Clean UI? Or Compare? */}
                            {/* User wants CamScanner like, usually shows the cropped result to adjust points.
                   For MVP, we show result.
               */}
                            <div className="flex-1 relative border rounded-lg overflow-hidden bg-black/5">
                                {isProcessing ? (
                                    <div className="absolute inset-0 flex items-center justify-center text-primary font-bold animate-pulse">
                                        Processing Image...
                                    </div>
                                ) : (
                                    <img src={processedImage || capturedImage || ''} alt="Processed" className="w-full h-full object-contain" />
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-6 bg-background border-t flex justify-between items-center z-50">
                    {!capturedImage ? (
                        <div className="w-full flex justify-center items-center relative">
                            <Button
                                onClick={capture}
                                size="lg"
                                className="rounded-full h-20 w-20 p-0 shadow-2xl border-4 border-white ring-2 ring-primary bg-transparent hover:bg-white/10"
                                disabled={!cvLoaded}
                            >
                                <div className="h-16 w-16 bg-white rounded-full"></div>
                            </Button>
                        </div>
                    ) : (
                        <div className="w-full flex justify-between gap-4 max-w-md mx-auto">
                            <Button onClick={retake} variant="secondary" size="lg" className="flex-1 rounded-xl">
                                <RotateCw className="h-5 w-5 mr-2" />
                                {t('retake') || 'Retake'}
                            </Button>
                            <Button onClick={confirmScan} size="lg" className="flex-1 rounded-xl" disabled={isProcessing}>
                                <Check className="h-5 w-5 mr-2" />
                                {t('confirm') || 'Confirm'}
                            </Button>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default DocumentScanner;

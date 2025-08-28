import { useState, useRef, useEffect, useCallback } from 'react';

// Define the structure of the BarcodeDetector, as it might not be in all TypeScript lib versions
declare global {
  interface Window {
    BarcodeDetector: new (options?: { formats: string[] }) => BarcodeDetector;
  }
  interface BarcodeDetector {
    detect(image: ImageBitmapSource): Promise<DetectedBarcode[]>;
  }
  interface DetectedBarcode {
    rawValue: string;
    format: string;
  }
}

interface UseBarcodeScannerProps {
  onScanSuccess: (text: string) => void;
  onScanFailure?: (error: Error) => void;
}

export const useBarcodeScanner = (props: UseBarcodeScannerProps) => {
  const [isScannerActive, setIsScannerActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const barcodeDetector = useRef<BarcodeDetector | null>(null);

  const callbackRef = useRef(props);
  useEffect(() => {
    callbackRef.current = props;
  }, [props]);

  useEffect(() => {
    if (!('BarcodeDetector' in window)) {
      setIsSupported(false);
      setError("Barcode Detector API is not supported in this browser.");
      return;
    }
    barcodeDetector.current = new window.BarcodeDetector({
      formats: ['code_128', 'ean_13', 'code_39', 'ean_8', 'upc_a', 'upc_e', 'itf', 'codabar'],
    });
  }, []);

  const captureAndDecode = useCallback(async () => {
    if (!videoRef.current || videoRef.current.readyState !== videoRef.current.HAVE_ENOUGH_DATA) {
      callbackRef.current.onScanFailure?.(new Error("Video not ready."));
      return;
    }
    if (!barcodeDetector.current) {
      callbackRef.current.onScanFailure?.(new Error("Barcode Detector not initialized."));
      return;
    }

    try {
      const barcodes = await barcodeDetector.current.detect(videoRef.current);
      if (barcodes.length > 0) {
        callbackRef.current.onScanSuccess(barcodes[0].rawValue);
      } else {
        callbackRef.current.onScanFailure?.(new Error("No barcode detected."));
      }
    } catch (err) {
      callbackRef.current.onScanFailure?.(err as Error);
    }
  }, []);

  useEffect(() => {
    let stream: MediaStream | null = null;
    const startCamera = async () => {
      try {
        setError(null);
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'environment',
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      } catch (err: any) {
        setError(`Failed to start camera: ${err.message}`);
        setIsScannerActive(false);
      }
    };

    if (isScannerActive) {
      startCamera();
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, [isScannerActive]);

  const startScanner = useCallback(() => {
    if (!isSupported) {
      alert("Barcode scanning is not supported on this browser.");
      return;
    }
    setIsScannerActive(true);
  }, [isSupported]);
  
  const stopScanner = useCallback(() => setIsScannerActive(false), []);

  return {
    videoRef,
    isScannerActive,
    error,
    startScanner,
    stopScanner,
    captureAndDecode,
  };
};

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  BrowserMultiFormatReader,
  NotFoundException,
  DecodeHintType,
  BarcodeFormat,
} from '@zxing/library';

// Define the props for the hook
interface UseBarcodeScannerProps {
  onScanSuccess: (text: string) => void;
  onScanFailure?: (error: Error) => void;
}

export const useBarcodeScanner = ({
  onScanSuccess,
  onScanFailure,
}: UseBarcodeScannerProps) => {
  const [isScannerActive, setIsScannerActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const codeReader = useRef<BrowserMultiFormatReader | null>(null);

  // Setup the barcode reader
  useEffect(() => {
    const hints = new Map();
    const formats = [
      BarcodeFormat.CODE_128,
      BarcodeFormat.CODE_39,
      BarcodeFormat.EAN_13,
      BarcodeFormat.EAN_8,
      BarcodeFormat.UPC_A,
      BarcodeFormat.UPC_E,
      BarcodeFormat.DATA_MATRIX,
      BarcodeFormat.QR_CODE,
    ];
    hints.set(DecodeHintType.POSSIBLE_FORMATS, formats);
    hints.set(DecodeHintType.TRY_HARDER, true);

    codeReader.current = new BrowserMultiFormatReader(hints);

    return () => {
      stopScanner();
    };
  }, []);

  const startScanner = useCallback(async () => {
    if (!videoRef.current) return;

    try {
      setError(null);
      setIsScannerActive(true);
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 },
          // @ts-ignore - This is a valid constraint, but not in all TS lib versions
          advanced: [{ autoFocus: 'continuous' }]
        },
      });

      videoRef.current.srcObject = stream;
      await videoRef.current.play();

      if (codeReader.current && videoRef.current) {
        codeReader.current.decodeFromStream(videoRef.current.srcObject, videoRef.current, (result, err) => {
          if (result) {
            onScanSuccess(result.getText());
            stopScanner();
          }
          if (err && !(err instanceof NotFoundException)) {
            const errorMessage = `Barcode scan failed: ${err.message}`;
            setError(errorMessage);
            if (onScanFailure) {
              onScanFailure(err);
            }
          }
        });
      }
    } catch (err: any) {
      const errorMessage = `Failed to start scanner: ${err.message}`;
      setError(errorMessage);
      setIsScannerActive(false);
      if (onScanFailure) {
        onScanFailure(err);
      }
    }
  }, [onScanSuccess, onScanFailure]);

  const stopScanner = useCallback(() => {
    if (codeReader.current) {
      codeReader.current.reset();
    }
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsScannerActive(false);
  }, []);

  return {
    videoRef,
    isScannerActive,
    error,
    startScanner,
    stopScanner,
  };
};

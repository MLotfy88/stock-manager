import { useState, useRef, useEffect, useCallback } from 'react';
import {
  BrowserMultiFormatReader,
  NotFoundException,
  DecodeHintType,
  BarcodeFormat,
} from '@zxing/library';

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
      if (codeReader.current) {
        codeReader.current.reset();
      }
    };
  }, []);

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

  useEffect(() => {
    if (isScannerActive && videoRef.current) {
      const startCamera = async () => {
        try {
          setError(null);
          const stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: 'environment',
              width: { ideal: 1280 },
              height: { ideal: 720 },
              // @ts-ignore
              advanced: [{ autoFocus: 'continuous' }],
            },
          });

          if (videoRef.current && codeReader.current) {
            videoRef.current.srcObject = stream;
            await videoRef.current.play();

            codeReader.current.decodeFromStream(stream, videoRef.current, (result, err) => {
              if (result) {
                onScanSuccess(result.getText());
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
          if (onScanFailure) {
            onScanFailure(err);
          }
          setIsScannerActive(false);
        }
      };
      startCamera();
    }
    
    return () => {
      if (!isScannerActive) {
        stopScanner();
      }
    };
  }, [isScannerActive, onScanSuccess, onScanFailure, stopScanner]);

  const startScanner = useCallback(() => {
    setIsScannerActive(true);
  }, []);

  return {
    videoRef,
    isScannerActive,
    error,
    startScanner,
    stopScanner,
  };
};

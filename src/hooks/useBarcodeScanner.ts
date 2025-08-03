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

export const useBarcodeScanner = (props: UseBarcodeScannerProps) => {
  const [isScannerActive, setIsScannerActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scanCycle, setScanCycle] = useState(0); // New state for visual feedback
  const videoRef = useRef<HTMLVideoElement>(null);
  const codeReader = useRef<BrowserMultiFormatReader | null>(null);
  const scanInterval = useRef<NodeJS.Timeout | null>(null);

  const callbackRef = useRef(props);
  useEffect(() => {
    callbackRef.current = props;
  }, [props]);

  useEffect(() => {
    const hints = new Map();
    const formats = [
      BarcodeFormat.CODE_128,
      BarcodeFormat.EAN_13,
      BarcodeFormat.CODE_39,
      BarcodeFormat.EAN_8,
      BarcodeFormat.UPC_A,
      BarcodeFormat.UPC_E,
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
    if (scanInterval.current) {
      clearInterval(scanInterval.current);
      scanInterval.current = null;
    }
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
    if (!isScannerActive) {
      return;
    }

    const startCamera = async () => {
      if (!videoRef.current || !codeReader.current) {
        return;
      }

      try {
        setError(null);
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'environment',
            width: { ideal: 1920 },
            height: { ideal: 1080 },
            advanced: [
              // @ts-ignore
              { focusMode: 'continuous' },
              // @ts-ignore
              { videoStablization: 'on' }
            ],
          },
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();

          scanInterval.current = setInterval(async () => {
            setScanCycle(prev => prev + 1); // Update cycle for visual feedback
            if (codeReader.current && videoRef.current) {
              try {
                const result = await codeReader.current.decodeFromVideoElement(videoRef.current);
                if (result) {
                  callbackRef.current.onScanSuccess(result.getText());
                  stopScanner();
                }
              } catch (err) {
                if (!(err instanceof NotFoundException)) {
                  // console.error("Decode Error:", err);
                }
              }
            }
          }, 500);
        }
      } catch (err: any) {
        const errorMessage = `Failed to start scanner: ${err.message}`;
        setError(errorMessage);
        if (callbackRef.current.onScanFailure) {
          callbackRef.current.onScanFailure(err);
        }
        stopScanner();
      }
    };

    startCamera();

    return () => {
      stopScanner();
    };
  }, [isScannerActive, stopScanner]);

  const startScanner = useCallback(() => {
    setIsScannerActive(true);
  }, []);

  return {
    videoRef,
    isScannerActive,
    error,
    startScanner,
    stopScanner,
    scanCycle, // Expose the cycle state
  };
};

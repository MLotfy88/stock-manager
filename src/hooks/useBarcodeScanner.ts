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
  const [scanCycle, setScanCycle] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);

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
      BarcodeFormat.DATA_MATRIX,
      BarcodeFormat.ITF,
      BarcodeFormat.CODABAR,
      BarcodeFormat.PDF_417,
      BarcodeFormat.AZTEC,
    ];
    hints.set(DecodeHintType.POSSIBLE_FORMATS, formats);
    hints.set(DecodeHintType.TRY_HARDER, true);
    codeReaderRef.current = new BrowserMultiFormatReader(hints);
  }, []);

  useEffect(() => {
    let isCancelled = false;

    const startScanning = async () => {
      if (!isScannerActive || !videoRef.current || !codeReaderRef.current) {
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'environment',
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        });

        if (isCancelled) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }

        videoRef.current.srcObject = stream;
        await videoRef.current.play();

        codeReaderRef.current.decodeFromStream(stream, videoRef.current, (result, err) => {
          if (isCancelled) return;
          
          setScanCycle(prev => prev + 1);

          if (result) {
            callbackRef.current.onScanSuccess(result.getText());
            setIsScannerActive(false); 
          } else if (err && !(err instanceof NotFoundException)) {
            setError(`Scan failed: ${err.message}`);
            if (callbackRef.current.onScanFailure) {
              callbackRef.current.onScanFailure(err);
            }
            setIsScannerActive(false);
          }
        });

      } catch (err: any) {
        setError(`Failed to start camera: ${err.message}`);
        setIsScannerActive(false);
      }
    };

    if (isScannerActive) {
      startScanning();
    }

    return () => {
      isCancelled = true;
      if (codeReaderRef.current) {
        codeReaderRef.current.reset();
      }
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
        videoRef.current.srcObject = null;
      }
    };
  }, [isScannerActive]);

  const startScanner = useCallback(() => setIsScannerActive(true), []);
  const stopScanner = useCallback(() => setIsScannerActive(false), []);

  // Temporarily disable torch functionality to ensure stability
  const toggleTorch = useCallback(() => {
    console.warn("Torch functionality is temporarily disabled.");
  }, []);
  const isTorchOn = false;

  return {
    videoRef,
    isScannerActive,
    error,
    startScanner,
    stopScanner,
    scanCycle,
    isTorchOn,
    toggleTorch,
  };
};

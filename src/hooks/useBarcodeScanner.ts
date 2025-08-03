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
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scanCycle, setScanCycle] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const codeReader = useRef<BrowserMultiFormatReader | null>(null);

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
      codeReader.current?.reset();
    };
  }, []);

  const stopScanner = useCallback(() => {
    if (codeReader.current) {
      codeReader.current.reset();
    }
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => {
        track.stop();
      });
      videoRef.current.srcObject = null;
    }
    setIsScannerActive(false);
    setIsTorchOn(false);
  }, []);

  const toggleTorch = useCallback(async () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      const track = stream.getVideoTracks()[0];
      // @ts-ignore
      const hasTorch = 'torch' in track.getCapabilities();
      if (hasTorch) {
        try {
          await track.applyConstraints({
            // @ts-ignore
            advanced: [{ torch: !isTorchOn }],
          });
          setIsTorchOn(!isTorchOn);
        } catch (err) {
          console.error('Failed to toggle torch:', err);
        }
      } else {
        console.warn('Torch not supported on this device.');
      }
    }
  }, [isTorchOn]);

  useEffect(() => {
    if (!isScannerActive) {
      return;
    }

    const startCamera = async () => {
      if (!videoRef.current || !codeReader.current) return;

      try {
        setError(null);
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'environment',
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();

          codeReader.current.decodeFromStream(stream, videoRef.current, (result, err) => {
            setScanCycle(prev => prev + 1);
            if (result) {
              callbackRef.current.onScanSuccess(result.getText());
              stopScanner();
            }
            if (err && !(err instanceof NotFoundException)) {
              setError(`Scan failed: ${err.message}`);
            }
          });
        }
      } catch (err: any) {
        setError(`Failed to start scanner: ${err.message}`);
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
    scanCycle,
    isTorchOn,
    toggleTorch,
  };
};

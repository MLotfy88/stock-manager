import { useState, useRef, useEffect, useCallback } from 'react';
import {
  MultiFormatReader,
  NotFoundException,
  DecodeHintType,
  BarcodeFormat,
  BinaryBitmap,
  HybridBinarizer,
  RGBLuminanceSource,
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
  const canvasRef = useRef<HTMLCanvasElement>(document.createElement('canvas'));
  const codeReader = useRef(new MultiFormatReader());
  const animationFrameId = useRef<number | null>(null);

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
    codeReader.current.setHints(hints);
  }, []);

  const stopScanner = useCallback(() => {
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
      animationFrameId.current = null;
    }
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsScannerActive(false);
  }, []);

  const scanLoop = useCallback(() => {
    if (!isScannerActive || !videoRef.current || !codeReader.current) {
      return;
    }

    if (videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
      setScanCycle(prev => prev + 1);
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d', { willReadFrequently: true });

      if (context) {
        const cropWidth = canvas.width * 0.8;
        const cropHeight = canvas.height * 0.3;
        const cropX = (canvas.width - cropWidth) / 2;
        const cropY = (canvas.height - cropHeight) / 2;
        
        context.drawImage(video, cropX, cropY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);
        const imageData = context.getImageData(0, 0, cropWidth, cropHeight);

        const luminanceSource = new RGBLuminanceSource(imageData.data, imageData.width, imageData.height);
        const binaryBitmap = new BinaryBitmap(new HybridBinarizer(luminanceSource));
        
        try {
          const result = codeReader.current.decode(binaryBitmap);
          if (result) {
            callbackRef.current.onScanSuccess(result.getText());
            stopScanner();
            return; // Exit loop on success
          }
        } catch (err) {
          // NotFoundException is expected, ignore it.
          if (!(err instanceof NotFoundException)) {
            // console.error("Decode Error:", err);
          }
        }
      }
    }
    animationFrameId.current = requestAnimationFrame(scanLoop);
  }, [isScannerActive, stopScanner]);

  useEffect(() => {
    if (isScannerActive) {
      const startCamera = async () => {
        try {
          setError(null);
          const stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: 'environment',
              width: { ideal: 1920 },
              height: { ideal: 1080 },
              // @ts-ignore
              advanced: [{ torch: true }]
            },
          });
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            await videoRef.current.play();
            animationFrameId.current = requestAnimationFrame(scanLoop);
          }
        } catch (err: any) {
          setError(`Failed to start scanner: ${err.message}`);
          stopScanner();
        }
      };
      startCamera();
    } else {
      stopScanner();
    }
    return () => {
      stopScanner();
    };
  }, [isScannerActive, stopScanner, scanLoop]);

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
  };
};

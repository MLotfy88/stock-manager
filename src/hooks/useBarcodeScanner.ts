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
  const [isTorchOn, setIsTorchOn] = useState(false);
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
      BarcodeFormat.CODE_128, BarcodeFormat.EAN_13, BarcodeFormat.CODE_39,
      BarcodeFormat.EAN_8, BarcodeFormat.UPC_A, BarcodeFormat.UPC_E,
    ];
    hints.set(DecodeHintType.POSSIBLE_FORMATS, formats);
    hints.set(DecodeHintType.TRY_HARDER, true);
    codeReader.current.setHints(hints);
  }, []);

  const scanLoop = useCallback(() => {
    if (!videoRef.current || videoRef.current.readyState !== videoRef.current.HAVE_ENOUGH_DATA) {
      animationFrameId.current = requestAnimationFrame(scanLoop);
      return;
    }

    setScanCycle(prev => prev + 1);
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d', { willReadFrequently: true });

    if (context) {
      const cropWidth = canvas.width * 0.9;
      const cropHeight = canvas.height * 0.4;
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
          setIsScannerActive(false); // This will trigger the cleanup in useEffect
          return;
        }
      } catch (err) {
        if (!(err instanceof NotFoundException)) {
          console.error("Decode Error:", err);
        }
      }
    }
    animationFrameId.current = requestAnimationFrame(scanLoop);
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
          animationFrameId.current = requestAnimationFrame(scanLoop);
        }
      } catch (err: any) {
        setError(`Failed to start scanner: ${err.message}`);
        setIsScannerActive(false);
      }
    };

    if (isScannerActive) {
      startCamera();
    }

    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
        animationFrameId.current = null;
      }
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if(videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, [isScannerActive, scanLoop]);

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
      }
    }
  }, [isTorchOn]);

  const startScanner = useCallback(() => setIsScannerActive(true), []);
  const stopScanner = useCallback(() => setIsScannerActive(false), []);

  return {
    videoRef, isScannerActive, error, startScanner, stopScanner,
    scanCycle, isTorchOn, toggleTorch,
  };
};

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
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(document.createElement('canvas'));
  const codeReader = useRef(new MultiFormatReader());

  const callbackRef = useRef(props);
  useEffect(() => {
    callbackRef.current = props;
  }, [props]);

  useEffect(() => {
    const hints = new Map();
    const formats = [
      BarcodeFormat.CODE_128, BarcodeFormat.EAN_13, BarcodeFormat.CODE_39,
      BarcodeFormat.EAN_8, BarcodeFormat.UPC_A, BarcodeFormat.UPC_E,
      BarcodeFormat.DATA_MATRIX, BarcodeFormat.ITF, BarcodeFormat.CODABAR,
    ];
    hints.set(DecodeHintType.POSSIBLE_FORMATS, formats);
    hints.set(DecodeHintType.TRY_HARDER, true);
    codeReader.current.setHints(hints);
  }, []);

  const captureAndDecode = useCallback(() => {
    if (!videoRef.current || videoRef.current.readyState !== videoRef.current.HAVE_ENOUGH_DATA) {
      callbackRef.current.onScanFailure?.(new Error("Video not ready."));
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');

    if (!context) {
      callbackRef.current.onScanFailure?.(new Error("Could not get canvas context."));
      return;
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // --- Attempt 1: Decode Full Image ---
    try {
      const fullImageData = context.getImageData(0, 0, canvas.width, canvas.height);
      const fullLuminanceSource = new RGBLuminanceSource(fullImageData.data, fullImageData.width, fullImageData.height);
      const fullBinaryBitmap = new BinaryBitmap(new HybridBinarizer(fullLuminanceSource));
      const result = codeReader.current.decode(fullBinaryBitmap);
      callbackRef.current.onScanSuccess(result.getText());
      return; // Success!
    } catch (err) {
      // Expected to fail if barcode is small or not centered, continue to next attempt.
    }

    // --- Attempt 2: Decode Cropped Center Image ---
    try {
      const cropWidth = canvas.width * 0.9;
      const cropHeight = canvas.height * 0.4;
      const cropX = (canvas.width - cropWidth) / 2;
      const cropY = (canvas.height - cropHeight) / 2;
      const croppedImageData = context.getImageData(cropX, cropY, cropWidth, cropHeight);
      
      const croppedLuminanceSource = new RGBLuminanceSource(croppedImageData.data, croppedImageData.width, croppedImageData.height);
      const croppedBinaryBitmap = new BinaryBitmap(new HybridBinarizer(croppedLuminanceSource));
      const result = codeReader.current.decode(croppedBinaryBitmap);
      callbackRef.current.onScanSuccess(result.getText());
      return; // Success!
    } catch (err) {
      if (err instanceof NotFoundException) {
        callbackRef.current.onScanFailure?.(new Error("Barcode not found. Please try again."));
      } else {
        callbackRef.current.onScanFailure?.(err as Error);
      }
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

  const startScanner = useCallback(() => setIsScannerActive(true), []);
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

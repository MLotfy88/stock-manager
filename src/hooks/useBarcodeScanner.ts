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
      console.warn("Video not ready for capture.");
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');

    if (context) {
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      const luminanceSource = new RGBLuminanceSource(imageData.data, imageData.width, imageData.height);
      const binaryBitmap = new BinaryBitmap(new HybridBinarizer(luminanceSource));
      
      try {
        const result = codeReader.current.decode(binaryBitmap);
        callbackRef.current.onScanSuccess(result.getText());
      } catch (err) {
        if (err instanceof NotFoundException) {
          if (callbackRef.current.onScanFailure) {
            callbackRef.current.onScanFailure(new Error("Barcode not found in the captured image."));
          }
        } else {
          if (callbackRef.current.onScanFailure) {
            callbackRef.current.onScanFailure(err as Error);
          }
        }
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

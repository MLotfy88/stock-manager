import { useState, useRef, useEffect, useCallback } from 'react';
import {
  MultiFormatReader, // Changed from BrowserMultiFormatReader
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
  const codeReader = useRef(new MultiFormatReader()); // Use the correct reader
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
    codeReader.current.setHints(hints); // setHints is a method on MultiFormatReader
  }, []);

  const stopScanner = useCallback(() => {
    if (scanInterval.current) {
      clearInterval(scanInterval.current);
      scanInterval.current = null;
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
      if (!videoRef.current) {
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

          scanInterval.current = setInterval(() => {
            if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
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
                  const result = codeReader.current.decode(binaryBitmap); // This will now work correctly
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
  };
};

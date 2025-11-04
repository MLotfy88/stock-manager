import { useState, useRef, useEffect, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

const parseGS1Barcode = (rawValue: string): string => {
  // GS1-128 barcodes scanned by some devices start with ]C1
  if (!rawValue.startsWith(']C1')) {
    return rawValue; // Not a GS1-128 barcode, return as is
  }

  let data = rawValue.substring(3); // Remove the GS1 prefix
  let result = '';
  
  // A simplified map of Application Identifiers (AIs) and their fixed lengths.
  // -1 indicates a variable length field.
  const aiRules: { [key: string]: number } = {
    '01': 14, // GTIN
    '17': 6,  // Expiration Date (YYMMDD)
    '10': -1, // Batch/Lot Number (variable length up to 20 chars)
    '30': -1, // Count of items (variable length up to 8 digits)
  };

  while (data.length > 0) {
    const ai = data.substring(0, 2);
    data = data.substring(2);

    if (aiRules[ai] !== undefined) {
      let value = '';
      const length = aiRules[ai];

      if (length > 0) {
        // Fixed length AI
        value = data.substring(0, length);
        data = data.substring(length);
      } else {
        // Variable length AI. GS1 uses FNC1 as a separator, which is often not present in raw data.
        // We'll look for the next AI as a delimiter. This is a simplification.
        let nextAiIndex = -1;
        for (let i = 1; i < data.length - 1; i++) {
            const nextPotentialAi = data.substring(i, i + 2);
            if(aiRules[nextPotentialAi] !== undefined) {
                nextAiIndex = i;
                break;
            }
        }

        if (nextAiIndex !== -1) {
          value = data.substring(0, nextAiIndex);
          data = data.substring(nextAiIndex);
        } else {
          value = data; // Assume it's the last field
          data = '';
        }
      }
      result += `(${ai})${value} `;
    } else {
      // If we encounter an AI not in our rules, we stop parsing.
      // This is a safeguard against incorrect parsing of variable length fields.
      break;
    }
  }

  return result.trim();
};

// Define the structure of the BarcodeDetector, as it might not be in all TypeScript lib versions
declare global {
  interface Window {
    BarcodeDetector: new (options?: { formats: string[] }) => BarcodeDetector;
  }
  interface BarcodeDetector {
    detect(image: ImageBitmapSource): Promise<DetectedBarcode[]>;
  }
  interface DetectedBarcode {
    rawValue: string;
    format: string;
  }
}

interface UseBarcodeScannerProps {
  onScanSuccess: (text: string) => void;
  onScanFailure?: (error: Error) => void;
}

export const useBarcodeScanner = (props: UseBarcodeScannerProps) => {
  const [isScannerActive, setIsScannerActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const barcodeDetector = useRef<BarcodeDetector | null>(null);

  const callbackRef = useRef(props);
  useEffect(() => {
    callbackRef.current = props;
  }, [props]);

  useEffect(() => {
    if (!('BarcodeDetector' in window)) {
      setIsSupported(false);
      setError("Barcode Detector API is not supported in this browser.");
      return;
    }
    barcodeDetector.current = new window.BarcodeDetector({
      formats: ['code_128', 'ean_13', 'code_39', 'ean_8', 'upc_a', 'upc_e', 'itf', 'codabar'],
    });
  }, []);

  const captureAndDecode = useCallback(async () => {
    if (!videoRef.current || videoRef.current.readyState !== videoRef.current.HAVE_ENOUGH_DATA) {
      callbackRef.current.onScanFailure?.(new Error("Video not ready."));
      return;
    }
    if (!barcodeDetector.current) {
      callbackRef.current.onScanFailure?.(new Error("Barcode Detector not initialized."));
      return;
    }

    try {
      const barcodes = await barcodeDetector.current.detect(videoRef.current);
      if (barcodes.length > 0) {
        const parsedValue = parseGS1Barcode(barcodes[0].rawValue);
        callbackRef.current.onScanSuccess(parsedValue);
      } else {
        callbackRef.current.onScanFailure?.(new Error("No barcode detected."));
      }
    } catch (err) {
      callbackRef.current.onScanFailure?.(err as Error);
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

  const startScanner = useCallback(async () => {
    if (!isSupported) {
      alert("Barcode scanning is not supported on this browser.");
      return;
    }

    if (Capacitor.isNativePlatform()) {
      try {
        // Request camera permission
        await Camera.requestPermissions();

        const image = await Camera.getPhoto({
          quality: 90,
          allowEditing: false,
          resultType: CameraResultType.Uri,
          source: CameraSource.Camera,
        });

        if (image.webPath && barcodeDetector.current) {
          const img = new Image();
          img.onload = async () => {
            try {
              const barcodes = await barcodeDetector.current.detect(img);
              if (barcodes.length > 0) {
                const parsedValue = parseGS1Barcode(barcodes[0].rawValue);
                callbackRef.current.onScanSuccess(parsedValue);
              } else {
                callbackRef.current.onScanFailure?.(new Error("No barcode detected in the image."));
              }
            } catch (err) {
              callbackRef.current.onScanFailure?.(err as Error);
            }
          };
          img.src = image.webPath;
        }
      } catch (err: any) {
        setError(`Failed to use camera: ${err.message}`);
      }
    } else {
      // Web-based scanner
      setIsScannerActive(true);
    }
  }, [isSupported]);
  
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

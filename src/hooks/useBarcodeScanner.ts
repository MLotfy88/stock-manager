import { useState, useRef, useEffect, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { getGTINMapping, updateLastScanned } from '@/data/operations/gtinMappingOperations';

// واجهة البيانات المحللة من GS1-128
export interface ParsedGS1Data {
  gtin?: string;          // AI (01) - رقم التعريف العالمي
  expiryDate?: string;    // AI (17) - تاريخ الصلاحية بصيغة ISO (YYYY-MM-DD)
  lotNumber?: string;     // AI (10) - رقم الباتش
  quantity?: string;      // AI (30) - الكمية (إن وجدت)
  rawValue: string;       // القيمة الخام الكاملة
  formattedValue: string; // القيمة المنسقة مع الأقواس
  product_id?: string;    // معرف المنتج المرتبط (إن وُجد)
  variant_name?: string;  // اسم المتغير المرتبط (إن وُجد)
}

// دالة لتحويل تاريخ GS1 (YYMMDD) إلى صيغة ISO (YYYY-MM-DD)
const convertGS1DateToISO = (gs1Date: string): string | null => {
  if (!gs1Date || gs1Date.length !== 6) return null;

  try {
    const yy = parseInt(gs1Date.substring(0, 2), 10);
    const mm = gs1Date.substring(2, 4);
    const dd = gs1Date.substring(4, 6);

    // تحديد القرن: إذا كان السنة < 50، نفترض 20xx، وإلا 19xx
    const yyyy = yy < 50 ? 2000 + yy : 1900 + yy;

    // التحقق من صحة الشهر واليوم
    const month = parseInt(mm, 10);
    const day = parseInt(dd, 10);

    if (month < 1 || month > 12 || day < 1 || day > 31) {
      return null;
    }

    return `${yyyy}-${mm}-${dd}`;
  } catch (error) {
    console.error('Error converting GS1 date:', error);
    return null;
  }
};

// دالة لاستخراج بيانات المستلزمات الطبية من باركود GS1-128
export const extractGS1DataForSupply = (rawValue: string): ParsedGS1Data | null => {
  let cleanValue = rawValue.trim();

  // 1. Aggressive Prefix Cleaning (Fix for "Writes C")
  // Remove common AIM identifiers and partial fragments often sent by keyboard wedges
  // ]C1, ]C, C1, or just C followed by digits/brackets
  if (cleanValue.startsWith(']C1')) cleanValue = cleanValue.substring(3);
  else if (cleanValue.startsWith(']C')) cleanValue = cleanValue.substring(2);
  else if (cleanValue.startsWith('C1')) cleanValue = cleanValue.substring(2);
  else if (cleanValue.startsWith(']')) cleanValue = cleanValue.substring(1);
  // If it starts with 'C' followed by a number or '(', remove 'C'
  else if (cleanValue.startsWith('C') && /^[0-9\(]/.test(cleanValue.substring(1))) cleanValue = cleanValue.substring(1);

  const result: ParsedGS1Data = {
    rawValue,
    formattedValue: ''
  };

  // Helper to build formatted string in standard order: (01), (17), (10), (30)
  const buildFormatted = () => {
    let f = '';
    if (result.gtin) f += `(01)${result.gtin} `;
    if (result.expiryDate) {
      try {
        const d = new Date(result.expiryDate);
        if (!isNaN(d.getTime())) {
          const yy = d.getFullYear().toString().substr(2);
          const mm = (d.getMonth() + 1).toString().padStart(2, '0');
          const dd = d.getDate().toString().padStart(2, '0');
          f += `(17)${yy}${mm}${dd} `;
        }
      } catch (e) { /* ignore */ }
    }
    if (result.lotNumber) f += `(10)${result.lotNumber} `;
    if (result.quantity) f += `(30)${result.quantity} `;
    return f.trim();
  };

  // Case 1: HRI Format with parentheses
  if (cleanValue.includes('(') && cleanValue.includes(')')) {
    const parts = cleanValue.split('(');

    parts.forEach(part => {
      if (!part) return;
      const closingParenIndex = part.indexOf(')');
      if (closingParenIndex > 0) {
        const ai = part.substring(0, closingParenIndex);
        const value = part.substring(closingParenIndex + 1);

        if (ai === '01') result.gtin = value;
        else if (ai === '17') {
          const iso = convertGS1DateToISO(value);
          if (iso) result.expiryDate = iso;
        }
        else if (ai === '10') result.lotNumber = value;
        else if (ai === '30') result.quantity = value;
      }
    });

    if (result.gtin) {
      result.formattedValue = buildFormatted();
      return result;
    }
  }

  // Case 2: Raw GS1 Stream
  let data = cleanValue;

  // Rules for parsing raw stream
  const aiRules: { [key: string]: number } = {
    '01': 14, // GTIN
    '17': 6,  // Expiry (YYMMDD)
    '10': -1, // Batch (Variable)
    '30': -1, // Quantity (Variable)
    '21': -1, // Serial (Variable)
  };

  while (data.length > 0) {
    const ai2 = data.substring(0, 2);
    // Check 2-digit AIs
    if (aiRules[ai2] !== undefined) {
      const length = aiRules[ai2];
      let value = '';

      if (length > 0) {
        // Fixed length
        value = data.substring(2, 2 + length);
        data = data.substring(2 + length);
      } else {
        // Variable length logic
        // Find next AI to stop. 
        let stopIndex = data.length;
        data = data.substring(2);

        const gsIndex = data.indexOf('\x1d');
        if (gsIndex !== -1) {
          value = data.substring(0, gsIndex);
          data = data.substring(gsIndex + 1); // Skip GS
        } else {
          // Heuristic lookahead
          let foundNext = false;
          for (let i = 1; i < Math.min(data.length, 20); i++) {
            const potentialAI = data.substring(i, i + 2);
            if (['01', '17', '10', '30', '21'].includes(potentialAI)) {
              value = data.substring(0, i);
              data = data.substring(i);
              foundNext = true;
              break;
            }
          }
          if (!foundNext) {
            value = data;
            data = '';
          }
        }
      }

      if (ai2 === '01') result.gtin = value;
      else if (ai2 === '17') {
        const iso = convertGS1DateToISO(value);
        if (iso) result.expiryDate = iso;
      }
      else if (ai2 === '10') result.lotNumber = value;
      else if (ai2 === '30') result.quantity = value;

    } else {
      // Unknown AI or garbage at end
      break;
    }
  }

  if (result.gtin) {
    result.formattedValue = buildFormatted();
    return result;
  }

  return null;
};

// دالة قديمة للتوافق - تُرجع النص المنسق
const parseGS1Barcode = (rawValue: string): string => {
  const parsed = extractGS1DataForSupply(rawValue);
  return parsed ? parsed.formattedValue : rawValue;
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
  onScanSuccess: (data: ParsedGS1Data) => void;
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
      formats: ['code_128', 'ean_13', 'code_39', 'ean_8', 'upc_a', 'upc_e', 'itf', 'codabar', 'data_matrix', 'qr_code', 'aztec', 'pdf417'],
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
        const rawValue = barcodes[0].rawValue;
        const parsedData = extractGS1DataForSupply(rawValue);

        let finalData: ParsedGS1Data = parsedData || {
          rawValue,
          formattedValue: rawValue
        };

        // Auto-detect GTIN
        const gtin = parsedData?.gtin || (rawValue.length === 14 ? rawValue : null);
        if (gtin) {
          const mapping = await getGTINMapping(gtin);
          if (mapping) {
            finalData.product_id = mapping.product_definition_id;
            finalData.variant_name = mapping.variant_name;
            updateLastScanned(gtin).catch(console.error);
          }
        }

        callbackRef.current.onScanSuccess(finalData);
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

  // Scanning Loop for Web
  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    if (isScannerActive && !Capacitor.isNativePlatform()) {
      intervalId = setInterval(() => {
        captureAndDecode();
      }, 500); // Scan every 500ms
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isScannerActive, captureAndDecode]);

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
                const rawValue = barcodes[0].rawValue;
                const parsedData = extractGS1DataForSupply(rawValue);

                let finalData: ParsedGS1Data = parsedData || {
                  rawValue,
                  formattedValue: rawValue
                };

                // Auto-detect GTIN
                const gtin = parsedData?.gtin || (rawValue.length === 14 ? rawValue : null);
                if (gtin) {
                  const mapping = await getGTINMapping(gtin);
                  if (mapping) {
                    finalData.product_id = mapping.product_definition_id;
                    finalData.variant_name = mapping.variant_name;
                    updateLastScanned(gtin).catch(console.error);
                  }
                }

                callbackRef.current.onScanSuccess(finalData);
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

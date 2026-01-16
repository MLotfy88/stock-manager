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
  // التحقق من أنه باركود GS1-128
  if (!rawValue.startsWith(']C1')) {
    return null;
  }

  let data = rawValue.substring(3); // إزالة البادئة GS1
  const result: ParsedGS1Data = {
    rawValue,
    formattedValue: ''
  };

  // قواعد Application Identifiers
  const aiRules: { [key: string]: number } = {
    '01': 14, // GTIN
    '17': 6,  // تاريخ الصلاحية (YYMMDD)
    '10': -1, // رقم الباتش (متغير)
    '30': -1, // الكمية (متغير)
  };

  let formatted = '';

  while (data.length > 0) {
    const ai = data.substring(0, 2);
    data = data.substring(2);

    if (aiRules[ai] !== undefined) {
      let value = '';
      const length = aiRules[ai];

      if (length > 0) {
        // AI بطول ثابت
        value = data.substring(0, length);
        data = data.substring(length);
      } else {
        // AI بطول متغير - البحث عن AI التالي
        let nextAiIndex = -1;
        for (let i = 1; i < data.length - 1; i++) {
          const nextPotentialAi = data.substring(i, i + 2);
          if (aiRules[nextPotentialAi] !== undefined) {
            nextAiIndex = i;
            break;
          }
        }

        if (nextAiIndex !== -1) {
          value = data.substring(0, nextAiIndex);
          data = data.substring(nextAiIndex);
        } else {
          value = data;
          data = '';
        }
      }

      // حفظ البيانات حسب نوع AI
      if (ai === '01') {
        result.gtin = value;
      } else if (ai === '17') {
        const isoDate = convertGS1DateToISO(value);
        if (isoDate) {
          result.expiryDate = isoDate;
        }
      } else if (ai === '10') {
        result.lotNumber = value;
      } else if (ai === '30') {
        result.quantity = value;
      }

      formatted += `(${ai})${value} `;
    } else {
      // إيقاف التحليل عند AI غير معروف
      break;
    }
  }

  result.formattedValue = formatted.trim();
  return result;
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

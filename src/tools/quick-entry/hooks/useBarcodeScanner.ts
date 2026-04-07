import { useState, useRef, useEffect, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Html5Qrcode } from 'html5-qrcode';
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

  if (cleanValue.startsWith(']C1')) cleanValue = cleanValue.substring(3);
  else if (cleanValue.startsWith(']C')) cleanValue = cleanValue.substring(2);
  else if (cleanValue.startsWith('C1')) cleanValue = cleanValue.substring(2);
  else if (cleanValue.startsWith(']')) cleanValue = cleanValue.substring(1);
  else if (cleanValue.startsWith('C') && /^[0-9\(]/.test(cleanValue.substring(1))) cleanValue = cleanValue.substring(1);

  const result: ParsedGS1Data = {
    rawValue,
    formattedValue: ''
  };

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
    if (result.quantity) f += `(30)${result.quantity} `;
    if (result.lotNumber) f += `(10)${result.lotNumber} `;
    return f.trim();
  };

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

  let data = cleanValue;
  const aiRules: { [key: string]: number } = {
    '01': 14, '17': 6, '10': -1, '30': -1, '21': -1,
  };
  const seenAIs = new Set<string>();

  while (data.length > 0) {
    const ai2 = data.substring(0, 2);
    seenAIs.add(ai2);
    if (aiRules[ai2] !== undefined) {
      const length = aiRules[ai2];
      let value = '';
      if (length > 0) {
        value = data.substring(2, 2 + length);
        data = data.substring(2 + length);
      } else {
        data = data.substring(2);
        const gsIndex = data.indexOf('\x1d');
        if (gsIndex !== -1) {
          value = data.substring(0, gsIndex);
          data = data.substring(gsIndex + 1);
        } else {
          let foundNext = false;
          const terminalAIs = ['10', '21'];
          if (!terminalAIs.includes(ai2)) {
            for (let i = 1; i < Math.min(data.length - 1, 30); i++) {
              const potentialAI = data.substring(i, i + 2);
              const validNextAIs = ['17', '10', '30', '21', '01'];
              if (validNextAIs.includes(potentialAI) && !seenAIs.has(potentialAI)) {
                if (potentialAI !== ai2) {
                  value = data.substring(0, i);
                  data = data.substring(i);
                  foundNext = true;
                  break;
                }
              }
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
    } else break;
  }

  if (result.gtin) {
    result.formattedValue = buildFormatted();
    return result;
  }
  return null;
};

// Standard Barcode Detector types
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
  isPaused?: boolean; // NEW: Added pause capability
}

export const useBarcodeScanner = (props: UseBarcodeScannerProps) => {
  const [isScannerActive, setIsScannerActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const barcodeDetector = useRef<BarcodeDetector | null>(null);
  const lastScanTime = useRef<number>(0); 
  const lastScannedValue = useRef<string>(''); 

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
      formats: ['code_128', 'ean_13', 'upc_a', 'upc_e', 'qr_code'], 
    });
  }, []);

  const captureAndDecode = useCallback(async () => {
    // Check pause state
    if (callbackRef.current.isPaused) return;

    if (!videoRef.current || videoRef.current.readyState !== videoRef.current.HAVE_ENOUGH_DATA) return;
    if (!barcodeDetector.current) return;

    try {
      const video = videoRef.current;
      const canvas = document.createElement('canvas'); 
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const roiWidth = video.videoWidth * 0.7;
      const roiHeight = video.videoHeight * 0.5;
      const roiX = (video.videoWidth - roiWidth) / 2;
      const roiY = (video.videoHeight - roiHeight) / 2;

      canvas.width = roiWidth;
      canvas.height = roiHeight;
      ctx.drawImage(video, roiX, roiY, roiWidth, roiHeight, 0, 0, roiWidth, roiHeight);

      const barcodes = await barcodeDetector.current.detect(canvas);

      if (barcodes.length > 0) {
        const rawValue = barcodes[0].rawValue;
        const now = Date.now();
        const timeSinceLastScan = now - lastScanTime.current;
        const isSameBarcode = rawValue === lastScannedValue.current;

        if (isSameBarcode && timeSinceLastScan < 1000) return;

        lastScanTime.current = now;
        lastScannedValue.current = rawValue;

        const format = barcodes[0].format;
        const isGS1Capable = ['code_128', 'data_matrix', 'qr_code', 'aztec'].includes(format);
        const parsedData = isGS1Capable ? extractGS1DataForSupply(rawValue) : null;

        let finalData: ParsedGS1Data = parsedData || {
          rawValue,
          formattedValue: rawValue
        };

        const gtin = parsedData?.gtin || (['ean_13', 'upc_a', 'upc_e', 'ean_8'].includes(format) ? rawValue : (rawValue.length === 14 ? rawValue : null));
        
        if (gtin) {
          finalData.gtin = gtin; // Ensure GTIN is present in finalData
          const mapping = await getGTINMapping(gtin);
          if (mapping) {
            finalData.product_id = mapping.product_definition_id;
            finalData.variant_name = mapping.variant_name;
            updateLastScanned(gtin).catch(console.error);
          }
        }

        callbackRef.current.onScanSuccess(finalData);
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
            width: { ideal: 1280 },
            height: { ideal: 720 },
            // @ts-ignore
            advanced: [{ focusMode: 'continuous' } as any]
          },
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          const track = stream.getVideoTracks()[0];
          const capabilities = track.getCapabilities();
          // @ts-ignore
          if (capabilities.focusMode) {
            try {
              // @ts-ignore
              await track.applyConstraints({ advanced: [{ focusMode: 'continuous' } as any] });
            } catch (e) {}
          }
        }
      } catch (err: any) {
        setError(`Failed to start camera: ${err.message}`);
        setIsScannerActive(false);
      }
    };

    if (isScannerActive) startCamera();

    return () => {
      if (stream) stream.getTracks().forEach(track => track.stop());
      if (videoRef.current) videoRef.current.srcObject = null;
    };
  }, [isScannerActive]);

  useEffect(() => {
    let isRunning = true;
    let timeoutId: NodeJS.Timeout;

    const scanLoop = async () => {
      if (!isRunning || !isScannerActive || Capacitor.isNativePlatform()) return;
      await captureAndDecode();
      timeoutId = setTimeout(scanLoop, 50);
    };

    if (isScannerActive && !Capacitor.isNativePlatform()) scanLoop();

    return () => {
      isRunning = false;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isScannerActive, captureAndDecode]);

  const startScanner = useCallback(() => setIsScannerActive(true), []);
  const stopScanner = useCallback(() => setIsScannerActive(false), []);

  return {
    videoRef,
    isScannerActive,
    error,
    startScanner,
    stopScanner,
    isSupported,
    captureAndDecode
  };
};

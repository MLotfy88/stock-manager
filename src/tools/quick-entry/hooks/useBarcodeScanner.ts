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

  const splitBarcodeAccumulator = useRef<{
     fragments: Set<string>;
     timeoutId: NodeJS.Timeout | null;
     primaryFormat: string | null;
  }>({ fragments: new Set(), timeoutId: null, primaryFormat: null });

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
      // Pass the HTMLVideoElement directly to the native BarcodeDetector. 
      // Avoid cropping (ROI) because GS1-128 barcodes can be very wide, 
      // and cropping forces the user to move the camera far back to fit the box.
      const barcodes = await barcodeDetector.current.detect(video);

      if (barcodes.length > 0) {
        const acc = splitBarcodeAccumulator.current;
        
        for (const b of barcodes) {
           acc.fragments.add(b.rawValue);
           if (!acc.primaryFormat) acc.primaryFormat = b.format; 
        }

        const allFragments = Array.from(acc.fragments);
        const sortedRaw = allFragments.sort((a, b) => {
            const aHas01 = a.includes(']C101') || (a.startsWith('01') && a.length >= 16);
            const bHas01 = b.includes(']C101') || (b.startsWith('01') && b.length >= 16);
            if (aHas01 && !bHas01) return -1;
            if (!aHas01 && bHas01) return 1;
            return 0; 
        });

        const cleanFragment = (val: string) => {
            let v = val.trim();
            if (v.startsWith(']C1')) v = v.substring(3);
            else if (v.startsWith(']C')) v = v.substring(2);
            else if (v.startsWith('C1')) v = v.substring(2);
            else if (v.startsWith(']')) v = v.substring(1);
            return v;
        };

        const mergedRawValue = sortedRaw.map(cleanFragment).join('');
        const rawValue = mergedRawValue; 
        const format = acc.primaryFormat || 'code_128';

        const isGS1Capable = ['code_128', 'data_matrix', 'qr_code', 'aztec'].includes(format);
        const parsedData = isGS1Capable ? extractGS1DataForSupply(rawValue) : null;

        const hasGTIN = Boolean(parsedData?.gtin || (['ean_13', 'upc_a', 'upc_e', 'ean_8'].includes(format) ? rawValue : (rawValue.length === 14 ? rawValue : null)));
        const hasExpiry = Boolean(parsedData?.expiryDate);
        const hasLot = Boolean(parsedData?.lotNumber);
        
        const emitSuccess = async () => {
            if (acc.timeoutId) {
                clearTimeout(acc.timeoutId);
                acc.timeoutId = null;
            }
            acc.fragments.clear();
            acc.primaryFormat = null;
            
            const now = Date.now();
            const timeSinceLastScan = now - lastScanTime.current;
            const isSameBarcode = rawValue === lastScannedValue.current;

            if (isSameBarcode && timeSinceLastScan < 1000) return;

            lastScanTime.current = now;
            lastScannedValue.current = rawValue;

            let finalData: ParsedGS1Data = parsedData || {
              rawValue,
              formattedValue: rawValue
            };

            const gtin = parsedData?.gtin || (['ean_13', 'upc_a', 'upc_e', 'ean_8'].includes(format) ? rawValue : (rawValue.length === 14 ? rawValue : null));
            if (gtin) {
              finalData.gtin = gtin; 
              const mapping = await getGTINMapping(gtin);
              if (mapping) {
                finalData.product_id = mapping.product_definition_id;
                finalData.variant_name = mapping.variant_name;
                updateLastScanned(gtin).catch(console.error);
              }
            }
            callbackRef.current.onScanSuccess(finalData);
        };

        const isSuspiciouslyIncomplete = format === 'code_128' && hasGTIN && (!hasExpiry && !hasLot);
        // Wait! What if it only has LOT but no GTIN?
        const isOnlySecondary = format === 'code_128' && !hasGTIN && (hasExpiry || hasLot);

        if (isSuspiciouslyIncomplete || isOnlySecondary) {
            // It might be a split barcode where we only saw one half.
            // Give it 600ms to see if the second half comes into view.
            if (acc.timeoutId) clearTimeout(acc.timeoutId);
            acc.timeoutId = setTimeout(() => {
                emitSuccess(); // emit whatever we have if time runs out
            }, 600);
            return; // Wait for next frame
        } else {
            // It has BOTH (complete GS1-128), OR it's not code_128
            await emitSuccess();
        }
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
            width: { min: 1280, ideal: 1920, max: 2560 },
            height: { min: 720, ideal: 1080, max: 1440 },
            // @ts-ignore
            advanced: [{ focusMode: 'continuous' } as any]
          },
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          
          try {
            const track = stream.getVideoTracks()[0];
            const capabilities = track.getCapabilities() as any;
            
            const newConstraints: any = {};
            
            // 1. Enforce Continuous Focus natively
            if (capabilities.focusMode && capabilities.focusMode.includes('continuous')) {
              newConstraints.focusMode = 'continuous';
            }
            
            if (Object.keys(newConstraints).length > 0) {
              await track.applyConstraints({ advanced: [newConstraints] });
            }
          } catch (e) {
            console.log("Could not apply advanced camera tracking features", e);
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
      // Wait 150ms (approx 6-7 fps) to avoid locking up main thread on 1080p frames
      timeoutId = setTimeout(scanLoop, 150);
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

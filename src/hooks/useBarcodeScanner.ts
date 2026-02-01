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
    if (result.quantity) f += `(30)${result.quantity} `;
    if (result.lotNumber) f += `(10)${result.lotNumber} `;
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

  const seenAIs = new Set<string>();

  while (data.length > 0) {
    const ai2 = data.substring(0, 2);
    seenAIs.add(ai2);
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
        data = data.substring(2);

        const gsIndex = data.indexOf('\x1d');
        if (gsIndex !== -1) {
          value = data.substring(0, gsIndex);
          data = data.substring(gsIndex + 1); // Skip GS
        } else {
          // Heuristic lookahead - search for next AI
          let foundNext = false;

          // CRITICAL FIX: If we just parsed 10 (LOT) or 21 (Serial),
          // they are very often the LAST elements in a barcode.
          // Don't look ahead for other AIs inside them unless we see a GS separator.
          const terminalAIs = ['10', '21'];

          if (!terminalAIs.includes(ai2)) {
            // Start from position 1 (minimum variable length is 1 char)
            for (let i = 1; i < Math.min(data.length - 1, 30); i++) {
              const potentialAI = data.substring(i, i + 2);
              // Only look for AIs that haven't been seen yet.
              // Medical barcodes usually follow: 01 (GTIN) -> 17 (Expiry) -> 30 (Qty) -> 10 (Lot)
              const validNextAIs = ['17', '10', '30', '21', '01'];
              if (validNextAIs.includes(potentialAI) && !seenAIs.has(potentialAI)) {
                // Stricter check: Is the potential AI NOT the same as currently parsing?
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
  const lastScanTime = useRef<number>(0); // Cooldown tracker
  const lastScannedValue = useRef<string>(''); // Track last scanned barcode

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
      formats: ['code_128', 'ean_13', 'upc_a', 'upc_e', 'qr_code'], // Optimized for medical/retail
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
      // REGION OF INTEREST (ROI) FIX:
      // Instead of scanning the full frame, we crop the center (where the box is).
      // This stops "bottom scanning" and improves relative resolution of the target.

      const video = videoRef.current;
      const canvas = document.createElement('canvas'); // Off-screen canvas
      const ctx = canvas.getContext('2d');

      if (!ctx) return;

      // Define ROI (approx 60% width, 40% height - matching ScannerOverlay aspect)
      const roiWidth = video.videoWidth * 0.7; // 70% of width
      const roiHeight = video.videoHeight * 0.5; // 50% of height (box is usually wider)
      const roiX = (video.videoWidth - roiWidth) / 2;
      const roiY = (video.videoHeight - roiHeight) / 2;

      canvas.width = roiWidth;
      canvas.height = roiHeight;

      // Draw only the center part of the video to the canvas
      ctx.drawImage(video, roiX, roiY, roiWidth, roiHeight, 0, 0, roiWidth, roiHeight);

      // Detect from the cropped canvas
      const barcodes = await barcodeDetector.current.detect(canvas);

      if (barcodes.length > 0) {
        const rawValue = barcodes[0].rawValue;

        // Cooldown: 1 second is enough for continuous scanning
        const now = Date.now();
        const timeSinceLastScan = now - lastScanTime.current;
        const isSameBarcode = rawValue === lastScannedValue.current;

        if (isSameBarcode && timeSinceLastScan < 1000) {
          return;
        }

        // Update last scan tracking
        lastScanTime.current = now;
        lastScannedValue.current = rawValue;

        // ACCURACY FIX: Only try to parse GS1 if the format supports it (Code 128, Data Matrix, QRCode)
        // AND if it looks like GS1. Don't try to parse EAN/UPC as GS1.
        const format = barcodes[0].format;
        const isGS1Capable = ['code_128', 'data_matrix', 'qr_code', 'aztec'].includes(format);

        const parsedData = isGS1Capable ? extractGS1DataForSupply(rawValue) : null;

        let finalData: ParsedGS1Data = parsedData || {
          rawValue,
          formattedValue: rawValue
        };

        // Auto-detect GTIN
        // For EAN/UPC, the rawValue IS the GTIN (or compatible)
        const gtin = parsedData?.gtin || (['ean_13', 'upc_a', 'upc_e', 'ean_8'].includes(format) ? rawValue : (rawValue.length === 14 ? rawValue : null));

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
    } // Loop handled by useEffect
  }, []);

  useEffect(() => {
    let stream: MediaStream | null = null;
    const startCamera = async () => {
      try {
        setError(null);
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'environment',
            width: { ideal: 1280 }, // 720p is Faster/Standard for mobile scanning
            height: { ideal: 720 },
            // @ts-ignore
            advanced: [{ focusMode: 'continuous' }, { zoom: 1.0 }, { frameRate: { ideal: 30 } }]
          },
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();

          // HARDWARE AUTOFOCUS FIX:
          // Apply constraints *after* the stream has started. This is much more reliable than getUserMedia constraints.
          const track = stream.getVideoTracks()[0];
          const capabilities = track.getCapabilities();

          // @ts-ignore
          if (capabilities.focusMode) {
            try {
              // Create a "pumping" effect to force focus? No, just set continuous explicitly.
              // @ts-ignore
              await track.applyConstraints({
                advanced: [{ focusMode: 'continuous' }]
              });
              console.log("Hardware autofocus enabled successfully");
            } catch (focusErr) {
              console.warn("Could not apply focus mode:", focusErr);
            }
          }
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

  // Scanning Loop for Web - Recursive/Adaptive
  useEffect(() => {
    let isRunning = true;
    let timeoutId: NodeJS.Timeout;

    const scanLoop = async () => {
      if (!isRunning || !isScannerActive || Capacitor.isNativePlatform()) return;

      await captureAndDecode();

      // Immediate next frame if active
      // Using setTimeout to allow UI thread to breathe, but keep it tight
      // 50ms = ~20 FPS max decoding speed (very fast)
      timeoutId = setTimeout(scanLoop, 50);
    };

    if (isScannerActive && !Capacitor.isNativePlatform()) {
      scanLoop();
    }

    return () => {
      isRunning = false;
      if (timeoutId) clearTimeout(timeoutId);
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

        if (image.webPath) {
          try {
            // Fetch the image as a blob
            const response = await fetch(image.webPath);
            const blob = await response.blob();
            const file = new File([blob], "scan.jpg", { type: "image/jpeg" });

            const html5QrCode = new Html5Qrcode("reader-hidden"); // ID doesn't matter for file scan, but instance needed?
            // Actually Html5Qrcode class allows static scanFile? No, instance method.
            // Better: Use Html5QrcodeScanner or just Html5Qrcode instance.
            // We don't have a DOM element "reader-hidden". 
            // Html5Qrcode needs an element ID constructor, but for scanFile it might not need it mounted?
            // Let's check docs memory: new Html5Qrcode("identifier") -> scanFile(file)
            // We can just use a dummy ID.

            const scanner = new Html5Qrcode("permission-request-dummy-element");

            // Note: scanFile(imageFile, showImage)
            const decodedText = await scanner.scanFile(file, false);

            if (decodedText) {
              const rawValue = decodedText;
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
              callbackRef.current.onScanFailure?.(new Error("No QR/Barcode found."));
            }

            // Cleanup? scanner.clear() isn't needed for file scan usually.
          } catch (err) {
            console.error("Html5Qrcode scan error:", err);
            callbackRef.current.onScanFailure?.(err as Error);
          }
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

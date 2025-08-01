import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Plus, ScanBarcode, Camera } from 'lucide-react';
import { ConsumptionRecord, ConsumptionItem, InventoryItem, ProductDefinition, Store } from '@/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { MultiFormatReader, NotFoundException, DecodeHintType, BarcodeFormat, RGBLuminanceSource, BinaryBitmap, HybridBinarizer } from '@zxing/library';
import { BarcodeScannerViewfinder } from '@/components/ui/BarcodeScannerViewfinder';
import { MobileSupplyItemCard } from '@/components/supplies/MobileSupplyItemCard';
import { addConsumptionRecord } from '@/data/operations/consumptionOperations';
import { getInventoryItems } from '@/data/operations/suppliesOperations';
import { getProductDefinitions } from '@/data/operations/productDefinitionOperations';
import { getStores } from '@/data/operations/storesOperations';
import FormHeader from './FormHeader';
import DateSelector from './DateSelector';
import NotesInput from './NotesInput';
import ConsumptionItemsTable from './ConsumptionItemsTable';
import FormActions from './FormActions';

interface ConsumptionFormProps {
  onSuccess?: () => void;
}

const ConsumptionForm: React.FC<ConsumptionFormProps> = ({ onSuccess }) => {
  const { t } = useLanguage();
  const { toast } = useToast();

  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [productDefs, setProductDefs] = useState<ProductDefinition[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<(Partial<ConsumptionItem> & { id: string; availableQuantity?: number })[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<string>('');
  
  const [isScanning, setIsScanning] = useState(false);
  const [isContinuousScanning, setIsContinuousScanning] = useState(false);
  const [activeScannerId, setActiveScannerId] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // --- Barcode Scanner Optimization ---
  const hints = new Map();
  const formats = [
    BarcodeFormat.CODE_128, 
    BarcodeFormat.EAN_13, 
    BarcodeFormat.DATA_MATRIX,
    BarcodeFormat.CODE_39,
    BarcodeFormat.UPC_A,
  ];
  hints.set(DecodeHintType.POSSIBLE_FORMATS, formats);
  const codeReader = new MultiFormatReader();
  // --- End Optimization ---

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [inventoryData, defsData, storesData] = await Promise.all([
          getInventoryItems(),
          getProductDefinitions(),
          getStores(),
        ]);
        setInventory(inventoryData);
        setProductDefs(defsData);
        setStores(storesData);
      } catch (error) {
        console.error("Failed to fetch form data", error);
        toast({ title: t('error'), description: t('error_fetching_data'), variant: 'destructive' });
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [toast, t]);

  const availableSupplies = inventory.filter(s => s.store_id === selectedStoreId && s.quantity > 0);

  const handleItemChange = useCallback((itemId: string, field: keyof ConsumptionItem, value: any) => {
    setItems(prevItems => prevItems.map(item => {
      if (item.id === itemId) {
        const updatedItem = { ...item, [field]: value };
        if (field === 'inventory_item_id') {
          const selectedSupply = inventory.find(s => s.id === value);
          updatedItem.availableQuantity = selectedSupply?.quantity || 0;
        }
        return updatedItem;
      }
      return item;
    }));
  }, [inventory]);

  const playBeep = useCallback(() => {
    if (!audioContextRef.current) {
      try {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      } catch (e) {
        console.error("Web Audio API is not supported in this browser");
        return;
      }
    }
    const oscillator = audioContextRef.current.createOscillator();
    const gainNode = audioContextRef.current.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioContextRef.current.destination);
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(880, audioContextRef.current.currentTime);
    gainNode.gain.setValueAtTime(0.5, audioContextRef.current.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioContextRef.current.currentTime + 0.1);
    oscillator.start(audioContextRef.current.currentTime);
    oscillator.stop(audioContextRef.current.currentTime + 0.1);
  }, []);

  const stopScan = useCallback(() => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsScanning(false);
    setActiveScannerId(null);
    setIsContinuousScanning(false);
  }, []);

  const handleBarcodeScanned = useCallback((barcode: string) => {
    const foundItem = availableSupplies.find(item => item.barcode === barcode);
    if (foundItem) {
      if (navigator.vibrate) navigator.vibrate(100);

      if (isContinuousScanning) {
        const newItemId = `item_${Date.now()}`;
        setItems(prev => [...prev, { id: newItemId, inventory_item_id: foundItem.id, quantity: 1, availableQuantity: foundItem.quantity }]);
        toast({ title: t('item_added'), description: `${productDefs.find(p => p.id === foundItem.product_definition_id)?.name} - ${foundItem.variant}` });
      } else {
        handleItemChange(activeScannerId!, 'inventory_item_id', foundItem.id);
        toast({ title: t('item_found'), description: `${t('item_with_barcode')} ${barcode} ${t('selected')}.` });
        stopScan();
      }
    } else {
      toast({ title: t('not_found'), description: `${t('item_with_barcode')} ${barcode} ${t('not_found_in_store')}.`, variant: 'destructive' });
    }
  }, [availableSupplies, isContinuousScanning, activeScannerId, stopScan, handleItemChange, toast, t, productDefs]);

  useEffect(() => {
    if (isScanning && activeScannerId && videoRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas?.getContext('2d');

      const constraints = {
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 },
          advanced: [{ focusMode: 'continuous' } as any]
        }
      };

      navigator.mediaDevices.getUserMedia(constraints)
        .then(stream => {
          video.srcObject = stream;
          video.setAttribute('playsinline', 'true');
          video.play();

          const scanInterval = setInterval(() => {
            if (video.readyState === video.HAVE_ENOUGH_DATA && canvas && context) {
              canvas.width = video.videoWidth;
              canvas.height = video.videoHeight;
              context.drawImage(video, 0, 0, canvas.width, canvas.height);
              
              try {
                const luminanceSource = new RGBLuminanceSource(context.getImageData(0, 0, canvas.width, canvas.height).data, canvas.width, canvas.height);
                const binaryBitmap = new BinaryBitmap(new HybridBinarizer(luminanceSource));
                const result = codeReader.decode(binaryBitmap, hints);
                if (result) {
                  if (!isContinuousScanning) clearInterval(scanInterval);
                  handleBarcodeScanned(result.getText());
                }
              } catch (err) {
                if (!(err instanceof NotFoundException)) {
                  // console.error('Scan Error:', err);
                }
              }
            }
          }, 500);

          return () => {
            clearInterval(scanInterval);
            stream.getTracks().forEach(track => track.stop());
          };
        })
        .catch(err => {
          console.error("Camera access error:", err);
          toast({ title: t('error'), description: t('failed_to_start_camera'), variant: 'destructive' });
          stopScan();
        });
    }
  }, [isScanning, activeScannerId, codeReader, stopScan, handleBarcodeScanned, t, toast, isContinuousScanning]);

  const startScan = useCallback((itemId: string, continuous = false) => {
    if (!selectedStoreId) {
      toast({ title: t('error'), description: t('please_select_store_first'), variant: 'destructive' });
      return;
    }
    setIsContinuousScanning(continuous);
    setActiveScannerId(itemId);
    setIsScanning(true);
  }, [selectedStoreId, toast, t]);

  const addNewItem = () => {
    setItems(prevItems => [...prevItems, { id: `item_${Date.now()}`, quantity: 1, inventory_item_id: '' }]);
  };

  const removeItem = (itemId: string) => {
    setItems(prevItems => prevItems.filter(item => item.id !== itemId));
  };

  const isFormValid = () => {
    if (!date || !selectedStoreId || items.length === 0) return false;
    for (const item of items) {
      if (!item.inventory_item_id || !item.quantity || item.quantity <= 0 || item.quantity > item.availableQuantity!) {
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid()) {
      toast({ title: t('error'), description: t('please_complete_all_fields_correctly'), variant: 'destructive' });
      return;
    }
    
    const newRecord = {
      date: date!.toISOString().split('T')[0],
      department: stores.find(s => s.id === selectedStoreId)?.name || 'N/A',
      requested_by: 'System',
      notes,
      purpose: 'use',
      items: items.map(({ id, availableQuantity, ...rest }) => ({ ...rest, quantity: Number(rest.quantity) }))
    };

    try {
      await addConsumptionRecord(newRecord as any);
      toast({ title: t('success'), description: t('consumption_record_created') });
      if (onSuccess) onSuccess();
    } catch (error: any) {
      const msg = error.message === 'insufficient_quantity' ? t('insufficient_quantity') : t('error_processing_consumption');
      toast({ title: t('error'), description: msg, variant: 'destructive' });
    }
  };

  return (
    <Card className="mb-8">
      <FormHeader title="new_consumption" description="consumption_form_description" />
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <DateSelector date={date} setDate={setDate} />
            <div className="space-y-2">
              <Label htmlFor="store">{t('store')}</Label>
              <Select value={selectedStoreId} onValueChange={setSelectedStoreId}>
                <SelectTrigger><SelectValue placeholder={t('select_store')} /></SelectTrigger>
                <SelectContent>{stores.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <NotesInput notes={notes} setNotes={setNotes} useTextarea={true} />
          
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">{t('items')}</h3>
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => startScan('continuous', true)} disabled={!selectedStoreId}>
                  <Camera className="h-4 w-4 mr-1" />{t('scan_continuously')}
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={addNewItem} disabled={!selectedStoreId}>
                  <Plus className="h-4 w-4 mr-1" />{t('add_item')}
                </Button>
              </div>
            </div>
            
            {isScanning && activeScannerId && (
              <div className="fixed inset-0 bg-black z-50">
                <video ref={videoRef} className="w-full h-full object-cover"></video>
                <canvas ref={canvasRef} className="hidden"></canvas>
                <BarcodeScannerViewfinder />
                <div className="absolute top-4 right-4 z-[51]">
                  <Button variant="destructive" onClick={stopScan}>{t('stop_scanning')}</Button>
                </div>
              </div>
            )}
            
            <ConsumptionItemsTable
              items={items}
              handleItemChange={handleItemChange}
              removeItem={removeItem}
              startScan={startScan}
              availableSupplies={availableSupplies}
              productDefs={productDefs}
            />
          </div>
          
          <FormActions onReset={() => setItems([])} isValid={isFormValid()} />
        </form>
      </CardContent>
    </Card>
  );
};

export default ConsumptionForm;

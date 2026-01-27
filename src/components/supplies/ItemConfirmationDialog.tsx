import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter, SheetDescription } from '@/components/ui/sheet';
import { CalendarIcon, Minus, Plus, Save } from 'lucide-react';
import { format } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { ParsedGS1Data } from '@/hooks/useBarcodeScanner';

interface ItemConfirmationDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (data: ConfirmedItemData) => void;
    scannedData: ParsedGS1Data | null;
    productName?: string;
    variantName?: string;
    defaultPrice?: number;
}

export interface ConfirmedItemData {
    quantity: number;
    expiryDate?: Date;
    batchNumber: string;
    purchasePrice: number;
    sellingPrice?: number;
}

const ItemConfirmationDialog: React.FC<ItemConfirmationDialogProps> = ({
    isOpen,
    onClose,
    onConfirm,
    scannedData,
    productName = "Unknown Product",
    variantName = "Standard",
    defaultPrice = 0
}) => {
    const { t } = useLanguage();

    const [quantity, setQuantity] = useState(1);
    const [purchasePrice, setPurchasePrice] = useState(defaultPrice);
    const [batchNumber, setBatchNumber] = useState('');
    const [expiryDate, setExpiryDate] = useState<Date | undefined>(undefined);

    useEffect(() => {
        if (isOpen && scannedData) {
            // Parse quantity from GS1 if available, otherwise default to 1
            setQuantity(scannedData.quantity ? parseInt(scannedData.quantity) : 1);

            // Parse expiry from GS1
            if (scannedData.expiryDate) {
                setExpiryDate(new Date(scannedData.expiryDate));
            }

            // Parse batch from GS1
            setBatchNumber(scannedData.lotNumber || '');

            // Reset price to default if provided
            setPurchasePrice(defaultPrice);
        }
    }, [isOpen, scannedData, defaultPrice]);

    const handleConfirm = () => {
        if (!expiryDate) {
            // Simple alert for validation
            alert(t('expiry_date_required') || "Expiry Date is required");
            return;
        }

        onConfirm({
            quantity,
            expiryDate,
            batchNumber,
            purchasePrice,
        });
        onClose();
    };

    const adjustQuantity = (delta: number) => {
        setQuantity(prev => Math.max(1, prev + delta));
    };

    return (
        <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <SheetContent side="bottom" className="rounded-t-[20px] max-h-[90vh] overflow-y-auto">
                <SheetHeader className="mb-6">
                    <SheetTitle className="text-xl flex flex-col gap-1 items-start">
                        <span className="text-primary text-sm font-normal uppercase tracking-wider">{t('confirm_item')}</span>
                        <span>{productName}</span>
                    </SheetTitle>
                    <SheetDescription className="text-left font-medium text-foreground">
                        {variantName}
                    </SheetDescription>
                </SheetHeader>

                <div className="grid gap-6 py-4">
                    {/* Quantity Section - Big Buttons */}
                    <div className="flex flex-col gap-2">
                        <Label className="text-muted-foreground">{t('quantity')}</Label>
                        <div className="flex items-center gap-4">
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-12 w-12 rounded-full border-2"
                                onClick={() => adjustQuantity(-1)}
                            >
                                <Minus className="h-6 w-6" />
                            </Button>
                            <div className="flex-1 text-center">
                                <Input
                                    type="number"
                                    value={quantity}
                                    onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                                    className="h-12 text-center text-2xl font-bold border-none shadow-none focus-visible:ring-0"
                                />
                            </div>
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-12 w-12 rounded-full border-2"
                                onClick={() => adjustQuantity(1)}
                            >
                                <Plus className="h-6 w-6" />
                            </Button>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {/* Batch Number */}
                        <div className="space-y-2 col-span-2 sm:col-span-1">
                            <Label htmlFor="batch">{t('batch_number')}</Label>
                            <Input
                                id="batch"
                                value={batchNumber}
                                onChange={(e) => setBatchNumber(e.target.value)}
                                placeholder="LOT123..."
                                className="h-11"
                            />
                        </div>

                        {/* Expiry Date */}
                        <div className="space-y-2 col-span-2 sm:col-span-1">
                            <Label>{t('expiry_date')}</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant={"outline"}
                                        className={cn(
                                            "w-full h-11 justify-start text-left font-normal",
                                            !expiryDate && "text-muted-foreground"
                                        )}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {expiryDate ? format(expiryDate, "PPP") : <span>Pick a date</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                        mode="single"
                                        selected={expiryDate}
                                        onSelect={setExpiryDate}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>
                    </div>

                    {/* Price */}
                    <div className="space-y-2">
                        <Label htmlFor="price">{t('purchase_price')} (SAR)</Label>
                        <Input
                            id="price"
                            type="number"
                            value={purchasePrice}
                            onChange={(e) => setPurchasePrice(parseFloat(e.target.value) || 0)}
                            className="h-11 text-lg font-semibold"
                        />
                    </div>
                </div>

                <SheetFooter className="mt-8 gap-2 sm:gap-0">
                    <Button variant="outline" onClick={onClose} className="h-12 flex-1 sm:flex-none">
                        {t('cancel')}
                    </Button>
                    <Button onClick={handleConfirm} className="h-12 flex-1 text-lg">
                        <Save className="mr-2 h-5 w-5" />
                        {t('confirm_and_add')}
                    </Button>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
};

export default ItemConfirmationDialog;

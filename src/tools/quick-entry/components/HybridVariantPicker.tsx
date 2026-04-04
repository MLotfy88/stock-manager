import React, { useState, useRef } from 'react';
import { cn } from '@/lib/utils';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface PickerOption {
    value: string;
    label: string;
}

interface HybridVariantPickerProps {
    primaryOptions: PickerOption[];
    primaryLabel: string;
    secondaryOptions: PickerOption[];
    secondaryLabel: string;
    onSelect: (variant: string) => void;
    selectedVariant?: string;
    separator?: string;
    secondaryMode?: 'buttons' | 'dropdown';
}

export const HybridVariantPicker: React.FC<HybridVariantPickerProps> = ({
    primaryOptions,
    primaryLabel,
    secondaryOptions,
    secondaryLabel,
    onSelect,
    selectedVariant,
    separator = 'x',
    secondaryMode = 'buttons'
}) => {
    // Parse current selection
    const [currentPrimary, currentSecondary] = selectedVariant
        ? selectedVariant.split(/[\sxX×*]+/).reduce((acc, val, idx, arr) => {
            if (arr.length === 2) return arr;
            return [arr[0], arr.slice(1).join(separator)];
        }, ['', ''])
        : ['', ''];

    const [activePrimary, setActivePrimary] = useState<string>(currentPrimary || '');
    const [activeSecondary, setActiveSecondary] = useState<string>(currentSecondary || '');

    const handlePrimarySelect = (value: string) => {
        setActivePrimary(value);
        if (activeSecondary) {
            onSelect(`${value}${separator}${activeSecondary}`);
        }
    };

    const handleSecondarySelect = (value: string) => {
        setActiveSecondary(value);
        if (activePrimary) {
            onSelect(`${activePrimary}${separator}${value}`);
        }
    };

    return (
        <div className="space-y-4 p-2 w-full max-w-[400px]">
            {/* Primary Dimension */}
            <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase text-muted-foreground flex justify-between">
                    {primaryLabel}
                    {activePrimary && <span className="text-primary">{activePrimary}</span>}
                </Label>
                <div className="relative">
                    <div className="w-full border rounded-lg bg-muted/20 p-2">
                        <div className="flex flex-wrap gap-2">
                            {primaryOptions.map((opt) => (
                                <button
                                    key={opt.value}
                                    onClick={() => handlePrimarySelect(opt.value)}
                                    className={cn(
                                        "h-10 px-4 min-w-[3rem] rounded-md text-sm font-medium transition-all border",
                                        activePrimary === opt.value
                                            ? "bg-primary text-primary-foreground border-primary shadow-sm scale-105"
                                            : "bg-background hover:bg-muted text-foreground border-border/50 hover:border-primary/50"
                                    )}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Secondary Dimension */}
            <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase text-muted-foreground flex justify-between">
                    {secondaryLabel}
                    {activeSecondary && <span className="text-primary">{activeSecondary}</span>}
                </Label>

                {secondaryMode === 'dropdown' ? (
                    <Select value={activeSecondary} onValueChange={handleSecondarySelect}>
                        <SelectTrigger className="w-full h-11">
                            <SelectValue placeholder={`Select ${secondaryLabel}`} />
                        </SelectTrigger>
                        <SelectContent>
                            {secondaryOptions.map(opt => (
                                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                ) : (
                    <div className="relative">
                        <div className="w-full border rounded-lg bg-muted/20 p-2">
                            <div className="flex flex-wrap gap-2">
                                {secondaryOptions.map((opt) => (
                                    <button
                                        key={opt.value}
                                        onClick={() => handleSecondarySelect(opt.value)}
                                        className={cn(
                                            "h-10 px-4 min-w-[3rem] rounded-md text-sm font-medium transition-all border",
                                            activeSecondary === opt.value
                                                ? "bg-secondary text-secondary-foreground border-secondary shadow-sm scale-105"
                                                : "bg-background hover:bg-muted text-foreground border-border/50 hover:border-secondary/50"
                                        )}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Summary */}
            <div className="pt-2 border-t mt-2">
                <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Result:</span>
                    {activePrimary && activeSecondary ? (
                        <div className="px-3 py-1 bg-primary/10 rounded-full border border-primary/20">
                            <span className="font-bold text-primary">{activePrimary}</span>
                            <span className="text-muted-foreground mx-1">{separator}</span>
                            <span className="font-bold text-primary">{activeSecondary}</span>
                        </div>
                    ) : (
                        <span className="text-xs text-muted-foreground italic">Incomplete selection</span>
                    )}
                </div>
            </div>
        </div>
    );
};

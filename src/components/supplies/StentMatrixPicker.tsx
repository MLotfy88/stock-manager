import React, { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { ProductVariant } from '@/types';

interface StentMatrixPickerProps {
    availableVariants: ProductVariant[];
    selectedVariant?: string;
    onSelect: (variant: string) => void;
}

export const StentMatrixPicker: React.FC<StentMatrixPickerProps> = ({
    availableVariants = [],
    selectedVariant,
    onSelect
}) => {
    // Dynamic parsing logic
    const { diameters, lengths, matrix } = useMemo(() => {
        const uniqueDiameters = new Set<string>();
        const uniqueLengths = new Set<string>();
        const variantMap = new Map<string, string>(); // 'DxL' -> OriginalName

        availableVariants.forEach(v => {
            // Robust cleaning: Replace various 'x' symbols with standard 'x'
            const cleanName = v.name.replace(/\s/g, '').replace(/[X×*]/g, 'x').toLowerCase();

            const parts = cleanName.split('x');
            if (parts.length === 2) {
                let d = parts[0];
                let l = parts[1];

                // Auto-Swap heuristic: Stent diameters are 2.0-5.0. Lengths are 8-40.
                const nd = parseFloat(d);
                const nl = parseFloat(l);
                if (!isNaN(nd) && !isNaN(nl)) {
                    if (nd > 5 && nl <= 5) {
                        // Swapped! nd is likely length, nl is likely diameter
                        const temp = d;
                        d = l;
                        l = temp;
                    }
                }

                uniqueDiameters.add(d);
                uniqueLengths.add(l);
                // Important: we store it as `${d}x${l}` but link to original v.name
                variantMap.set(`${d}x${l}`, v.name);
            }
        });

        // Sort numerically
        const sortedDiameters = Array.from(uniqueDiameters).sort((a, b) => parseFloat(a) - parseFloat(b));
        const sortedLengths = Array.from(uniqueLengths).sort((a, b) => parseFloat(a) - parseFloat(b));

        return { diameters: sortedDiameters, lengths: sortedLengths, matrix: variantMap };
    }, [availableVariants]);

    // Parse selected variant
    // We try to match it against our normalized map to find 'd' and 'l'
    const [selectedD, selectedL] = useMemo(() => {
        if (!selectedVariant) return ['', ''];
        const clean = selectedVariant.replace(/\s/g, '').replace(/[X×*]/g, 'x').toLowerCase();
        const parts = clean.split('x');
        return parts.length === 2 ? parts : ['', ''];
    }, [selectedVariant]);

    return (
        <div className="space-y-4 select-none">
            {/* Legend with scroll hint */}
            <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
                <span>Diameter (mm) ↓</span>
                <span className="flex items-center gap-1">
                    Length (mm) →
                    <span className="text-primary text-[10px]">(scroll →)</span>
                </span>
            </div>

            <div
                dir="ltr"
                className="w-full max-h-64 overflow-auto border rounded-lg bg-card/50 p-2 touch-auto overscroll-contain"
                style={{
                    WebkitOverflowScrolling: 'touch',
                    touchAction: 'pan-x pan-y'
                }}
                data-vaul-no-drag
                onPointerDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
            >
                <div className="min-w-max flex flex-col gap-2">
                    {/* Header Row (Lengths) */}
                    <div className="flex gap-2 mb-2 ml-14">
                        {lengths.map(len => (
                            <div key={len} className="w-10 text-center font-mono text-xs font-bold text-muted-foreground">
                                {len}
                            </div>
                        ))}
                    </div>

                    {/* Matrix Rows */}
                    {diameters.map(diam => (
                        <div key={diam} className="flex gap-2 items-center">
                            {/* Diameter Label */}
                            <div className={cn(
                                "w-12 text-center font-mono text-sm font-bold py-1.5 rounded bg-muted/50",
                                selectedD === diam && "bg-primary text-primary-foreground"
                            )}>
                                {diam}
                            </div>

                            {/* Length Buttons */}
                            {lengths.map(len => {
                                const key = `${diam}x${len}`;
                                const originalName = matrix.get(key); // Get the ACTUAL name to return
                                const exists = !!originalName;
                                const isSelected = selectedD === diam && selectedL === len;

                                return (
                                    <button
                                        key={key}
                                        disabled={!exists}
                                        onClick={() => exists && onSelect(originalName!)}
                                        className={cn(
                                            "w-10 h-8 rounded text-xs transition-all border",
                                            !exists && "opacity-20 cursor-not-allowed bg-slate-100 dark:bg-slate-800 border-transparent",
                                            exists && !isSelected && "bg-background hover:bg-muted text-muted-foreground hover:border-primary/50",
                                            isSelected && "bg-primary text-primary-foreground font-bold shadow-md scale-105 border-primary"
                                        )}
                                        title={originalName || "Unavailable"}
                                    >
                                        {isSelected ? '✓' : (exists ? '•' : '')}
                                    </button>
                                );
                            })}
                        </div>
                    ))}

                    {diameters.length === 0 && (
                        <div className="p-4 text-center text-muted-foreground text-sm">
                            No valid matrix variants found (format: Dia x Len)
                        </div>
                    )}
                </div>
            </div>

            {/* Selection Summary */}
            <div className="flex justify-center h-8">
                {selectedVariant ? (
                    <div className="text-sm font-bold bg-primary/10 text-primary px-4 py-1 rounded-full animate-in fade-in zoom-in">
                        Selected: {selectedVariant}
                    </div>
                ) : (
                    <span className="text-xs text-muted-foreground pt-1">Tap a cell to select size</span>
                )}
            </div>
        </div>
    );
};

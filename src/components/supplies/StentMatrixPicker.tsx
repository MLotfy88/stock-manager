
import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

interface StentMatrixPickerProps {
    selectedDiameter?: string;
    selectedLength?: string;
    onSelect: (diameter: string, length: string) => void;
}

const DIAMETERS = ['2.25', '2.50', '2.75', '3.00', '3.50', '4.00', '4.50'];
const LENGTHS = ['8', '12', '15', '18', '20', '23', '26', '28', '30', '33', '38', '48'];

export const StentMatrixPicker: React.FC<StentMatrixPickerProps> = ({
    selectedDiameter,
    selectedLength,
    onSelect
}) => {
    return (
        <div className="space-y-4 select-none">
            {/* Legend */}
            <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
                <span>Diameter (mm) ↓</span>
                <span>Length (mm) →</span>
            </div>

            <ScrollArea className="w-full whitespace-nowrap border rounded-lg bg-card/50 p-2">
                <div className="flex flex-col gap-2">
                    {/* Header Row (Lengths) */}
                    <div className="flex gap-2 mb-2 ml-14">
                        {LENGTHS.map(len => (
                            <div key={len} className="w-10 text-center font-mono text-xs font-bold text-muted-foreground">
                                {len}
                            </div>
                        ))}
                    </div>

                    {/* Matrix Rows */}
                    {DIAMETERS.map(diam => (
                        <div key={diam} className="flex gap-2 items-center">
                            {/* Diameter Label */}
                            <div className={cn(
                                "w-12 text-center font-mono text-sm font-bold py-1.5 rounded bg-muted/50",
                                selectedDiameter === diam && "bg-primary text-primary-foreground"
                            )}>
                                {diam}
                            </div>

                            {/* Length Buttons */}
                            {LENGTHS.map(len => {
                                const isSelected = selectedDiameter === diam && selectedLength === len;
                                return (
                                    <button
                                        key={`${diam}x${len}`}
                                        onClick={() => onSelect(diam, len)}
                                        className={cn(
                                            "w-10 h-8 rounded text-xs transition-all border hover:border-primary/50",
                                            isSelected
                                                ? "bg-primary text-primary-foreground font-bold shadow-md scale-105"
                                                : "bg-background hover:bg-muted text-muted-foreground"
                                        )}
                                    >
                                        {isSelected ? '✓' : ''}
                                    </button>
                                );
                            })}
                        </div>
                    ))}
                </div>
                <ScrollBar orientation="horizontal" />
            </ScrollArea>

            {/* Selection Summary */}
            <div className="flex justify-center h-8">
                {selectedDiameter && selectedLength ? (
                    <div className="text-sm font-bold bg-primary/10 text-primary px-4 py-1 rounded-full animate-in fade-in zoom-in">
                        Selected: {selectedDiameter}mm x {selectedLength}mm
                    </div>
                ) : (
                    <span className="text-xs text-muted-foreground pt-1">Tap a cell to select size</span>
                )}
            </div>
        </div>
    );
};

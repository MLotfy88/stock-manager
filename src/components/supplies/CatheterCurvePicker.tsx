
import React from 'react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Check } from 'lucide-react';

interface CurveType {
    id: string;
    code: string;
    name: string;
    description?: string;
    color?: string; // Optional color indicator
    imageUrl?: string; // Optional schematic image
}

const COMMON_CURVES: CurveType[] = [
    { id: 'jl35', code: 'JL 3.5', name: 'Judkins Left 3.5', color: '#3b82f6' },
    { id: 'jl4', code: 'JL 4.0', name: 'Judkins Left 4.0', color: '#1d4ed8' },
    { id: 'jl5', code: 'JL 5.0', name: 'Judkins Left 5.0', color: '#1e40af' },
    { id: 'jr35', code: 'JR 3.5', name: 'Judkins Right 3.5', color: '#ef4444' },
    { id: 'jr4', code: 'JR 4.0', name: 'Judkins Right 4.0', color: '#b91c1c' },
    { id: 'al1', code: 'AL 1.0', name: 'Amplatz Left 1', color: '#10b981' },
    { id: 'al2', code: 'AL 2.0', name: 'Amplatz Left 2', color: '#059669' },
    { id: 'pig', code: 'PIG', name: 'Pigtail', color: '#f59e0b' },
    { id: 'mp', code: 'MP', name: 'Multipurpose', color: '#8b5cf6' },
];

interface CatheterCurvePickerProps {
    selectedCurve: string;
    onSelect: (curve: string) => void;
    className?: string;
}

export const CatheterCurvePicker: React.FC<CatheterCurvePickerProps> = ({
    selectedCurve,
    onSelect,
    className
}) => {
    return (
        <div className={cn("grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3", className)}>
            {COMMON_CURVES.map((curve) => {
                const isSelected = selectedCurve === curve.code;
                return (
                    <Card
                        key={curve.id}
                        onClick={() => onSelect(curve.code)}
                        className={cn(
                            "cursor-pointer transition-all duration-200 hover:scale-105 active:scale-95 border-2 flex flex-col items-center justify-center p-3 h-24 text-center relative overflow-hidden",
                            isSelected
                                ? "border-primary bg-primary/5 shadow-md ring-2 ring-primary/20 ring-offset-2"
                                : "border-transparent bg-muted/30 hover:bg-muted hover:border-muted-foreground/20"
                        )}
                    >
                        {/* Color Accent */}
                        <div
                            className="absolute top-0 right-0 w-8 h-8 -mr-4 -mt-4 transform rotate-45"
                            style={{ backgroundColor: curve.color || '#94a3b8' }}
                        />

                        <span className="font-bold text-lg leading-tight">{curve.code}</span>
                        <span className="text-[10px] text-muted-foreground mt-1 line-clamp-1">{curve.name}</span>

                        {isSelected && (
                            <div className="absolute top-1 right-1 bg-primary text-primary-foreground rounded-full p-0.5">
                                <Check className="h-3 w-3" />
                            </div>
                        )}
                    </Card>
                );
            })}
        </div>
    );
};

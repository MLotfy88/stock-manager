import React, { useMemo, useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Check } from 'lucide-react';
import { ProductVariant } from '@/types';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';

interface CatheterCurvePickerProps {
    availableVariants: ProductVariant[];
    selectedCurve: string;
    onSelect: (curve: string) => void;
    className?: string;
}

// Helper to guess shape colors
const getShapeColor = (shape: string) => {
    const s = shape.toUpperCase();
    if (s.startsWith('JL')) return '#3b82f6'; // Blue
    if (s.startsWith('JR')) return '#ef4444'; // Red
    if (s.startsWith('AL')) return '#10b981'; // Green
    if (s.startsWith('AR')) return '#f97316'; // Orange
    if (s.startsWith('PIG')) return '#f59e0b'; // Amber
    if (s.startsWith('MP')) return '#8b5cf6'; // Purple
    if (s.startsWith('XB')) return '#ec4899'; // Pink
    return '#64748b'; // Slate
};

export const CatheterCurvePicker: React.FC<CatheterCurvePickerProps> = ({
    availableVariants = [],
    selectedCurve,
    onSelect,
    className
}) => {
    // Group variants by Shape (Prefix)
    const { groups, shapes } = useMemo(() => {
        const g: Record<string, ProductVariant[]> = {};
        const s: string[] = [];

        availableVariants.forEach(v => {
            // Regex to split "JL 3.5" -> "JL" and "3.5"
            // Also handles "JL3.5" (no space)
            const match = v.name.match(/^([A-Za-z]+)\s*([0-9\.]+|.*)$/);
            let shape = 'Other';
            if (match) {
                shape = match[1].toUpperCase();
            }

            if (!g[shape]) {
                g[shape] = [];
                s.push(shape);
            }
            g[shape].push(v);
        });

        // Sort shapes: specific order preferences? 
        // For now, alphabetical but JL/JR first if possible
        s.sort((a, b) => {
            const priority = ['JL', 'JR', 'AL', 'AR', 'PIG'];
            const idxA = priority.indexOf(a);
            const idxB = priority.indexOf(b);
            if (idxA !== -1 && idxB !== -1) return idxA - idxB;
            if (idxA !== -1) return -1;
            if (idxB !== -1) return 1;
            return a.localeCompare(b);
        });

        return { groups: g, shapes: s };
    }, [availableVariants]);

    const [activeTab, setActiveTab] = useState<string>(shapes[0] || 'Other');

    // Auto-switch tab if external selection changes
    useEffect(() => {
        if (selectedCurve) {
            const match = selectedCurve.match(/^([A-Za-z]+)\s*([0-9\.]+|.*)$/);
            if (match) {
                const shape = match[1].toUpperCase();
                if (shapes.includes(shape)) {
                    setActiveTab(shape);
                }
            }
        }
    }, [selectedCurve, shapes]);

    if (shapes.length === 0) {
        return <div className="text-center text-muted-foreground p-4">No variants found.</div>;
    }

    return (
        <div className={cn("space-y-4", className)}>
            {/* Shape Tabs */}
            <div className="flex flex-wrap gap-2 mb-4">
                {shapes.map(shape => (
                    <button
                        key={shape}
                        onClick={() => setActiveTab(shape)}
                        className={cn(
                            "px-4 py-2 rounded-full text-sm font-bold transition-all border-2",
                            activeTab === shape
                                ? "bg-primary text-primary-foreground border-primary shadow-md"
                                : "bg-background text-muted-foreground border-muted hover:border-primary/50"
                        )}
                    >
                        {shape}
                    </button>
                ))}
            </div>

            {/* Variants Grid for Active Shape */}
            <div className="w-full rounded-md border p-2 bg-muted/20">
                <div className="flex flex-wrap gap-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    {groups[activeTab]?.map((variant) => {
                        const isSelected = selectedCurve === variant.name;
                        // Extract display label (suffix) if possible
                        const match = variant.name.match(/^([A-Za-z]+)\s*([0-9\.]+|.*)$/);
                        const label = match ? match[2] : variant.name;

                        return (
                            <button
                                key={variant.name}
                                onClick={() => onSelect(variant.name)}
                                className={cn(
                                    "flex items-center justify-center p-3 h-14 min-w-[4rem] rounded-md text-sm font-bold border transition-all relative overflow-hidden",
                                    isSelected
                                        ? "border-primary bg-primary text-primary-foreground shadow-md scale-105"
                                        : "border-border bg-background hover:bg-muted hover:border-primary/50"
                                )}
                            >
                                {/* Color Accent (Optional - simplified for button style) */}
                                <div
                                    className="absolute top-0 right-0 w-3 h-3 -mr-1.5 -mt-1.5 transform rotate-45 opacity-50"
                                    style={{ backgroundColor: getShapeColor(activeTab) }}
                                />

                                <span>{label}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="h-4"></div>
        </div>
    );
};

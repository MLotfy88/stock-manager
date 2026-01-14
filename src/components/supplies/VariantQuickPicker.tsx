import React, { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ProductVariant } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Star } from 'lucide-react';

interface VariantQuickPickerProps {
    variants: ProductVariant[];
    selectedVariant: string;
    onSelect: (variant: string) => void;
    recentVariants?: string[];
    className?: string;
}

interface GroupedVariants {
    recent: ProductVariant[];
    L: ProductVariant[];
    R: ProductVariant[];
    AL: ProductVariant[];
    AR: ProductVariant[];
    other: ProductVariant[];
}

export const VariantQuickPicker: React.FC<VariantQuickPickerProps> = ({
    variants,
    selectedVariant,
    onSelect,
    recentVariants = [],
    className = ''
}) => {
    // Group variants by type
    const grouped = useMemo<GroupedVariants>(() => {
        const groups: GroupedVariants = {
            recent: [],
            L: [],
            R: [],
            AL: [],
            AR: [],
            other: []
        };

        // Add recent variants first
        recentVariants.forEach(name => {
            const variant = variants.find(v => v.name === name);
            if (variant && !groups.recent.find(v => v.name === variant.name)) {
                groups.recent.push(variant);
            }
        });

        // Group remaining variants
        variants.forEach(v => {
            if (recentVariants.includes(v.name)) return; // Skip already in recent

            if (v.name.startsWith('AL')) {
                groups.AL.push(v);
            } else if (v.name.startsWith('AR')) {
                groups.AR.push(v);
            } else if (v.name.startsWith('L')) {
                groups.L.push(v);
            } else if (v.name.startsWith('R')) {
                groups.R.push(v);
            } else {
                groups.other.push(v);
            }
        });

        return groups;
    }, [variants, recentVariants]);

    const hasGroups = grouped.L.length > 0 || grouped.R.length > 0 || grouped.AL.length > 0 || grouped.AR.length > 0;

    if (!hasGroups && grouped.other.length > 0) {
        // Fallback to regular dropdown if no grouping is possible
        return (
            <Select value={selectedVariant} onValueChange={onSelect}>
                <SelectTrigger className={className}>
                    <SelectValue placeholder="اختر المتغير..." />
                </SelectTrigger>
                <SelectContent>
                    {variants.map(v => (
                        <SelectItem key={v.name} value={v.name}>
                            {v.name}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        );
    }

    return (
        <div className={`space-y-3 ${className}`}>
            {/* Recent Variants */}
            {grouped.recent.length > 0 && (
                <div>
                    <Label className="text-xs text-amber-600 mb-2 flex items-center gap-1">
                        <Star className="h-3 w-3 fill-amber-500" />
                        آخر استخدام
                    </Label>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                        {grouped.recent.map(v => (
                            <Button
                                key={v.name}
                                type="button"
                                size="sm"
                                variant={selectedVariant === v.name ? 'default' : 'secondary'}
                                onClick={() => onSelect(v.name)}
                                className="font-mono text-xs h-9"
                            >
                                {v.name}
                            </Button>
                        ))}
                    </div>
                </div>
            )}

            {/* Left Curves */}
            {grouped.L.length > 0 && (
                <div>
                    <Label className="text-xs text-blue-600 mb-2">← Left</Label>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                        {grouped.L.map(v => (
                            <Button
                                key={v.name}
                                type="button"
                                size="sm"
                                variant={selectedVariant === v.name ? 'default' : 'outline'}
                                onClick={() => onSelect(v.name)}
                                className="font-mono text-xs bg-blue-50 hover:bg-blue-100 border-blue-200 h-9"
                            >
                                {v.name}
                            </Button>
                        ))}
                    </div>
                </div>
            )}

            {/* Right Curves */}
            {grouped.R.length > 0 && (
                <div>
                    <Label className="text-xs text-red-600 mb-2">→ Right</Label>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                        {grouped.R.map(v => (
                            <Button
                                key={v.name}
                                type="button"
                                size="sm"
                                variant={selectedVariant === v.name ? 'default' : 'outline'}
                                onClick={() => onSelect(v.name)}
                                className="font-mono text-xs bg-red-50 hover:bg-red-100 border-red-200 h-9"
                            >
                                {v.name}
                            </Button>
                        ))}
                    </div>
                </div>
            )}

            {/* Amplatz Left */}
            {grouped.AL.length > 0 && (
                <div>
                    <Label className="text-xs text-green-600 mb-2">↖ Amplatz Left</Label>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                        {grouped.AL.map(v => (
                            <Button
                                key={v.name}
                                type="button"
                                size="sm"
                                variant={selectedVariant === v.name ? 'default' : 'outline'}
                                onClick={() => onSelect(v.name)}
                                className="font-mono text-xs bg-green-50 hover:bg-green-100 border-green-200 h-9"
                            >
                                {v.name}
                            </Button>
                        ))}
                    </div>
                </div>
            )}

            {/* Amplatz Right */}
            {grouped.AR.length > 0 && (
                <div>
                    <Label className="text-xs text-yellow-600 mb-2">↗ Amplatz Right</Label>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                        {grouped.AR.map(v => (
                            <Button
                                key={v.name}
                                type="button"
                                size="sm"
                                variant={selectedVariant === v.name ? 'default' : 'outline'}
                                onClick={() => onSelect(v.name)}
                                className="font-mono text-xs bg-yellow-50 hover:bg-yellow-100 border-yellow-200 h-9"
                            >
                                {v.name}
                            </Button>
                        ))}
                    </div>
                </div>
            )}

            {/* Other Variants (fallback dropdown) */}
            {grouped.other.length > 0 && (
                <div>
                    <Label className="text-xs text-muted-foreground mb-2">متغيرات أخرى</Label>
                    <Select value={selectedVariant} onValueChange={onSelect}>
                        <SelectTrigger>
                            <SelectValue placeholder="اختر..." />
                        </SelectTrigger>
                        <SelectContent>
                            {grouped.other.map(v => (
                                <SelectItem key={v.name} value={v.name}>
                                    {v.name} (حد الطلب: {v.reorder_point})
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            )}
        </div>
    );
};

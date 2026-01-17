import React, { useMemo } from 'react';
import { HybridVariantPicker, PickerOption } from './HybridVariantPicker';
import { ProductVariant } from '@/types';

interface SmartHybridPickerProps {
    availableVariants: ProductVariant[];
    selectedVariant?: string;
    onSelect: (variant: string) => void;
    primaryLabel: string;
    secondaryLabel: string;
    separator: string; // 'x' or ' '
    mode?: 'balloon' | 'guide' | 'general'; // Hint for parsing logic
}

export const SmartHybridPicker: React.FC<SmartHybridPickerProps> = ({
    availableVariants,
    selectedVariant,
    onSelect,
    primaryLabel,
    secondaryLabel,
    separator,
    mode = 'general'
}) => {

    const { primaryOptions, secondaryOptions } = useMemo(() => {
        // 1. Parse all variants
        const parsed = (availableVariants || []).map(v => {
            const name = v.name;
            let p = '', s = '';

            if (mode === 'balloon') {
                // Expect "Diam x Len" e.g. "2.00x20", "2.50 x 15"
                const parts = name.split(/[\sxX×*]+/);
                if (parts.length >= 2) {
                    let pVal = parts[0];
                    let sVal = parts[1];

                    // Heuristic Auto-Swap:
                    // Balloons diameters are 1.25-5.0. Lengths are 6-30.
                    // If pVal > sVal and pVal > 5, it's likely Length x Diameter.
                    const n1 = parseFloat(pVal.replace(/[^0-9.]/g, ''));
                    const n2 = parseFloat(sVal.replace(/[^0-9.]/g, ''));

                    if (!isNaN(n1) && !isNaN(n2)) {
                        if (n1 > 5 && n2 <= 5) {
                            // Swap them
                            p = sVal;
                            s = pVal;
                        } else {
                            p = pVal;
                            s = sVal;
                        }
                    } else {
                        p = pVal;
                        s = sVal;
                    }
                } else {
                    p = name; s = '?';
                }
            } else if (mode === 'guide') {
                // Expect "Curve Size" e.g. "JL4 6F", "XB 3.5 6F"
                // usually Size is the last token (e.g. 5F, 6F, 7F) or similar
                // We can split by space
                const parts = name.trim().split(/\s+/);
                if (parts.length >= 2) {
                    // Assume last part is size, rest is curve
                    s = parts[parts.length - 1];
                    p = parts.slice(0, parts.length - 1).join(' ');
                } else {
                    p = name; s = '?';
                }
            } else {
                // General split by separator char (naive)
                const parts = name.split(separator);
                if (parts.length >= 2) {
                    p = parts[0];
                    s = parts.slice(1).join(separator);
                }
            }
            return { original: name, primary: p, secondary: s };
        }).filter(x => x && x.primary && x.secondary && x.secondary !== '?');

        // 2. Extract Unique Options
        const pSet = new Set<string>();
        const sSet = new Set<string>();

        parsed.forEach(item => {
            pSet.add(item.primary);
            sSet.add(item.secondary);
        });

        // 3. Sort
        // Try numeric sort if possible
        const sortFn = (a: string, b: string) => {
            const na = parseFloat(a.replace(/[^0-9.]/g, ''));
            const nb = parseFloat(b.replace(/[^0-9.]/g, ''));
            if (!isNaN(na) && !isNaN(nb)) return na - nb;
            return a.localeCompare(b);
        };

        const pOpts: PickerOption[] = Array.from(pSet).sort(sortFn).map(val => ({ value: val, label: val }));
        const sOpts: PickerOption[] = Array.from(sSet).sort(sortFn).map(val => ({ value: val, label: val }));

        return { primaryOptions: pOpts, secondaryOptions: sOpts };

    }, [availableVariants, separator, mode]);

    // Fallback Constants
    const BALLOON_DIAMETERS_FALLBACK = [
        { value: '1.25', label: '1.25' }, { value: '1.50', label: '1.50' }, { value: '1.75', label: '1.75' },
        { value: '2.00', label: '2.00' }, { value: '2.25', label: '2.25' }, { value: '2.50', label: '2.50' },
        { value: '2.75', label: '2.75' }, { value: '3.00', label: '3.00' }, { value: '3.25', label: '3.25' },
        { value: '3.50', label: '3.50' }, { value: '4.00', label: '4.00' }, { value: '4.50', label: '4.50' },
        { value: '5.00', label: '5.00' }
    ];
    const BALLOON_LENGTHS_FALLBACK = [
        { value: '6', label: '6' }, { value: '8', label: '8' }, { value: '10', label: '10' },
        { value: '12', label: '12' }, { value: '15', label: '15' }, { value: '20', label: '20' },
        { value: '25', label: '25' }, { value: '30', label: '30' }
    ];
    const GUIDE_CURVES_FALLBACK = [
        { value: 'JL3.5', label: 'JL3.5' }, { value: 'JL4.0', label: 'JL4.0' }, { value: 'JL4.5', label: 'JL4.5' },
        { value: 'JL5.0', label: 'JL5.0' }, { value: 'JR3.5', label: 'JR3.5' }, { value: 'JR4.0', label: 'JR4.0' },
        { value: 'JR4.5', label: 'JR4.5' }, { value: 'AL.75', label: 'AL.75' }, { value: 'AL1.0', label: 'AL1.0' },
        { value: 'AL1.5', label: 'AL1.5' }, { value: 'AL2.0', label: 'AL2.0' }, { value: 'XB3.0', label: 'XB3.0' },
        { value: 'XB3.5', label: 'XB3.5' }, { value: 'XB4.0', label: 'XB4.0' }, { value: 'EBU3.5', label: 'EBU3.5' },
        { value: 'EBU3.75', label: 'EBU3.75' }, { value: 'EBU4.0', label: 'EBU4.0' }
    ];
    const GUIDE_SIZES_FALLBACK = [
        { value: '5F', label: '5F' }, { value: '6F', label: '6F' }, { value: '7F', label: '7F' }, { value: '8F', label: '8F' }
    ];

    const finalPrimary = primaryOptions.length > 0 ? primaryOptions : (
        mode === 'balloon' ? BALLOON_DIAMETERS_FALLBACK :
            mode === 'guide' ? GUIDE_CURVES_FALLBACK : []
    );

    const finalSecondary = secondaryOptions.length > 0 ? secondaryOptions : (
        mode === 'balloon' ? BALLOON_LENGTHS_FALLBACK :
            mode === 'guide' ? GUIDE_SIZES_FALLBACK : []
    );

    return (
        <HybridVariantPicker
            primaryLabel={primaryLabel}
            primaryOptions={finalPrimary}
            secondaryLabel={secondaryLabel}
            secondaryOptions={finalSecondary}
            onSelect={onSelect}
            selectedVariant={selectedVariant}
            separator={separator}
        />
    );
};

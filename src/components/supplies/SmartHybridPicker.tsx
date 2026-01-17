import React, { useMemo } from 'react';
import { HybridVariantPicker, PickerOption } from './HybridVariantPicker';

interface SmartHybridPickerProps {
    availableVariants: string[];
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
        const parsed = availableVariants.map(v => {
            let p = '', s = '';

            if (mode === 'balloon') {
                // Expect "Diam x Len" e.g. "2.00x20", "2.50 x 15"
                // Split by any 'x' like char
                const parts = v.split(/[\sxX×*]+/);
                if (parts.length >= 2) {
                    p = parts[0];
                    s = parts[1];
                } else {
                    p = v; s = '?';
                }
            } else if (mode === 'guide') {
                // Expect "Curve Size" e.g. "JL4 6F", "XB 3.5 6F"
                // usually Size is the last token (e.g. 5F, 6F, 7F) or similar
                // We can split by space
                const parts = v.trim().split(/\s+/);
                if (parts.length >= 2) {
                    // Assume last part is size, rest is curve
                    s = parts[parts.length - 1];
                    p = parts.slice(0, parts.length - 1).join(' ');
                } else {
                    p = v; s = '?';
                }
            } else {
                // General split by separator char (naive)
                const parts = v.split(separator);
                if (parts.length >= 2) {
                    p = parts[0];
                    s = parts.slice(1).join(separator);
                }
            }
            return { original: v, primary: p, secondary: s };
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

    // If no options derived (e.g. new item without variants), 
    // we effectively show empty or fallback? 
    // Actually the requirement is for *New* items to have buttons.
    // Creating a new item implies we might NOT have variants in DB yet?
    // Wait, if it's a "New Item" (unrecognized barcode), the user manually selects "Product Definition".
    // If that Product Definition has stored variants, we use them.
    // If it has NO stored variants (clean slate), then `availableVariants` is empty.
    // The user said: "When entering invoice items (item is new and not in DB), Variant Picker should appear as buttons..."
    // This implies we need a DEFAULT set of standard buttons if the definition has NO variants?
    // OR the user expects to pick from a standard list to *create* the variant?
    // "Valid variants" usually define the product. A "Product Definition" usually comes with the catalog of variants.
    // If the user selects a definition that has no variants, we might need fallback defaults.
    // For now, I will assume the Definition HAS variants. If not, I might need to restore the hardcoded lists as FALLBACKS.

    // Let's add Fallbacks if arrays are empty, based on mode.
    const finalPrimary = primaryOptions.length > 0 ? primaryOptions : (
        mode === 'balloon' ? [{ value: '2.00', label: '2.00' }, { value: '2.50', label: '2.50' }, { value: '3.00', label: '3.00' }] : // Minimal fallback
            mode === 'guide' ? [{ value: 'JL4', label: 'JL4' }, { value: 'JR4', label: 'JR4' }] : []
    );

    const finalSecondary = secondaryOptions.length > 0 ? secondaryOptions : (
        mode === 'balloon' ? [{ value: '10', label: '10' }, { value: '15', label: '15' }, { value: '20', label: '20' }] :
            mode === 'guide' ? [{ value: '6F', label: '6F' }] : []
    );

    // If falling back, we might want more comprehensive constants?
    // Let's re-import or redefine the extensive constants from InventoryItemForm if we want robust fallbacks.
    // But for "Smart" behavior, empty is better than wrong. I'll stick to dynamic + minimal fallback.

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

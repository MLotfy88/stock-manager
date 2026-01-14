/**
 * Utility functions for managing variant preferences in localStorage
 * Tracks recently used variants per product for quick access
 */

const RECENT_VARIANTS_KEY = 'recentVariants';
const MAX_RECENT = 5;

export interface VariantUsage {
    variant: string;
    timestamp: number;
    count: number;
}

/**
 * Save a recently used variant for a product
 */
export function saveRecentVariant(productId: string, variant: string): void {
    try {
        const key = `${RECENT_VARIANTS_KEY}_${productId}`;
        const existing = getRecentVariantsWithMetadata(productId);

        // Find existing entry
        const existingIndex = existing.findIndex(v => v.variant === variant);

        if (existingIndex !== -1) {
            // Update existing: move to front and increment count
            const updated = existing[existingIndex];
            updated.timestamp = Date.now();
            updated.count += 1;
            existing.splice(existingIndex, 1);
            existing.unshift(updated);
        } else {
            // Add new entry at front
            existing.unshift({
                variant,
                timestamp: Date.now(),
                count: 1
            });
        }

        // Keep only MAX_RECENT
        const trimmed = existing.slice(0, MAX_RECENT);

        localStorage.setItem(key, JSON.stringify(trimmed));
    } catch (error) {
        console.error('Error saving recent variant:', error);
    }
}

/**
 * Get recent variants for a product (variant names only)
 */
export function getRecentVariants(productId: string): string[] {
    const withMetadata = getRecentVariantsWithMetadata(productId);
    return withMetadata.map(v => v.variant);
}

/**
 * Get recent variants with full metadata
 */
export function getRecentVariantsWithMetadata(productId: string): VariantUsage[] {
    try {
        const key = `${RECENT_VARIANTS_KEY}_${productId}`;
        const stored = localStorage.getItem(key);

        if (!stored) return [];

        const parsed = JSON.parse(stored) as VariantUsage[];

        // Sort by timestamp (most recent first)
        return parsed.sort((a, b) => b.timestamp - a.timestamp);
    } catch (error) {
        console.error('Error getting recent variants:', error);
        return [];
    }
}

/**
 * Clear recent variants for a product
 */
export function clearRecentVariants(productId: string): void {
    try {
        const key = `${RECENT_VARIANTS_KEY}_${productId}`;
        localStorage.removeItem(key);
    } catch (error) {
        console.error('Error clearing recent variants:', error);
    }
}

/**
 * Get most frequently used variants across all products
 */
export function getGlobalMostUsedVariants(limit: number = 10): Array<{ productId: string; variant: string; count: number }> {
    try {
        const allVariants: Array<{ productId: string; variant: string; count: number }> = [];

        // Iterate through all localStorage keys
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(RECENT_VARIANTS_KEY)) {
                const productId = key.replace(`${RECENT_VARIANTS_KEY}_`, '');
                const variants = getRecentVariantsWithMetadata(productId);

                variants.forEach(v => {
                    allVariants.push({
                        productId,
                        variant: v.variant,
                        count: v.count
                    });
                });
            }
        }

        // Sort by count and return top N
        return allVariants
            .sort((a, b) => b.count - a.count)
            .slice(0, limit);
    } catch (error) {
        console.error('Error getting global most used variants:', error);
        return [];
    }
}

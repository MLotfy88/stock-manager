// Utility: Text formatting helpers for UTF-8 and special characters

/**
 * Fix broken UTF-8 characters that appear as �
 * Common issue with multiply sign (×) and other special chars
 */
export function fixBrokenUTF8(text: string): string {
    if (!text) return text;

    return text
        .replace(/�/g, '×')      // Fix multiply sign
        .replace(/÷�/g, '÷')     // Fix divide sign
        .replace(/±�/g, '±')     // Fix plus-minus
        .replace(/°�/g, '°');    // Fix degree sign
}

/**
 * Ensure proper UTF-8 encoding for product sizes and variants
 * Converts common patterns to correct unicode
 */
export function normalizeProductVariant(variant: string): string {
    if (!variant) return variant;

    // Fix broken characters first
    let normalized = fixBrokenUTF8(variant);

    // Convert common ASCII patterns to proper unicode
    normalized = normalized
        .replace(/(\d+\.?\d*)\s*[xX]\s*(\d+\.?\d*)/g, '$1×$2')  // "2.5x20" → "2.5×20"
        .replace(/(\d+)\s*\/\s*(\d+)/g, '$1÷$2');               // "100/5" → "100÷5"

    return normalized;
}

/**
 * Format product name for display, ensuring proper UTF-8
 */
export function formatProductName(name: string): string {
    return fixBrokenUTF8(name);
}

/**
 * Safe string for database storage
 * Ensures UTF-8 compliance
 */
export function sanitizeForDatabase(text: string): string {
    if (!text) return text;

    // Normalize unicode
    return text.normalize('NFC');
}

/**
 * Get the multiply symbol (×) as a constant
 */
export const MULTIPLY_SYMBOL = '×';
export const DIVIDE_SYMBOL = '÷';
export const PLUS_MINUS_SYMBOL = '±';
export const DEGREE_SYMBOL = '°';

/**
 * Helper for creating size strings
 */
export function createSizeString(width: number, length: number): string {
    return `${width}${MULTIPLY_SYMBOL}${length}`;
}

// Example usage:
// const size = createSizeString(2.5, 20);  // "2.5×20"
// const fixed = fixBrokenUTF8("2.5�20");    // "2.5×20"

/**
 * Sanitize variant names to fix encoding issues
 * Replaces common UTF-8 mojibake patterns
 */
export const sanitizeVariantName = (name: string): string => {
    if (!name) return name;

    return name
        // Replace the 'replacement character' (�) followed by numbers with multiplication sign
        .replace(/�(\d)/g, '×$1')
        // Replace any standalone � with ×
        .replace(/�/g, '×')
        // Normalize multiple spaces
        .replace(/\s+/g, ' ')
        // Trim whitespace
        .trim();
};

/**
 * Sanitize a ProductVariant object
 */
export const sanitizeProductVariant = (variant: { name: string;[key: string]: any }) => {
    return {
        ...variant,
        name: sanitizeVariantName(variant.name)
    };
};

/**
 * Sanitize all variants in a ProductDefinition
 */
export const sanitizeProductDefinition = <T extends { variants?: Array<{ name: string;[key: string]: any }> }>(
    definition: T
): T => {
    if (!definition.variants || definition.variants.length === 0) {
        return definition;
    }

    return {
        ...definition,
        variants: definition.variants.map(sanitizeProductVariant)
    };
};

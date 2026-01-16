import React, { useEffect, useState, useRef } from 'react';

interface AnimatedCounterProps {
    value: number;
    duration?: number;
    prefix?: string;
    suffix?: string;
    className?: string;
    decimals?: number;
}

/**
 * Animated Counter Component
 * Shows numbers counting up with smooth animation
 */
export const AnimatedCounter: React.FC<AnimatedCounterProps> = ({
    value,
    duration = 1000,
    prefix = '',
    suffix = '',
    className = '',
    decimals = 0
}) => {
    const [displayValue, setDisplayValue] = useState(0);
    const startRef = useRef<number | null>(null);
    const startValueRef = useRef(0);

    useEffect(() => {
        startValueRef.current = displayValue;
        startRef.current = null;

        const animate = (timestamp: number) => {
            if (!startRef.current) startRef.current = timestamp;
            const progress = Math.min((timestamp - startRef.current) / duration, 1);

            // Easing function (ease-out)
            const easeOut = 1 - Math.pow(1 - progress, 3);

            const current = startValueRef.current + (value - startValueRef.current) * easeOut;
            setDisplayValue(current);

            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };

        requestAnimationFrame(animate);
    }, [value, duration]);

    const formattedValue = decimals > 0
        ? displayValue.toFixed(decimals)
        : Math.round(displayValue).toLocaleString();

    return (
        <span className={className}>
            {prefix}{formattedValue}{suffix}
        </span>
    );
};

export default AnimatedCounter;

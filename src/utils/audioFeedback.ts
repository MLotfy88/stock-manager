/**
 * Audio feedback utilities for barcode scanning and data entry
 */

// Audio context for playing sounds
let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext {
    if (!audioContext) {
        audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioContext;
}

/**
 * Play a simple beep sound
 */
export function playBeep(frequency: number = 800, duration: number = 100): void {
    try {
        const ctx = getAudioContext();
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        oscillator.frequency.value = frequency;
        oscillator.type = 'sine';

        gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration / 1000);

        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + duration / 1000);
    } catch (error) {
        console.warn('Audio playback not supported:', error);
    }
}

/**
 * Play success sound (higher pitch, pleasant)
 */
export function playSuccessBeep(): void {
    playBeep(1000, 150);
}

/**
 * Play error sound (lower pitch, warning)
 */
export function playErrorBeep(): void {
    playBeep(400, 200);
}

/**
 * Play double beep for duplicate/merge actions
 */
export function playDualBeep(): void {
    playBeep(800, 80);
    setTimeout(() => playBeep(800, 80), 100);
}

/**
 * Play tick sound for quick confirmations
 */
export function playTick(): void {
    playBeep(1200, 50);
}

/**
 * Play completion chime (3 ascending notes)
 */
export function playCompletionChime(): void {
    playBeep(523, 150); // C
    setTimeout(() => playBeep(659, 150), 150); // E
    setTimeout(() => playBeep(784, 200), 300); // G
}

/**
 * Vibrate device if supported
 */
export function vibrate(pattern: number | number[] = 50): void {
    if (navigator.vibrate) {
        navigator.vibrate(pattern);
    }
}

/**
 * Combined audio and haptic feedback for scan success
 */
export function scanSuccessFeedback(isNew: boolean = true): void {
    if (isNew) {
        playSuccessBeep();
        vibrate(100);
    } else {
        // Duplicate - different feedback
        playDualBeep();
        vibrate([50, 50, 50]);
    }
}

/**
 * Combined feedback for errors
 */
export function scanErrorFeedback(): void {
    playErrorBeep();
    vibrate([100, 50, 100]);
}

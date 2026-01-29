export const playSuccessSound = () => {
    try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContext) return;

        const ctx = new AudioContext();

        // Professional barcode scanner beep: Two quick sharp beeps
        const beep = (frequency: number, startTime: number, duration: number) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.type = 'square'; // Square wave for sharper, more professional sound
            osc.frequency.setValueAtTime(frequency, startTime);

            // Quick attack and decay
            gain.gain.setValueAtTime(0, startTime);
            gain.gain.linearRampToValueAtTime(0.15, startTime + 0.01);
            gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);

            osc.start(startTime);
            osc.stop(startTime + duration);
        };

        // Classic two-tone scanner beep
        const now = ctx.currentTime;
        beep(2000, now, 0.08);        // First beep: 2000Hz
        beep(1800, now + 0.09, 0.08); // Second beep: 1800Hz (slightly lower pitch)

    } catch (e) {
        console.error("Audio play failed", e);
    }
};

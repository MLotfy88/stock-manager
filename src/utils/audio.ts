export const playSuccessSound = (volume: number = 0.2) => {
    try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContext) return;

        const ctx = new AudioContext();

        // Classic "Good Read Beep" - Short, sharp confirmation tone
        const goodReadBeep = (startTime: number) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.connect(gain);
            gain.connect(ctx.destination);

            // Square wave for classic scanner sound
            osc.type = 'square';
            osc.frequency.setValueAtTime(2600, startTime); // High pitch (standard scanner frequency)

            // Very short burst: Attack → Sustain → Quick decay
            gain.gain.setValueAtTime(0, startTime);
            gain.gain.linearRampToValueAtTime(volume, startTime + 0.005); // Fast attack (5ms)
            gain.gain.setValueAtTime(volume, startTime + 0.06); // Hold (60ms total)
            gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.08); // Quick fade (20ms)

            osc.start(startTime);
            osc.stop(startTime + 0.08);
        };

        goodReadBeep(ctx.currentTime);

    } catch (e) {
        console.error("Audio play failed", e);
    }
};

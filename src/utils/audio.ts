export const playSuccessSound = () => {
    try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContext) return;

        const ctx = new AudioContext();

        // Professional "Success Chime" (Soft two-tone)
        const chime = (startTime: number) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.type = 'sine'; // Sine wave is softer and more pleasant

            // First tone: High C (Do)
            osc.frequency.setValueAtTime(800, startTime);
            // Slide to Second tone: Higher E (Mi)
            osc.frequency.exponentialRampToValueAtTime(1200, startTime + 0.1);

            // Envelope: Soft attack, quick decay
            gain.gain.setValueAtTime(0, startTime);
            gain.gain.linearRampToValueAtTime(0.3, startTime + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.3);

            osc.start(startTime);
            osc.stop(startTime + 0.3);
        };

        chime(ctx.currentTime);

    } catch (e) {
        console.error("Audio play failed", e);
    }
};

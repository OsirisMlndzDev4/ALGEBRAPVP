/**
 * @file SoundManager.js
 * @description Gestor de audio basado en Web Audio API.
 * 
 * Genera efectos de sonido procedimentales en tiempo real.
 * Ventajas:
 * 1. No requiere assets externos (mp3/wav), reduciendo tiempos de carga.
 * 2. Permite variaciones orgánicas (pitch/volumen) para evitar repetición ("juice").
 * 3. Latencia mínima para feedback instantáneo.
 */

/**
 * Clase Singleton para manejar el contexto de audio.
 */

class SoundManager {
    constructor() {
        this.ctx = null;
        this.muted = false;
        this.initialized = false;
    }

    init() {
        if (this.initialized) return;
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContext();
            this.initialized = true;
        } catch (e) {
            console.error('Web Audio API not supported', e);
        }
    }

    toggleMute() {
        this.muted = !this.muted;
        return this.muted;
    }

    // Helper to create oscillator
    playTone(freq, type, duration, vol = 0.1, variance = 0) {
        if (this.muted || !this.ctx) return;

        // Resume context if suspended (browser policy)
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        // Apply organic variance
        if (variance > 0) {
            const detune = (Math.random() * variance * 2) - variance;
            freq += detune;
        }

        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

        gain.gain.setValueAtTime(vol, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    }

    // --- SOUND PRESETS ---

    playPop() {
        // Soft bubbling pop for UI selection with variance
        this.playTone(600, 'sine', 0.1, 0.05, 50);
    }

    playSelect() {
        // Sharp click for card selection
        this.playTone(800, 'triangle', 0.05, 0.05, 100);
    }

    playSuccess() {
        // Ascending major triad
        if (this.muted || !this.ctx) return;
        const now = this.ctx.currentTime;
        this.scheduleTone(523.25, 'sine', now, 0.1); // C5
        this.scheduleTone(659.25, 'sine', now + 0.1, 0.1); // E5
        this.scheduleTone(783.99, 'sine', now + 0.2, 0.2); // G5
    }

    playError() {
        // Low buzz
        this.playTone(150, 'sawtooth', 0.3, 0.1);
    }

    playAttack() {
        // Whoosh / Noise-like effect (simulated with slide)
        if (this.muted || !this.ctx) return;
        if (this.ctx.state === 'suspended') this.ctx.resume();

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.frequency.setValueAtTime(200, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(50, this.ctx.currentTime + 0.3);

        gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.3);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.3);
    }

    playDamage() {
        // Crunch/Impact
        if (this.muted || !this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'square';
        osc.frequency.setValueAtTime(100, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.2);

        gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.2);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.2);
    }

    playWin() {
        // Victory fanfare
        if (this.muted || !this.ctx) return;
        const now = this.ctx.currentTime;
        // C G E C G C
        this.scheduleTone(523.25, 'square', now, 0.2);
        this.scheduleTone(659.25, 'square', now + 0.2, 0.2);
        this.scheduleTone(783.99, 'square', now + 0.4, 0.4);
        this.scheduleTone(1046.50, 'square', now + 0.6, 0.8);
    }

    scheduleTone(freq, type, time, duration) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, time);
        gain.gain.setValueAtTime(0.1, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + duration);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(time);
        osc.stop(time + duration);
    }
}

export const soundManager = new SoundManager();

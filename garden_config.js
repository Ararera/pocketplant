// garden_config.js - State, Constants, and Utilities
// Optimized: Frozen constants, efficient color parsing, better state management

let gardenState = {
    isOpen: false,
    fireflies: [],
    // fireflySpawnInterval: null, // Managed via master loop now
    ambientInterval: null,
    windInterval: null,
    soundscapeActive: false,
    audioContext: null,
    gainNode: null,
    // Audio layer nodes
    ambienceGain: null,
    musicalGain: null,
    plantGain: null,
    // Ambient sound timers
    ambientTimers: {},
    // Plant drone oscillators
    plantDrones: [],
    // Audio Buffers Cache (New for optimization)
    audioBuffers: {},

    // Sound Seeds (player placed)
    soundSeedsAudio: {},
    soundSeedsDom: {},
    soundSeedsDragging: null,
    
    // Current mood
    currentMood: 'contemplative', // contemplative, mysterious, tender
    moodTransitionTimer: null,
    plantBreathTimer: null,
    entryTime: null,
    maxFireflies: 15, // Reduced from 20 for battery safety

    // Firefly -> Moon interaction
    moonFlightActive: false,
    moonStreakKey: null,
    moonStreakCount: 0,
    moonTintTimer: null,
    moonHitTimer: null,
    moonHitFadeTimer: null,
    _moonBaseBoxShadow: null,
    _moonBaseBackground: null,
    
    // Performance: Master Animation Loop ID
    visualLoopId: null
};

// Musical notes for firefly chords (frequencies in Hz)
const GARDEN_CHORDS = Object.freeze({
    0: [261.63, 329.63, 392.00],       // Ember - C major (warm)
    1: [293.66, 369.99, 440.00],       // Citrine - D major (bright)
    2: [329.63, 415.30, 493.88],       // Verdant - E major (vital)
    3: [349.23, 440.00, 523.25],       // Aqua - F major (flowing)
    4: [392.00, 493.88, 587.33],       // Azure - G major (calm)
    5: [440.00, 554.37, 659.25],       // Violet - A major (dreamy)
    6: [493.88, 622.25, 739.99],       // Rose - B major (loving)
    7: [277.18, 349.23, 415.30]        // Pearl - C# major (mysterious)
});


// Sound Seed definitions (12) - all share a compatible pentatonic palette.
// These are intentionally gentle and sparse so layering many stays pleasant.
const SOUND_SEEDS = Object.freeze([
    { id: 0, name: 'Dew',    emoji: '💧', hue: 200, base: 220.00, pattern: [0, 3, 5, 7], rhythm: [0.0, 0.6, 1.2, 2.0] },
    { id: 1, name: 'Ember',  emoji: '🔥', hue: 15,  base: 196.00, pattern: [0, 5, 7, 10], rhythm: [0.0, 0.7, 1.4, 2.4] },
    { id: 2, name: 'Moss',   emoji: '🍃', hue: 120, base: 246.94, pattern: [0, 2, 5, 7], rhythm: [0.0, 0.5, 1.1, 2.1] },
    { id: 3, name: 'Pearl',  emoji: '🤍', hue: 40,  base: 261.63, pattern: [0, 3, 7, 12], rhythm: [0.0, 0.9, 1.6, 2.6] },
    { id: 4, name: 'Aster',  emoji: '⭐', hue: 270, base: 293.66, pattern: [0, 5, 7, 9],  rhythm: [0.0, 0.6, 1.3, 2.2] },
    { id: 5, name: 'Breeze', emoji: '🌬️', hue: 210, base: 174.61, pattern: [0, 7, 10, 12], rhythm: [0.0, 0.8, 1.5, 2.3] },
    { id: 6, name: 'Silt',   emoji: '🪨', hue: 25,  base: 233.08, pattern: [0, 2, 7, 9],  rhythm: [0.0, 0.55, 1.4, 2.35] },
    { id: 7, name: 'Lumen',  emoji: '✨', hue: 55,  base: 329.63, pattern: [0, 3, 5, 10], rhythm: [0.0, 0.5, 1.0, 2.0] },
    { id: 8, name: 'Nectar', emoji: '🍯', hue: 45,  base: 220.00, pattern: [0, 4, 7, 9],  rhythm: [0.0, 0.7, 1.3, 2.0] },
    { id: 9, name: 'Glade',  emoji: '🌿', hue: 140, base: 261.63, pattern: [0, 5, 7, 14], rhythm: [0.0, 0.8, 1.6, 2.8] },
    { id:10, name: 'Aurora', emoji: '🟩', hue: 165, base: 293.66, pattern: [0, 2, 5, 12], rhythm: [0.0, 0.6, 1.4, 2.4] },
    { id:11, name: 'Bloom',  emoji: '🌸', hue: 320, base: 246.94, pattern: [0, 3, 7, 9],  rhythm: [0.0, 0.65, 1.45, 2.3] }
]);


// Firefly family timbres
const FIREFLY_TIMBRES = Object.freeze({
    0: { type: 'sawtooth', filterFreq: 800, attack: 0.08, decay: 1.5, detune: 5 },
    1: { type: 'sine', filterFreq: 2000, attack: 0.02, decay: 1.2, detune: 0 },
    2: { type: 'triangle', filterFreq: 1200, attack: 0.01, decay: 0.8, detune: 2 },
    3: { type: 'sine', filterFreq: 3000, attack: 0.01, decay: 1.8, detune: 0 },
    4: { type: 'triangle', filterFreq: 1000, attack: 0.1, decay: 2.0, detune: 3 },
    5: { type: 'sine', filterFreq: 1500, attack: 0.15, decay: 2.5, detune: 8 },
    6: { type: 'triangle', filterFreq: 1400, attack: 0.05, decay: 1.6, detune: 4 },
    7: { type: 'sawtooth', filterFreq: 600, attack: 0.03, decay: 2.0, detune: 15 }
});

const AMBIENT_NOTES = Object.freeze([196.00, 220.00, 246.94, 261.63, 293.66, 329.63, 349.23, 392.00, 440.00]);

const PLANT_HARMONICS = Object.freeze({
    red: [220.00, 277.18, 329.63],
    orange: [246.94, 311.13, 369.99],
    yellow: [261.63, 329.63, 392.00],
    green: [293.66, 369.99, 440.00],
    cyan: [311.13, 392.00, 466.16],
    blue: [329.63, 415.30, 493.88],
    purple: [349.23, 440.00, 523.25],
    pink: [369.99, 466.16, 554.37]
});

const AMBIENT_SOUNDS = Object.freeze({
    forestBreath: { minInterval: 6000, maxInterval: 12000 },
    distantOwl: { minInterval: 30000, maxInterval: 90000, chance: 0.5 },
    insectChirr: { minInterval: 4000, maxInterval: 10000, chance: 0.6 },
    leavesRustle: { minInterval: 8000, maxInterval: 20000 },
    fenceCreak: { minInterval: 25000, maxInterval: 60000, chance: 0.4 }
});

// Utilities
// Optimization: REMOVED the DOM creation fallback. 
// Creating a DIV, adding to body, and getting computed style is extremely slow.
// If regex fails, we now return a default rather than thrashing the layout.
function _parseColorToRgb(col) {
    if (!col) return { r: 254, g: 249, b: 195 };
    col = String(col).trim();
    if (col[0] === '#') {
        const h = col.slice(1);
        if (h.length === 3) return { r: parseInt(h[0] + h[0], 16), g: parseInt(h[1] + h[1], 16), b: parseInt(h[2] + h[2], 16) };
        if (h.length >= 6) return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16) };
        return { r: 255, g: 255, b: 255 };
    }
    let m = col.match(/^rgba?\(([^)]+)\)$/i);
    if (m) {
        const parts = m[1].split(',').map(s => s.trim());
        return { r: Math.round(parseFloat(parts[0] || '255')), g: Math.round(parseFloat(parts[1] || '255')), b: Math.round(parseFloat(parts[2] || '255')) };
    }
    m = col.match(/^hsla?\(([^)]+)\)$/i);
    if (m) {
        const parts = m[1].split(',').map(s => s.trim());
        const h = parseFloat(parts[0] || '0'), s = (parseFloat((parts[1] || '0').replace('%', '')) || 0) / 100, l = (parseFloat((parts[2] || '0').replace('%', '')) || 0) / 100;
        const c = (1 - Math.abs(2 * l - 1)) * s, hh = ((h % 360) + 360) % 360, x = c * (1 - Math.abs(((hh / 60) % 2) - 1)), m0 = l - c / 2;
        let r1 = 0, g1 = 0, b1 = 0;
        if (hh < 60) { r1 = c; g1 = x; b1 = 0; } else if (hh < 120) { r1 = x; g1 = c; b1 = 0; } else if (hh < 180) { r1 = 0; g1 = c; b1 = x; } else if (hh < 240) { r1 = 0; g1 = x; b1 = c; } else if (hh < 300) { r1 = x; g1 = 0; b1 = c; } else { r1 = c; g1 = 0; b1 = x; }
        return { r: Math.round((r1 + m0) * 255), g: Math.round((g1 + m0) * 255), b: Math.round((b1 + m0) * 255) };
    }
    // Optimization: Fallback color instead of expensive DOM calculation
    return { r: 254, g: 249, b: 195 };
}

function _rgbToCss(rgb, a) { const alpha = (typeof a === 'number') ? a : 1; return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`; }
function _mixRgb(a, b, t) { return { r: Math.round(a.r * (1 - t) + b.r * t), g: Math.round(a.g * (1 - t) + b.g * t), b: Math.round(a.b * (1 - t) + b.b * t) }; }
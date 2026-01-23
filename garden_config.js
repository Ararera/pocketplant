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

    // Color melody layers (unlocked by 3 same-color fireflies)
    colorMelodyTimers: {},
    colorMelodyActive: {},
    colorMelodyLastStartAt: {},
    
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
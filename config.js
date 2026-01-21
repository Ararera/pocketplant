// config.js - Constants, Configuration, and State

const POT_COLORS = ['#e07a5f', '#d4a373', '#8d99ae', '#ef476f', '#118ab2', '#06d6a0', '#ffd166', '#a8dadc', '#457b9d', '#e63946', '#f1faee', '#2a9d8f', '#264653', '#f4a261', '#e76f51', '#cdb4db', '#ffc8dd', '#ffafcc', '#bde0fe', '#a2d2ff', '#606c38', '#283618', '#fefae0', '#dda15e', '#bc6c25', '#333333'];
const PATTERN_COLORS = ['rgba(255,255,255,0.5)', 'rgba(255,255,255,0.3)', 'rgba(0,0,0,0.2)', '#ffd700', '#c0c0c0', '#cd7f32', '#f472b6', '#60a5fa', '#4ade80'];
const PATTERNS = [
    { id: 'patNone', name: 'None', unlockAt: 0 },
    { id: 'patStripes', name: '///', unlockAt: 5 },
    { id: 'patHearts', name: '♥', unlockAt: 15 },
    { id: 'patWaves', name: '〰', unlockAt: 30 },
    { id: 'patNotes', name: '♪', unlockAt: 50 },
    { id: 'patChecks', name: '▦', unlockAt: 75 },
    { id: 'patStars', name: '★', unlockAt: 100 },
    { id: 'patDiamonds', name: '◆', unlockAt: 150 },
    { id: 'patLeaves', name: '🌿', unlockAt: 200 },
    { id: 'patMoons', name: '☽', unlockAt: 300 }
];

const FIREFLY_FAMILIES = [
    { name: 'Ember', hue: 15, power: 'warmth', desc: 'Restores sun vitality', effect: 'sun' },
    { name: 'Citrine', hue: 45, power: 'growth', desc: 'Accelerates growth', effect: 'growth' },
    { name: 'Verdant', hue: 120, power: 'vitality', desc: 'Boosts overall health', effect: 'health' },
    { name: 'Aqua', hue: 180, power: 'hydration', desc: 'Restores water', effect: 'water' },
    { name: 'Azure', hue: 210, power: 'calm', desc: 'Slows decay', effect: 'slow' },
    { name: 'Violet', hue: 270, power: 'dreams', desc: 'Increases luck', effect: 'luck' },
    { name: 'Rose', hue: 330, power: 'love', desc: 'Fills with affection', effect: 'love' },
    { name: 'Pearl', hue: 0, sat: 15, power: 'mystery', desc: 'Random powerful effects', effect: 'random' }
];

const GUARDIAN_THRESHOLD = 10;
const SEASONS = [
    { name: 'Spring', icon: '🌸', growth: 1.1 },
    { name: 'Summer', icon: '☀️', growth: 1.2 },
    { name: 'Autumn', icon: '🍂', growth: 0.9 },
    { name: 'Winter', icon: '❄️', growth: 0.7 }
];

const MOON_PHASES = [
    { name: 'New Moon', icon: '🌑', phase: 100 },
    { name: 'Waxing Crescent', icon: '🌒', phase: 75 },
    { name: 'First Quarter', icon: '🌓', phase: 50 },
    { name: 'Waxing Gibbous', icon: '🌔', phase: 25 },
    { name: 'Full Moon', icon: '🌕', phase: 0 },
    { name: 'Waning Gibbous', icon: '🌖', phase: -25 },
    { name: 'Last Quarter', icon: '🌗', phase: -50 },
    { name: 'Waning Crescent', icon: '🌘', phase: -75 }
];

const STAGES = ['Shoot', 'Seedling', 'Sprout', 'Budding', 'Bloom', 'Flourish'];
const STAGE_THRESHOLDS = [0, 300, 1000, 2500, 5000, 8000];

const MOODS = {
    thriving: { text: 'basking contentedly', color: '#4ade80', threshold: 75 },
    content: { text: 'swaying gently', color: '#a3e635', threshold: 55 },
    restless: { text: 'reaching for light', color: '#facc15', threshold: 35 },
    struggling: { text: 'wilting slowly', color: '#fb923c', threshold: 15 },
    dormant: { text: 'in deep slumber', color: '#f87171', threshold: 0 }
};

const PLANT_STATES = {
    thriving: { min: 80, label: "Thriving", color: "#4ade80" },
    content: { min: 60, label: "Content", color: "#a3e635" },
    restless: { min: 40, label: "Restless", color: "#facc15" },
    strained: { min: 20, label: "Strained", color: "#fb923c" },
    dormant: { min: 0, label: "Dormant", color: "#f87171" }
};

const INHERITABLE_TRAITS = [
    { id: 'resilience', name: 'Resilient', desc: 'Slower stat decay' },
    { id: 'bloomSpeed', name: 'Quick Bloomer', desc: 'Faster growth' },
    { id: 'leafiness', name: 'Lush', desc: 'More leaves' },
    { id: 'colorVibrancy', name: 'Vibrant', desc: 'Richer colors' },
    { id: 'flowerPower', name: 'Floriferous', desc: 'More flowers' },
    { id: 'fireflyAffinity', name: 'Firefly Friend', desc: 'Attracts more fireflies' }
];

const CONFIG = {
    decayRate: { water: 0.023, sun: 0.025, love: 0.018 },
    offlineDecayMult: { water: 1.3, sun: 1.3, love: 2.0 },
    recoveryRate: { water: 0.18, sunDay: 0.32, sunNight: 0.22 },
    growthRate: 0.35,
    tickRate: 1000,
    healThreshold1: 30,
    healThreshold2: 10,
    healMod1: 0.5,
    healMod2: 0.2,
    neglectThreshold: 20,
    neglectWarnHours: 2,
    neglectScarHours: 6,
    neglectRecoveryRate: 0.25,
    crisisThreshold: 10,
    crisisDormantHours: 2,
    crisisScar1Hours: 6,
    crisisScar2Hours: 10,
    crisisDeathHours: 14,
    daySeconds: 86400,
    debugTapThreshold: 20,
    singCooldown: 300000,
    fertilizeCooldown: 180000,
    rainRestCooldown: 300000,
    sunRestCooldown: 480000,
    loveRestCooldown: 180000,
    maxFireflyPerFamily: 50,
    offlineChunkSize: 60
};

const DREAMS = [
    "dreamed of distant mountains", "listened to rain and remembered forests",
    "felt roots intertwining with the past", "saw gardens yet to bloom",
    "remembered its first sunrise", "heard whispers from sleeping seeds",
    "imagined dancing with fireflies", "felt the heartbeat of the earth",
    "dreamed of butterfly wings", "whispered secrets to the moon"
];

// Global State
let state = {
    water: 50, sun: 50, love: 50, growth: 0, stage: 1,
    isSunLampOn: false, isRainOn: false,
    day: 1, dayProgress: 0, generation: 1,
    name: "Sprout", season: 0, dna: null,
    potColor: POT_COLORS[0], potPattern: 'patNone', potPatternColor: 'rgba(255,255,255,0.5)',
    timeAtZero: 0, isDead: false, history: [],
    lastSave: Date.now(), growthMultiplier: 1,
    singCooldownUntil: 0, fertilizeCooldownUntil: 0,
    rainRestUntil: 0, sunRestUntil: 0, loveRestUntil: 0,
    fireflies: {}, totalFireflies: 0, activeGuardians: [],
    buffs: [], scars: [], crisisCount: 0, inheritedTraits: [],
    lastDream: null, isMusicPlaying: false,
    neglect: { waterLowMs: 0, sunLowMs: 0, loveLowMs: 0, crisisMs: 0, partialDormant: false },
    lastWhisperAt: 0
};

let els = {}, selectedFamily = null, activeBigFireflies = [];
let lastTickTime = Date.now(), saveDebounceTimer = null;
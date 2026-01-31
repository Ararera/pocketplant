const POT_COLORS = Object.freeze([
    '#e07a5f', '#d4a373', '#8d99ae', '#ef476f', '#118ab2', '#06d6a0', 
    '#ffd166', '#a8dadc', '#457b9d', '#e63946', '#f1faee', '#2a9d8f', 
    '#264653', '#f4a261', '#e76f51', '#cdb4db', '#ffc8dd', '#ffafcc', 
    '#bde0fe', '#a2d2ff', '#606c38', '#283618', '#fefae0', '#dda15e', 
    '#bc6c25', '#333333'
]);

const PATTERN_COLORS = Object.freeze([
    'rgba(255,255,255,0.5)', 'rgba(255,255,255,0.3)', 'rgba(0,0,0,0.2)', 
    '#ffd700', '#c0c0c0', '#cd7f32', '#f472b6', '#60a5fa', '#4ade80'
]);

const PATTERNS = Object.freeze([
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
]);

const FIREFLY_FAMILIES = Object.freeze([
    { name: 'Ember',   hue: 15,  power: 'warmth',    desc: 'Restores sun vitality', effect: 'sun' },
    { name: 'Citrine', hue: 45,  power: 'growth',    desc: 'Accelerates growth', effect: 'growth' },
    { name: 'Verdant', hue: 120, power: 'vitality',  desc: 'Boosts overall health', effect: 'health' },
    { name: 'Aqua',    hue: 180, power: 'hydration', desc: 'Restores water', effect: 'water' },
    { name: 'Azure',   hue: 210, power: 'calm',      desc: 'Slows decay', effect: 'slow' },
    { name: 'Violet',  hue: 270, power: 'dreams',    desc: 'Increases luck', effect: 'luck' },
    { name: 'Rose',    hue: 330, power: 'love',      desc: 'Fills with affection', effect: 'love' },
    { name: 'Pearl',   hue: 0,   sat: 15, power: 'mystery', desc: 'Random powerful effects', effect: 'random' },

    { name: 'Lumen',   hue: 70,  power: 'harmony',   desc: 'Gently restores all vitals', effect: 'harmony' },
    { name: 'Glade',   hue: 100, power: 'bloom',     desc: 'Boosts growth and attracts visitors', effect: 'bloom' },
    { name: 'Dew',     hue: 165, power: 'renewal',   desc: 'Improves rain & sunlight recovery', effect: 'rejuvenate' },
    { name: 'Aster',   hue: 200, power: 'focus',     desc: 'Reduces cooldowns and resting time', effect: 'focus' },
    { name: 'Iris',    hue: 245, power: 'shield',    desc: 'Helps prevent neglect scars', effect: 'shield' },
    { name: 'Onyx',    hue: 300, sat: 35, power: 'ward', desc: 'Buys time during crisis', effect: 'ward' },
    { name: 'Echo',    hue: 315, sat: 55, power: 'mending', desc: 'Softens dormant penalties', effect: 'mend' },
    { name: 'Quartz',  hue: 30,  sat: 25, power: 'clarity', desc: 'Stabilizes recovery and growth', effect: 'clarity' }
]);


const GUARDIAN_THRESHOLD = 40;  // Reduced from 50 - guardians unlock sooner
const GUARDIAN_INVOKE_COST = 20; // Reduced from 25 - cheaper to invoke

const SEASONS = Object.freeze([
    { name: 'Spring', icon: '🌸', growth: 1.1 },
    { name: 'Summer', icon: '☀️', growth: 1.2 },
    { name: 'Autumn', icon: '🍂', growth: 0.9 },
    { name: 'Winter', icon: '❄️', growth: 0.7 }
]);

const MOON_PHASES = Object.freeze([
    { name: 'New Moon', icon: '🌑', phase: 100 },
    { name: 'Waxing Crescent', icon: '🌒', phase: 75 },
    { name: 'First Quarter', icon: '🌓', phase: 50 },
    { name: 'Waxing Gibbous', icon: '🌔', phase: 25 },
    { name: 'Full Moon', icon: '🌕', phase: 0 },
    { name: 'Waning Gibbous', icon: '🌖', phase: -25 },
    { name: 'Last Quarter', icon: '🌗', phase: -50 },
    { name: 'Waning Crescent', icon: '🌘', phase: -75 }
]);

const STAGES = Object.freeze(['Shoot', 'Seedling', 'Sprout', 'Budding', 'Bloom', 'Flourish']);
const STAGE_THRESHOLDS = Object.freeze([0, 300, 1000, 2500, 5000, 8000]);

const MOODS = Object.freeze({
    thriving: { text: 'basking contentedly', color: '#4ade80', threshold: 75 },
    content: { text: 'swaying gently', color: '#a3e635', threshold: 55 },
    restless: { text: 'reaching for light', color: '#facc15', threshold: 35 },
    strained: { text: 'wilting slowly', color: '#fb923c', threshold: 15 },
    dormant: { text: 'in deep slumber', color: '#f87171', threshold: 0 }
});

const PLANT_STATES = Object.freeze({
    thriving: { min: 80, label: "Thriving", color: "#4ade80" },
    content: { min: 60, label: "Content", color: "#a3e635" },
    restless: { min: 40, label: "Restless", color: "#facc15" },
    strained: { min: 20, label: "Strained", color: "#fb923c" },
    dormant: { min: 0, label: "Dormant", color: "#f87171" }
});

const INHERITABLE_TRAITS = Object.freeze([
    { id: 'resilience', name: 'Resilient', desc: 'Slower stat decay' },
    { id: 'bloomSpeed', name: 'Quick Bloomer', desc: 'Faster growth' },
    { id: 'leafiness', name: 'Lush', desc: 'More leaves' },
    { id: 'colorVibrancy', name: 'Vibrant', desc: 'Richer colors' },
    { id: 'flowerPower', name: 'Floriferous', desc: 'More flowers' },
    { id: 'fireflyAffinity', name: 'Firefly Friend', desc: 'Attracts more fireflies' }
]);

const CONFIG = {



    decayRate: { water: 0.020, sun: 0.022, love: 0.015 },


    offlineDecayMult: { water: 1.2, sun: 1.2, love: 1.5 },


    recoveryRate: { water: 0.20, sunDay: 0.35, sunNight: 0.25 },

    growthRate: 0.40, // Slightly faster base growth
    tickRate: 1000,


    healThreshold1: 30,  // Below 30%, recovery at 60% (was 50%)
    healThreshold2: 10,  // Below 10%, recovery at 30% (was 20%)
    healMod1: 0.6,       // More forgiving
    healMod2: 0.3,       // Still challenging but possible

    neglectThreshold: 18, // Below this, neglect timer ticks (was 20)
    neglectWarnHours: 2.5,  // Warning after 2.5h (was 2h)
    neglectScarHours: 7,    // Scar after 7h (was 6h) - more forgiving
    neglectRecoveryRate: 0.3, // Faster recovery from near-neglect (was 0.25)

    crisisThreshold: 10,
    crisisDormantHours: 2.5, // Partial dormant warning (was 2h)
    crisisScar1Hours: 7,     // First crisis scar (was 6h)
    crisisScar2Hours: 12,    // Second crisis scar (was 10h)
    crisisDeathHours: 16,    // Death (was 14h) - more time to recover
    daySeconds: 86400,

    debugTapThreshold: 20,
    singCooldown: 240000,      // 4 min (was 5 min) - more frequent singing
    fertilizeCooldown: 150000, // 2.5 min (was 3 min) - more frequent fertilizing
    rainRestCooldown: 240000,  // 4 min (was 5 min) - rain returns sooner
    sunRestCooldown: 360000,   // 6 min (was 8 min) - sun returns sooner
    loveRestCooldown: 120000,  // 2 min (was 3 min) - can love more often

    maxFireflyPerFamily: 12, 
    offlineChunkSize: 60,
    
    performance: {
        enableParticles: true,
        lowPowerMode: false,
        maxParticlesLowPower: 5,
        normalTickRate: 1000,
        lowPowerTickRate: 2000,
        renderThrottleMs: 1000,
        lowPowerRenderThrottleMs: 2000
    }
};

const DREAMS = Object.freeze([
    "dreamed of distant mountains", "listened to rain and remembered forests",
    "felt roots intertwining with the past", "saw gardens yet to bloom",
    "remembered its first sunrise", "heard whispers from sleeping seeds",
    "imagined dancing with fireflies", "felt the heartbeat of the earth",
    "dreamed of butterfly wings", "whispered secrets to the moon"
]);

let state = {
    water: 50, sun: 50, love: 50, growth: 0, stage: 1,
    
    isSunLampOn: false, isRainOn: false,
    day: 1, dayProgress: 0, generation: 1,
    name: "Sprout", season: 0, dna: null,
    
    potColor: POT_COLORS[0], 
    potPattern: 'patNone', 
    potPatternColor: 'rgba(255,255,255,0.5)',
    
    timeAtZero: 0, isDead: false, history: [],
    lastSave: Date.now(), growthMultiplier: 1,
    
    singCooldownUntil: 0, fertilizeCooldownUntil: 0,
    rainRestUntil: 0, sunRestUntil: 0, loveRestUntil: 0,
    
    fireflies: {}, 
    totalFireflies: 0, 
    activeGuardians: [],
    
    buffs: [], scars: [], crisisCount: 0, inheritedTraits: [],
    lastDream: null, isMusicPlaying: false,
    neglect: { waterLowMs: 0, sunLowMs: 0, loveLowMs: 0, crisisMs: 0, partialDormant: false },
    lastWhisperAt: 0
};

let els = {};
let selectedFamily = null;
let activeBigFireflies = [];
let lastTickTime = Date.now();
let saveDebounceTimer = null;
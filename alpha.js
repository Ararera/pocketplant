const POT_COLORS = ['#e07a5f', '#d4a373', '#8d99ae', '#ef476f', '#118ab2', '#06d6a0', '#ffd166', '#a8dadc', '#457b9d', '#e63946', '#f1faee', '#2a9d8f', '#264653', '#f4a261', '#e76f51', '#cdb4db', '#ffc8dd', '#ffafcc', '#bde0fe', '#a2d2ff', '#606c38', '#283618', '#fefae0', '#dda15e', '#bc6c25', '#333333'];
const PATTERN_COLORS = ['rgba(255,255,255,0.5)', 'rgba(255,255,255,0.3)', 'rgba(0,0,0,0.2)', '#ffd700', '#c0c0c0', '#cd7f32', '#f472b6', '#60a5fa', '#4ade80'];
const PATTERNS = [{
    id: 'patNone',
    name: 'None',
    unlockAt: 0
}, {
    id: 'patStripes',
    name: '///',
    unlockAt: 5
}, {
    id: 'patHearts',
    name: '♥',
    unlockAt: 15
}, {
    id: 'patWaves',
    name: '〰',
    unlockAt: 30
}, {
    id: 'patNotes',
    name: '♪',
    unlockAt: 50
}, {
    id: 'patChecks',
    name: '▦',
    unlockAt: 75
}, {
    id: 'patStars',
    name: '★',
    unlockAt: 100
}, {
    id: 'patDiamonds',
    name: '◆',
    unlockAt: 150
}, {
    id: 'patLeaves',
    name: '🌿',
    unlockAt: 200
}, {
    id: 'patMoons',
    name: '☽',
    unlockAt: 300
}];

const FIREFLY_FAMILIES = [{
    name: 'Ember',
    hue: 15,
    power: 'warmth',
    desc: 'Restores sun vitality',
    effect: 'sun'
}, {
    name: 'Citrine',
    hue: 45,
    power: 'growth',
    desc: 'Accelerates growth',
    effect: 'growth'
}, {
    name: 'Verdant',
    hue: 120,
    power: 'vitality',
    desc: 'Boosts overall health',
    effect: 'health'
}, {
    name: 'Aqua',
    hue: 180,
    power: 'hydration',
    desc: 'Restores water',
    effect: 'water'
}, {
    name: 'Azure',
    hue: 210,
    power: 'calm',
    desc: 'Slows decay',
    effect: 'slow'
}, {
    name: 'Violet',
    hue: 270,
    power: 'dreams',
    desc: 'Increases luck',
    effect: 'luck'
}, {
    name: 'Rose',
    hue: 330,
    power: 'love',
    desc: 'Fills with affection',
    effect: 'love'
}, {
    name: 'Pearl',
    hue: 0,
    sat: 15,
    power: 'mystery',
    desc: 'Random powerful effects',
    effect: 'random'
}];

const GUARDIAN_THRESHOLD = 20;
const SEASONS = [{
    name: 'Spring',
    icon: '🌸',
    growth: 1.1
}, {
    name: 'Summer',
    icon: '☀️',
    growth: 1.2
}, {
    name: 'Autumn',
    icon: '🍂',
    growth: 0.9
}, {
    name: 'Winter',
    icon: '❄️',
    growth: 0.7
}];
const MOON_PHASES = [{
    name: 'New Moon',
    icon: '🌑',
    phase: 100
}, {
    name: 'Waxing Crescent',
    icon: '🌒',
    phase: 75
}, {
    name: 'First Quarter',
    icon: '🌓',
    phase: 50
}, {
    name: 'Waxing Gibbous',
    icon: '🌔',
    phase: 25
}, {
    name: 'Full Moon',
    icon: '🌕',
    phase: 0
}, {
    name: 'Waning Gibbous',
    icon: '🌖',
    phase: -25
}, {
    name: 'Last Quarter',
    icon: '🌗',
    phase: -50
}, {
    name: 'Waning Crescent',
    icon: '🌘',
    phase: -75
}];
const STAGES = ['Shoot', 'Seedling', 'Sprout', 'Budding', 'Bloom', 'Flourish'];
const STAGE_THRESHOLDS = [0, 300, 1000, 2500, 5000, 8000];
const MOODS = {
    thriving: {
        text: 'basking contentedly',
        color: '#4ade80',
        threshold: 75
    },
    content: {
        text: 'swaying gently',
        color: '#a3e635',
        threshold: 55
    },
    restless: {
        text: 'reaching for light',
        color: '#facc15',
        threshold: 35
    },
    struggling: {
        text: 'wilting slowly',
        color: '#fb923c',
        threshold: 15
    },
    dormant: {
        text: 'in deep slumber',
        color: '#f87171',
        threshold: 0
    }
};
const PLANT_STATES = {
    thriving: {
        min: 80,
        label: "Thriving",
        color: "#4ade80"
    },
    content: {
        min: 60,
        label: "Content",
        color: "#a3e635"
    },
    restless: {
        min: 40,
        label: "Restless",
        color: "#facc15"
    },
    strained: {
        min: 20,
        label: "Strained",
        color: "#fb923c"
    },
    dormant: {
        min: 0,
        label: "Dormant",
        color: "#f87171"
    }
};
const INHERITABLE_TRAITS = [{
    id: 'resilience',
    name: 'Resilient',
    desc: 'Slower stat decay'
}, {
    id: 'bloomSpeed',
    name: 'Quick Bloomer',
    desc: 'Faster growth'
}, {
    id: 'leafiness',
    name: 'Lush',
    desc: 'More leaves'
}, {
    id: 'colorVibrancy',
    name: 'Vibrant',
    desc: 'Richer colors'
}, {
    id: 'flowerPower',
    name: 'Floriferous',
    desc: 'More flowers'
}, {
    id: 'fireflyAffinity',
    name: 'Firefly Friend',
    desc: 'Attracts more fireflies'
}, {
    id: 'moonBloom',
    name: 'Night Bloomer',
    desc: 'Faster growth at night'
}, {
    id: 'stormBorn',
    name: 'Storm Born',
    desc: 'Thrives in heavy rain'
}, {
    id: 'glassSkin',
    name: 'Glass Skin',
    desc: 'Fragile but retains water'
}, {
    id: 'goldenHeart',
    name: 'Golden Heart',
    desc: 'Starts with deep affection'
}, {
    id: 'dreamWeaver',
    name: 'Dream Weaver',
    desc: 'Vivid dreams & events'
}];
const CONFIG = {
    decayRate: {
        water: 0.035,
        sun: 0.035,
        love: 0.02
    },
    growthRate: 0.35,
    tickRate: 1000,
    threshold: 40,
    deathTimeLimit: 12 * 60 * 60 * 1000,
    offlineDecayFactor: 0.08,
    singCooldown: 300000,
    fertilizeCooldown: 180000,
    maxFireflyPerFamily: 50,
    debugTapThreshold: 20,
    contaminationRate: 0.015, // Slow build-up of soil contamination
    cleanseCost: 50 // Points required to clean soil
};
const DREAMS = ["dreamed of distant mountains", "listened to rain and remembered forests", "felt roots intertwining with the past", "saw gardens yet to bloom", "remembered its first sunrise", "heard whispers from sleeping seeds", "imagined dancing with fireflies", "felt the heartbeat of the earth", "dreamed of butterfly wings", "whispered secrets to the moon"];

let state = {
    water: 50,
    sun: 50,
    love: 50,
    growth: 0,
    stage: 1,
    isSunLampOn: false,
    isRainOn: false,
    day: 1,
    generation: 1,
    name: "Sprout",
    season: 0,
    dna: null,
    potColor: POT_COLORS[0],
    potPattern: 'patNone',
    potPatternColor: 'rgba(255,255,255,0.5)',
    timeAtZero: 0,
    isDead: false,
    history: [],
    lastSave: Date.now(),
    growthMultiplier: 1,
    singCooldownUntil: 0,
    fertilizeCooldownUntil: 0,
    fireflies: {},
    totalFireflies: 0,
    activeGuardians: [],
    buffs: [],
    scars: [],
    crisisCount: 0,
    inheritedTraits: [],
    lastDream: null,
    isMusicPlaying: false,
    pollution: 0,
    soilContamination: 0 // Track soil contamination level (0-100)
};
let els = {},
    selectedFamily = null,
    activeBigFireflies = [];

const audio = {
    ctx: null,
    rainOsc: null,
    rainGain: null,
    isRainPlaying: false,
    bgTimer: null,
    isMusicPlaying: false,
    init() {
        if (!this.ctx) this.ctx = new(window.AudioContext || window.webkitAudioContext)()
    },
    play(freq, type, dur, vol = 0.05) {
        if (!this.ctx) this.init();
        if (this.ctx.state === 'suspended') this.ctx.resume();
        const o = this.ctx.createOscillator(),
            g = this.ctx.createGain();
        o.type = type;
        o.frequency.value = freq;
        g.gain.setValueAtTime(0.01, this.ctx.currentTime);
        g.gain.linearRampToValueAtTime(vol, this.ctx.currentTime + 0.05);
        g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur);
        o.connect(g);
        g.connect(this.ctx.destination);
        o.start();
        o.stop(this.ctx.currentTime + dur)
    },
    startRainSound() {
        if (!this.ctx) this.init();
        if (this.ctx.state === 'suspended') this.ctx.resume();
        this.stopRainSound();
        this.isRainPlaying = true;
        const buf = this.ctx.createBuffer(1, this.ctx.sampleRate * 2, this.ctx.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * 0.1;
        this.rainOsc = this.ctx.createBufferSource();
        this.rainOsc.buffer = buf;
        this.rainOsc.loop = true;
        this.rainGain = this.ctx.createGain();
        this.rainGain.gain.value = 0;
        this.rainOsc.connect(this.rainGain);
        this.rainGain.connect(this.ctx.destination);
        this.rainOsc.start();
        this.rainGain.gain.linearRampToValueAtTime(0.05, this.ctx.currentTime + 2)
    },
    stopRainSound() {
        this.isRainPlaying = false;
        if (this.rainGain && this.rainOsc) {
            try {
                this.rainGain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.5);
                const o = this.rainOsc;
                setTimeout(() => {
                    try {
                        o.stop()
                    } catch (e) {}
                }, 600)
            } catch (e) {}
        }
        this.rainOsc = null;
        this.rainGain = null
    },
    toggleRainSound(on) {
        if (on && !this.isRainPlaying) this.startRainSound();
        else if (!on && this.isRainPlaying) this.stopRainSound()
    },
    water() {
        this.play(800, 'sine', 0.2)
    },
    sun() {
        this.play(300, 'triangle', 0.5)
    },
    love() {
        this.play(150, 'sine', 0.5)
    },
    chime() {
        this.play(600, 'sine', 0.1);
        this.play(800, 'sine', 0.2)
    },
    song: [{
        f: 262,
        d: 4
    }, {
        f: 330,
        d: 4
    }, {
        f: 392,
        d: 4
    }, {
        f: 330,
        d: 4
    }, {
        f: [262, 392],
        d: 8
    }, {
        f: [294, 440],
        d: 8
    }, {
        f: 330,
        d: 4
    }, {
        f: 262,
        d: 4
    }, {
        f: [196, 330],
        d: 8
    }, {
        f: 0,
        d: 2
    }, {
        f: [262, 330, 392],
        d: 12
    }, {
        f: 0,
        d: 4
    }, {
        f: 440,
        d: 2
    }, {
        f: 392,
        d: 2
    }, {
        f: 330,
        d: 2
    }, {
        f: 392,
        d: 2
    }, {
        f: [262, 440],
        d: 8
    }, {
        f: [294, 392],
        d: 8
    }, {
        f: [330, 523],
        d: 16
    }, {
        f: 0,
        d: 4
    }, {
        f: 196,
        d: 4
    }, {
        f: 262,
        d: 4
    }, {
        f: 330,
        d: 4
    }, {
        f: 392,
        d: 4
    }, {
        f: [262, 392, 523],
        d: 12
    }, {
        f: 0,
        d: 8
    }],
    playBackgroundMusic() {
        if (!this.ctx) this.init();
        if (this.ctx.state === 'suspended') this.ctx.resume();
        if (this.isMusicPlaying) return;
        this.isMusicPlaying = true;
        let i = 0;
        const play = () => {
            if (!this.isMusicPlaying) return;
            const n = this.song[i % this.song.length];
            const freqs = Array.isArray(n.f) ? n.f : [n.f];
            freqs.forEach(f => {
                if (f > 0) this.play(f, 'sine', n.d * 0.4, 0.02)
            });
            i++;
            this.bgTimer = setTimeout(play, n.d * 400)
        };
        play()
    },
    stopBackgroundMusic() {
        this.isMusicPlaying = false;
        if (this.bgTimer) clearTimeout(this.bgTimer)
    }
};

function generateDNA(parent = null) {
    const wild = Math.random() > 0.75,
        baseH = wild ? Math.random() * 360 : 80 + Math.random() * 80;
    const dna = {
        colorH: parent ? lerp(parent.colorH, baseH, 0.3) : baseH,
        colorS: 45 + Math.random() * 35,
        colorL: 35 + Math.random() * 20,
        flowerH: Math.random() * 360,
        flowerS: 60 + Math.random() * 30,
        flowerL: 55 + Math.random() * 20,
        stemCurve: parent ? parent.stemCurve * 0.3 + (Math.random() - 0.5) * 40 : (Math.random() - 0.5) * 30,
        stemHeight: 70 + Math.random() * 30,
        leafCount: Math.floor(3 + Math.random() * 3),
        leafNodes: Math.floor(3 + Math.random() * 3),
        leafSize: 0.8 + Math.random() * 0.4,
        leafScale: 0.9 + Math.random() * 0.3,
        leafAngle: 35 + Math.random() * 30,
        leafShape: ['round', 'pointed', 'heart', 'oak'][Math.floor(Math.random() * 4)],
        leanDirection: Math.random() > 0.5 ? 1 : -1,
        branchSpread: 20 + Math.random() * 15,
        flowerCount: Math.floor(1 + Math.random() * 3),
        petalCount: Math.floor(4 + Math.random() * 5),
        petalShape: ['round', 'pointed', 'wavy'][Math.floor(Math.random() * 3)],
        resilience: parent?.resilience || (0.8 + Math.random() * 0.4),
        bloomSpeed: parent?.bloomSpeed || (0.9 + Math.random() * 0.2),
        fireflyChance: parent?.fireflyChance || 0.05
    };
    state.inheritedTraits.forEach(tid => {
        const t = INHERITABLE_TRAITS.find(x => x.id === tid);
        if (t) {
            if (tid === 'resilience') dna.resilience = Math.min(2, (dna.resilience || 1) + 0.2);
            if (tid === 'bloomSpeed') dna.bloomSpeed = Math.min(1.5, (dna.bloomSpeed || 1) + 0.1);
            if (tid === 'leafiness') dna.leafNodes = Math.min(6, (dna.leafNodes || 4) + 1);
            if (tid === 'colorVibrancy') dna.colorS = Math.min(80, (dna.colorS || 50) + 10);
            if (tid === 'flowerPower') dna.flowerCount = Math.min(4, (dna.flowerCount || 1) + 1);
            if (tid === 'fireflyAffinity') dna.fireflyChance = Math.min(0.15, (dna.fireflyChance || 0.05) + 0.03);
            if (tid === 'glassSkin') dna.resilience = Math.max(0.5, (dna.resilience || 1) - 0.2);
            if (tid === 'goldenHeart') state.love = 100;
        }
    });
    dna.flowerColor = `hsl(${dna.flowerH},${dna.flowerS}%,${dna.flowerL}%)`;
    return dna
}

function lerp(a, b, t) {
    return a + (b - a) * t
}

function createSVGElement(tag) {
    return document.createElementNS("http://www.w3.org/2000/svg", tag)
}

// [removed duplicate startGameLoop]


// [removed duplicate gameTick]


// [removed duplicate decay]


// [removed duplicate checkDeath]


// [removed duplicate triggerDeath]


// [removed duplicate grow]


// [removed duplicate processBuffs]


// [removed duplicate processGuardians]


// [removed duplicate getMood]


// [removed duplicate getPlantState]


// [removed duplicate getAverageVitality]


// [removed duplicate processOfflineProgress]


// [removed duplicate resetGame]

// logic.js - Core Simulation Logic

function getHealMod(v) {
    if (v < CONFIG.healThreshold2) return CONFIG.healMod2;
    if (v < CONFIG.healThreshold1) return CONFIG.healMod1;
    return 1;
}

function applyHeal(stat, base) {
    const m = getHealMod(state[stat]);
    const gained = base * m;
    state[stat] = Math.min(100, state[stat] + gained);
    return gained;
}

function computeGrowthFactor() {
    const w = state.water, s = state.sun, l = state.love;
    const min = Math.min(w, s, l), avg = (w + s + l) / 3;
    if (min < 10) return 0.05;
    if (avg < 30) return 0.12;
    if (avg < 60) return 0.45;
    if (min > 75) return 1.0;
    return 0.70;
}

function simulateStep(dtSeconds, mode = 'online') {
    if (state.isDead) return { growth: 0, scarsAdded: [] };
    const changes = { growth: 0, scarsAdded: [], died: false }, isOffline = mode === 'offline';
    const res = state.dna?.resilience || 1, slowGuardian = state.activeGuardians.includes(4) ? 0.7 : 1;
    const decayMult = {
        water: isOffline ? CONFIG.offlineDecayMult.water : 1,
        sun: isOffline ? CONFIG.offlineDecayMult.sun : 1,
        love: isOffline ? CONFIG.offlineDecayMult.love : 1
    };
    const dayFactor = isOffline ? 0.85 : (isDaytime() ? 1 : 0.7);

    state.water = Math.max(0, state.water - (CONFIG.decayRate.water / res) * slowGuardian * decayMult.water * dtSeconds);
    state.sun = Math.max(0, state.sun - (CONFIG.decayRate.sun / res) * slowGuardian * decayMult.sun * dayFactor * dtSeconds);
    state.love = Math.max(0, state.love - (CONFIG.decayRate.love / res) * slowGuardian * decayMult.love * dtSeconds);

    const recoveryFactor = isOffline ? 0.6 : 1;
    const waterWasBelow100 = state.water < 100;
    const sunWasBelow100 = state.sun < 100;
    
    if (state.isRainOn && state.water < 100) {
        state.water = Math.min(100, state.water + CONFIG.recoveryRate.water * dtSeconds * recoveryFactor * getHealMod(state.water));
        // Check if water just hit 100 via rain
        if (!isOffline && waterWasBelow100 && state.water >= 100) {
            state.rainRestUntil = Date.now() + CONFIG.rainRestCooldown;
            state.isRainOn = false;
            spawnFloatingText("💧 Fully hydrated! Resting...", "var(--accent-water)", "good");
            applyTheme();
        }
    }
    if (state.isSunLampOn && state.sun < 100) {
        const rate = isDaytime() ? CONFIG.recoveryRate.sunDay : CONFIG.recoveryRate.sunNight;
        state.sun = Math.min(100, state.sun + rate * dtSeconds * recoveryFactor * getHealMod(state.sun));
        // Check if sun just hit 100 via lamp
        if (!isOffline && sunWasBelow100 && state.sun >= 100) {
            state.sunRestUntil = Date.now() + CONFIG.sunRestCooldown;
            state.isSunLampOn = false;
            spawnFloatingText("☀️ Fully energized! Resting...", "var(--accent-sun)", "good");
            applyTheme();
        }
    }

    const neglectChanges = updateNeglectTimers(dtSeconds * 1000, isOffline);
    changes.scarsAdded.push(...neglectChanges.scarsAdded);
    const deathResult = checkCrisisAndDeath(isOffline);
    changes.scarsAdded.push(...deathResult.scarsAdded);
    changes.died = deathResult.died;

    if (!changes.died) {
        const seasonG = SEASONS[state.season % 4].growth, bloom = state.dna?.bloomSpeed || 1;
        const dormantPen = state.scars.includes('dormant') ? 0.5 : 1;
        const partialPen = (state.neglect && state.neglect.partialDormant) ? 0.75 : 1;
        const careMult = computeGrowthFactor();
        const growthGained = CONFIG.growthRate * state.growthMultiplier * seasonG * bloom * dormantPen * partialPen * careMult * dtSeconds;
        state.growth += growthGained;
        changes.growth = growthGained;

        let next = 1;
        for (let i = 1; i < STAGE_THRESHOLDS.length; i++) if (state.growth >= STAGE_THRESHOLDS[i]) next = i + 1;
        if (next > state.stage) {
            state.stage = next;
            changes.evolved = true;
            try {
                if (typeof unlockDiscovery === 'function') {
                    if (state.stage >= 5) unlockDiscovery('reached_bloom');
                    if (state.stage >= 6) unlockDiscovery('full_bloom');
                }
            } catch (_) {}
            if (!isOffline && els.plantHero) {
                els.plantHero.classList.add('evolving');
                setTimeout(() => els.plantHero.classList.remove('evolving'), 2000);
                renderPlant('plantGroup', state.dna, state.stage);
                spawnFloatingText("✨ Evolved.", null, 'good');
                audio.chime();
            }
        }
        state.dayProgress = (state.dayProgress || 0) + dtSeconds;
        while (state.dayProgress >= CONFIG.daySeconds) {
            state.dayProgress -= CONFIG.daySeconds;
            state.day++;
        }
    }
    return changes;
}

function updateNeglectTimers(dtMs, offline = false) {
    if (!state.neglect) state.neglect = { waterLowMs: 0, sunLowMs: 0, loveLowMs: 0, crisisMs: 0, partialDormant: false };
    const result = { scarsAdded: [] }, res = state.dna?.resilience || 1;
    const eff = dtMs / Math.max(0.6, res), t = CONFIG.neglectThreshold, rec = CONFIG.neglectRecoveryRate;

    if (state.water < t) state.neglect.waterLowMs += eff; else state.neglect.waterLowMs = Math.max(0, state.neglect.waterLowMs - dtMs * rec);
    if (state.sun < t) state.neglect.sunLowMs += eff; else state.neglect.sunLowMs = Math.max(0, state.neglect.sunLowMs - dtMs * rec);
    if (state.love < t) state.neglect.loveLowMs += eff; else state.neglect.loveLowMs = Math.max(0, state.neglect.loveLowMs - dtMs * rec);

    const warnMs = CONFIG.neglectWarnHours * 3600000, scarMs = CONFIG.neglectScarHours * 3600000;
    if (!offline && els.plantHero) {
        els.plantHero.classList.toggle('droop-plant', state.neglect.waterLowMs >= warnMs);
        els.plantHero.classList.toggle('shade-plant', state.neglect.sunLowMs >= warnMs);
        els.plantHero.classList.toggle('quiet-plant', state.neglect.loveLowMs >= warnMs);
    }
    if (state.neglect.waterLowMs >= scarMs && !state.scars.includes('wilt')) {
        state.scars.push('wilt');
        result.scarsAdded.push('wilt');
        if (!offline) { spawnFloatingText('Thirst left a trace.', null, 'bad'); renderPlant('plantGroup', state.dna, state.stage); }
    }
    if (state.neglect.sunLowMs >= scarMs && !state.scars.includes('pale')) {
        state.scars.push('pale');
        result.scarsAdded.push('pale');
        if (!offline) { spawnFloatingText('Light faded.', null, 'bad'); renderPlant('plantGroup', state.dna, state.stage); }
    }
    if (state.neglect.loveLowMs >= scarMs) state.neglect.partialDormant = true;
    if (state.love >= 35) state.neglect.partialDormant = false;

    const inCrisis = state.water < CONFIG.crisisThreshold && state.sun < CONFIG.crisisThreshold && state.love < CONFIG.crisisThreshold;
    if (inCrisis) state.neglect.crisisMs += eff; else state.neglect.crisisMs = Math.max(0, state.neglect.crisisMs - dtMs * rec);
    state.timeAtZero = state.neglect.crisisMs;
    return result;
}

function checkCrisisAndDeath(offline = false) {
    const result = { scarsAdded: [], died: false };
    if (state.isDead) return result;
    const cMs = state.neglect?.crisisMs || 0, hrs = cMs / 3600000;

    if (hrs >= CONFIG.crisisDormantHours && !state.scars.includes('dormant')) {
        state.scars.push('dormant'); result.scarsAdded.push('dormant');
        if (els.plantHero) els.plantHero.classList.add('dormant-plant');
        if (!offline) spawnFloatingText('It withdrew into stillness.', null, 'warn');
        renderPlant('plantGroup', state.dna, state.stage);
    }
    if (hrs >= CONFIG.crisisScar1Hours && !state.scars.includes('wilt')) {
        state.scars.push('wilt'); result.scarsAdded.push('wilt');
        if (!offline) spawnFloatingText('Crisis left a scar.', null, 'bad');
        renderPlant('plantGroup', state.dna, state.stage);
    }
    if (hrs >= CONFIG.crisisScar2Hours && !state.scars.includes('bend')) {
        state.scars.push('bend'); result.scarsAdded.push('bend');
        renderPlant('plantGroup', state.dna, state.stage);
    }
    if (hrs >= CONFIG.crisisDeathHours) {
        triggerDeath(); result.died = true;
    }
    return result;
}

function generateDNA(parent = null) {
    // Keep the overall "plant identity" cohesive, but allow meaningful variety.
    const wild = Math.random() > 0.75;
    const baseH = wild ? Math.random() * 360 : 80 + Math.random() * 80; // mostly green family
    const lerpHue = (a, b, t) => {
        // shortest-path hue interpolation
        const d = ((((b - a) % 360) + 540) % 360) - 180;
        return (a + d * t + 360) % 360;
    };
    const randChoice = (arr) => arr[Math.floor(Math.random() * arr.length)];
    const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
    const pickHueAvoid = (avoidMin, avoidMax) => {
        // Returns hue in [0,360) that avoids [avoidMin, avoidMax] inclusive.
        // If avoid wraps (shouldn't here), handle anyway.
        let h = Math.random() * 360;
        for (let i = 0; i < 12; i++) {
            const inBand = avoidMin <= avoidMax ? (h >= avoidMin && h <= avoidMax) : (h >= avoidMin || h <= avoidMax);
            if (!inBand) return h;
            h = Math.random() * 360;
        }
        // worst case fallback: hop outside the band deterministically
        const span = (avoidMax - avoidMin + 360) % 360;
        return (avoidMax + 10 + Math.random() * (360 - span - 20)) % 360;
    };

    // --- Core palette (stem + leaves) ---
    const coreH = parent ? lerpHue(parent.colorH, baseH, 0.30) : baseH;
    const coreS = clamp((parent ? lerp(parent.colorS, 50 + Math.random() * 35, 0.25) : (45 + Math.random() * 35)), 25, 85);
    const coreL = clamp((parent ? lerp(parent.colorL, 30 + Math.random() * 25, 0.25) : (35 + Math.random() * 20)), 18, 70);

    // --- Flower palette: explicitly avoid green hues (real flowers are rarely truly green) ---
    // Avoid a broad "green" band so we don't get chartreuse / lime flowers.
    const flowerH0 = pickHueAvoid(75, 165);
    const flowerH = parent ? lerpHue(parent.flowerH ?? flowerH0, flowerH0, 0.55) : flowerH0;

    // --- Shapes & textures ---
    const LEAF_SHAPES = [
        'round', 'oval', 'lanceolate', 'pointed', 'teardrop',
        'heart', 'spade', 'oak', 'lobed', 'maple',
        'fern', 'needle', 'eucalyptus', 'banana'
    ];
    const LEAF_EDGES = ['smooth', 'serrated', 'lobed'];
    const LEAF_TEXTURES = ['plain', 'veined', 'speckled', 'variegated'];

    // Keep stems believable: mostly smooth/ridged/speckled with occasional nodes/thorns.
    const STEM_TEXTURES = ['smooth', 'ridged', 'speckled', 'striped'];
    const STEM_SURFACES = ['none', 'nodes', 'thorns', 'hairs'];

    // Flower archetypes that still read as "real"
    const FLOWER_TYPES = [
        { id: 'simple', w: 42 },
        { id: 'daisy',  w: 22 },
        { id: 'tulip',  w: 14 },
        { id: 'bell',   w: 12 },
        { id: 'rose',   w: 8  },
        { id: 'orchid', w: 2  } // rare
    ];
    const pickWeighted = (items) => {
        const total = items.reduce((s, x) => s + x.w, 0);
        let r = Math.random() * total;
        for (const it of items) { r -= it.w; if (r <= 0) return it.id; }
        return items[0].id;
    };

    const flowerType = pickWeighted(FLOWER_TYPES);

    // Petal counts constrained per archetype (keeps it from looking alien)
    const petalCountByType = (t) => {
        if (t === 'tulip') return 6;
        if (t === 'bell') return 5;
        if (t === 'orchid') return 5; // 3 sepals + 2 petals vibe (stylized)
        if (t === 'rose') return 10 + Math.floor(Math.random() * 10); // layered
        if (t === 'daisy') return 12 + Math.floor(Math.random() * 14); // ray petals
        // simple
        return 4 + Math.floor(Math.random() * 5);
    };

    const petalCount0 = petalCountByType(flowerType);

    // Petal shapes limited to a few families; the archetype provides the main silhouette.
    const petalShape0 = randChoice(['round', 'pointed', 'wavy']);

    const dna = {
        // Core (stem/leaf) color family
        colorH: coreH,
        colorS: coreS,
        colorL: coreL,

        // Flower color family (non-green)
        flowerH: flowerH,
        flowerS: clamp(60 + Math.random() * 30, 35, 95),
        flowerL: clamp(50 + Math.random() * 25, 30, 85),

        // Stem geometry
        stemCurve: parent ? parent.stemCurve * 0.3 + (Math.random() - 0.5) * 50 : (Math.random() - 0.5) * 35,
        stemHeight: clamp((parent ? lerp(parent.stemHeight, 72 + Math.random() * 38, 0.35) : (70 + Math.random() * 35)), 55, 120),
        stemWidth: clamp((parent ? lerp(parent.stemWidth ?? 3.5, 3.0 + Math.random() * 2.6, 0.35) : (3.0 + Math.random() * 2.6)), 2.6, 6.2),
        stemHueOffset: (Math.random() * 14 - 7), // subtle, keeps plant cohesive
        stemTexture: randChoice(STEM_TEXTURES),
        stemSurface: (Math.random() < 0.25 ? randChoice(STEM_SURFACES) : 'none'),
        stemStripeStrength: Math.random() < 0.25 ? (0.15 + Math.random() * 0.25) : 0,
        stemSpeckleStrength: Math.random() < 0.25 ? (0.10 + Math.random() * 0.25) : 0,

        // Leaves
        leafCount: Math.floor(3 + Math.random() * 4),
        leafNodes: Math.floor(3 + Math.random() * 4),
        leafSize: 0.75 + Math.random() * 0.55,
        leafScale: 0.85 + Math.random() * 0.35,
        leafAngle: 30 + Math.random() * 40,
        leafShape: randChoice(LEAF_SHAPES),
        leafEdge: randChoice(LEAF_EDGES),
        leafTexture: randChoice(LEAF_TEXTURES),
        leafHueOffset: (Math.random() * 18 - 9),
        leafSatOffset: (Math.random() * 14 - 7),
        leafLightOffset: (Math.random() * 14 - 7),
        leafVeinStrength: 0.15 + Math.random() * 0.25,
        leafVariegation: Math.random() < 0.22 ? (0.12 + Math.random() * 0.22) : 0,
        leafSpeckleStrength: Math.random() < 0.20 ? (0.10 + Math.random() * 0.25) : 0,

        // Structure
        leanDirection: Math.random() > 0.5 ? 1 : -1,
        branchSpread: 18 + Math.random() * 18,

        // Flowers
        flowerType: flowerType,
        flowerCount: Math.floor(1 + Math.random() * 3),
        petalCount: petalCount0,
        petalShape: petalShape0,
        flowerCenterHueOffset: (Math.random() * 60 - 30),
        flowerCenterLight: 50 + Math.random() * 20,

        // Gameplay traits
        resilience: parent?.resilience || (0.8 + Math.random() * 0.4),
        bloomSpeed: parent?.bloomSpeed || (0.9 + Math.random() * 0.2),
        fireflyChance: parent?.fireflyChance || 0.05
    };

    dna.seed = parent && parent.seed ? (parent.seed + Math.floor(Math.random() * 99991)) : Math.floor(Math.random() * 1e9);

    // Allow multiple leaf shapes per plant (more natural variety), but keep it cohesive.
    if (Math.random() < 0.55) {
        const n = 2 + Math.floor(Math.random() * 3); // 2-4 shapes
        const set = new Set([dna.leafShape]);
        while (set.size < n) set.add(LEAF_SHAPES[Math.floor(Math.random() * LEAF_SHAPES.length)]);
        dna.leafShapes = [...set];
    } else {
        dna.leafShapes = [dna.leafShape];
    }

    dna.leafSizeVar = 0.22 + Math.random() * 0.26;

    // Inherited trait modifiers
    state.inheritedTraits.forEach(tid => {
        const t = INHERITABLE_TRAITS.find(x => x.id === tid);
        if (t) {
            if (tid === 'resilience') dna.resilience = Math.min(2, (dna.resilience || 1) + 0.2);
            if (tid === 'bloomSpeed') dna.bloomSpeed = Math.min(1.5, (dna.bloomSpeed || 1) + 0.1);
            if (tid === 'leafiness') dna.leafNodes = Math.min(7, (dna.leafNodes || 4) + 1);
            if (tid === 'colorVibrancy') dna.colorS = Math.min(85, (dna.colorS || 50) + 10);
            if (tid === 'flowerPower') dna.flowerCount = Math.min(4, (dna.flowerCount || 1) + 1);
            if (tid === 'fireflyAffinity') dna.fireflyChance = Math.min(0.15, (dna.fireflyChance || 0.05) + 0.03);
        }
    });

    // Final computed colors (used by renderer)
    dna.flowerColor = `hsl(${dna.flowerH},${dna.flowerS}%,${dna.flowerL}%)`;
    const ch = (dna.flowerH + dna.flowerCenterHueOffset + 360) % 360;
    dna.flowerCenterColor = `hsl(${ch},${Math.max(35, dna.flowerS - 25)}%,${dna.flowerCenterLight}%)`;

    return dna;
}

function triggerDeath() {
    state.isDead = true;
    if (els.plantHero) els.plantHero.classList.add('dead-plant');
    if (els.deathOverlay) els.deathOverlay.classList.add('open');
    audio.stopRainSound();
    audio.stopBackgroundMusic();
    saveState();
}

function processBuffs() {
    state.buffs = state.buffs.filter(b => {
        b.remaining--;
        if (b.type === 'water') state.water = Math.min(100, state.water + b.strength);
        if (b.type === 'sun') state.sun = Math.min(100, state.sun + b.strength);
        if (b.type === 'love') state.love = Math.min(100, state.love + b.strength);
        if (b.type === 'growth') state.growth += b.strength;
        if (b.type === 'health') {
            state.water = Math.min(100, state.water + b.strength * 0.3);
            state.sun = Math.min(100, state.sun + b.strength * 0.3);
            state.love = Math.min(100, state.love + b.strength * 0.3);
        }
        return b.remaining > 0;
    });
}

function processGuardians() {
    state.activeGuardians.forEach(i => {
        const f = FIREFLY_FAMILIES[i];
        if (f.effect === 'water') state.water = Math.min(100, state.water + 0.02);
        if (f.effect === 'sun') state.sun = Math.min(100, state.sun + 0.02);
        if (f.effect === 'love') state.love = Math.min(100, state.love + 0.02);
        if (f.effect === 'growth') state.growth += 0.1;
        if (f.effect === 'health') {
            state.water = Math.min(100, state.water + 0.01);
            state.sun = Math.min(100, state.sun + 0.01);
            state.love = Math.min(100, state.love + 0.01);
        }
    });
}

function lerp(a, b, t) { return a + (b - a) * t; }
function getTimeOfDay() {
    const h = new Date().getHours();
    if (h >= 5 && h < 7) return 'dawn';
    if (h >= 7 && h < 10) return 'morning';
    if (h >= 10 && h < 16) return 'day';
    if (h >= 16 && h < 18) return 'afternoon';
    if (h >= 18 && h < 20) return 'dusk';
    if (h >= 20 && h < 22) return 'evening';
    return 'night';
}
function isDaytime() { return ['dawn', 'morning', 'day', 'afternoon', 'dusk'].includes(getTimeOfDay()); }

function startGameLoop() { setInterval(gameTick, CONFIG.tickRate); }

function gameTick() {
    if (state.isDead || document.visibilityState !== 'visible') return;
    lastTickTime = Date.now();
    simulateStep(CONFIG.tickRate / 1000, 'online');
    processBuffs();
    processGuardians();
    attemptSpawnFirefly();
    if (!saveDebounceTimer) saveDebounceTimer = setTimeout(() => { saveState(); saveDebounceTimer = null; }, 5000);
    render();
}
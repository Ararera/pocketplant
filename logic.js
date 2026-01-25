const _dateCache = new Date();

function getHealMod(v) {
    if (v < CONFIG.healThreshold2) return CONFIG.healMod2;
    if (v < CONFIG.healThreshold1) return CONFIG.healMod1;
    return 1;
}

function applyHeal(stat, base) {
    if (state[stat] >= 100) return 0;
    
    const m = getHealMod(state[stat]);
    const gained = base * m;
    state[stat] = Math.min(100, state[stat] + gained);
    return gained;
}

function computeGrowthFactor() {
    const w = state.water, s = state.sun, l = state.love;
    const min = Math.min(w, s, l);
    
    if (min > 75) return 1.0;
    
    const avg = (w + s + l) * 0.3333;
    if (min < 10) return 0.05;
    if (avg < 30) return 0.12;
    if (avg < 60) return 0.45;
    return 0.70;
}

function simulateStep(dtSeconds, mode = 'online') {
    if (state.isDead) return { growth: 0, scarsAdded: [] };
    
    const changes = { growth: 0, scarsAdded: [], died: false };
    const isOffline = mode === 'offline';
    
    const res = state.dna?.resilience || 1;
    const slowGuardian = state.activeGuardians && state.activeGuardians.includes(4) ? 0.7 : 1;
    
    const dayFactor = isOffline ? 0.85 : (isDaytime() ? 1 : 0.7);
    
    const decayBase = (1 / res) * slowGuardian * dtSeconds;
    
    if (isOffline) {
        state.water = Math.max(0, state.water - (CONFIG.decayRate.water * decayBase * CONFIG.offlineDecayMult.water));
        state.sun = Math.max(0, state.sun - (CONFIG.decayRate.sun * decayBase * CONFIG.offlineDecayMult.sun * dayFactor));
        state.love = Math.max(0, state.love - (CONFIG.decayRate.love * decayBase * CONFIG.offlineDecayMult.love));
    } else {
        state.water = Math.max(0, state.water - (CONFIG.decayRate.water * decayBase));
        state.sun = Math.max(0, state.sun - (CONFIG.decayRate.sun * decayBase * dayFactor));
        state.love = Math.max(0, state.love - (CONFIG.decayRate.love * decayBase));
    }

    const recoveryFactor = isOffline ? 0.6 : 1;
    
    if (state.isRainOn && state.water < 100) {
        const preWater = state.water;
        state.water = Math.min(100, state.water + CONFIG.recoveryRate.water * dtSeconds * recoveryFactor * getHealMod(state.water));
        
        if (!isOffline && preWater < 100 && state.water >= 100) {
            state.rainRestUntil = Date.now() + CONFIG.rainRestCooldown;
            state.isRainOn = false;
            if (typeof spawnFloatingText === 'function') spawnFloatingText("💧 Fully hydrated! Resting...", "var(--accent-water)", "good");
            if (typeof applyTheme === 'function') applyTheme();
        }
    }
    
    if (state.isSunLampOn && state.sun < 100) {
        const preSun = state.sun;
        const rate = isDaytime() ? CONFIG.recoveryRate.sunDay : CONFIG.recoveryRate.sunNight;
        state.sun = Math.min(100, state.sun + rate * dtSeconds * recoveryFactor * getHealMod(state.sun));
        
        if (!isOffline && preSun < 100 && state.sun >= 100) {
            state.sunRestUntil = Date.now() + CONFIG.sunRestCooldown;
            state.isSunLampOn = false;
            if (typeof spawnFloatingText === 'function') spawnFloatingText("☀️ Fully energized! Resting...", "var(--accent-sun)", "good");
            if (typeof applyTheme === 'function') applyTheme();
        }
    }

    const neglectChanges = updateNeglectTimers(dtSeconds * 1000, isOffline);
    if (neglectChanges.scarsAdded.length > 0) changes.scarsAdded.push(...neglectChanges.scarsAdded);
    
    const deathResult = checkCrisisAndDeath(isOffline);
    if (deathResult.scarsAdded.length > 0) changes.scarsAdded.push(...deathResult.scarsAdded);
    changes.died = deathResult.died;

    if (!changes.died) {
        const currentSeason = SEASONS[state.season % 4];
        const seasonG = currentSeason ? currentSeason.growth : 1;
        const bloom = state.dna?.bloomSpeed || 1;
        
        if (!state.scars) state.scars = [];
        const hasDormant = state.scars.includes('dormant');
        const dormantPen = hasDormant ? 0.5 : 1;
        const partialPen = (state.neglect && state.neglect.partialDormant) ? 0.75 : 1;
        
        const careMult = computeGrowthFactor();
        
        const growthGained = CONFIG.growthRate * state.growthMultiplier * seasonG * bloom * dormantPen * partialPen * careMult * dtSeconds;
        
        state.growth += growthGained;
        changes.growth = growthGained;

        const currentThreshold = STAGE_THRESHOLDS[state.stage] || 99999;
        if (state.growth >= currentThreshold) {
            let next = 1;
            for (let i = 1; i < STAGE_THRESHOLDS.length; i++) {
                if (state.growth >= STAGE_THRESHOLDS[i]) next = i + 1;
            }
            
            if (next > state.stage) {
                state.stage = next;
                changes.evolved = true;
                
                try {
                    if (typeof unlockDiscovery === 'function') {
                        if (state.stage >= 5) unlockDiscovery('reached_bloom');
                        if (state.stage >= 6) unlockDiscovery('full_bloom');
                    }
                    if (!isOffline && els.plantHero) {
                        els.plantHero.classList.add('evolving');
                        setTimeout(() => { if (els.plantHero) els.plantHero.classList.remove('evolving'); }, 2000);
                        if (typeof renderPlant === 'function') renderPlant('plantGroup', state.dna, state.stage);
                        spawnFloatingText("✨ Evolved.", null, 'good');
                        if (typeof audio !== 'undefined' && audio.chime) audio.chime();
                    }
                } catch (e) { console.warn("Evolution UI error", e); }
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
    if (!state.scars) state.scars = [];

    const result = { scarsAdded: [] };
    const res = state.dna?.resilience || 1;
    
    const eff = dtMs / Math.max(0.6, res);
    const t = CONFIG.neglectThreshold;
    const rec = CONFIG.neglectRecoveryRate;
    
    if (state.water < t) state.neglect.waterLowMs += eff; 
    else if (state.neglect.waterLowMs > 0) state.neglect.waterLowMs = Math.max(0, state.neglect.waterLowMs - dtMs * rec);
    
    if (state.sun < t) state.neglect.sunLowMs += eff; 
    else if (state.neglect.sunLowMs > 0) state.neglect.sunLowMs = Math.max(0, state.neglect.sunLowMs - dtMs * rec);
    
    if (state.love < t) state.neglect.loveLowMs += eff; 
    else if (state.neglect.loveLowMs > 0) state.neglect.loveLowMs = Math.max(0, state.neglect.loveLowMs - dtMs * rec);

    const warnMs = CONFIG.neglectWarnHours * 3600000;
    const scarMs = CONFIG.neglectScarHours * 3600000;

    if (!offline && els.plantHero) {
        els.plantHero.classList.toggle('droop-plant', state.neglect.waterLowMs >= warnMs);
        els.plantHero.classList.toggle('shade-plant', state.neglect.sunLowMs >= warnMs);
        els.plantHero.classList.toggle('quiet-plant', state.neglect.loveLowMs >= warnMs);
    }
    
    if (state.neglect.waterLowMs >= scarMs && !state.scars.includes('wilt')) {
        state.scars.push('wilt');
        result.scarsAdded.push('wilt');
        if (!offline) { 
            if (typeof spawnFloatingText === 'function') spawnFloatingText('Thirst left a trace.', null, 'bad'); 
            if (typeof renderPlant === 'function') renderPlant('plantGroup', state.dna, state.stage); 
        }
    }
    if (state.neglect.sunLowMs >= scarMs && !state.scars.includes('pale')) {
        state.scars.push('pale');
        result.scarsAdded.push('pale');
        if (!offline) { 
             if (typeof spawnFloatingText === 'function') spawnFloatingText('Light faded.', null, 'bad'); 
             if (typeof renderPlant === 'function') renderPlant('plantGroup', state.dna, state.stage); 
        }
    }
    
    if (state.neglect.loveLowMs >= scarMs) state.neglect.partialDormant = true;
    if (state.love >= 35 && state.neglect.partialDormant) state.neglect.partialDormant = false;

    const inCrisis = state.water < CONFIG.crisisThreshold && state.sun < CONFIG.crisisThreshold && state.love < CONFIG.crisisThreshold;
    if (inCrisis) state.neglect.crisisMs += eff; 
    else if (state.neglect.crisisMs > 0) state.neglect.crisisMs = Math.max(0, state.neglect.crisisMs - dtMs * rec);
    
    state.timeAtZero = state.neglect.crisisMs;
    return result;
}

function checkCrisisAndDeath(offline = false) {
    const result = { scarsAdded: [], died: false };
    if (state.isDead) return result;
    if (!state.scars) state.scars = [];
    
    if ((state.neglect?.crisisMs || 0) <= 0) return result;

    const cMs = state.neglect.crisisMs;
    const hrs = cMs / 3600000;

    if (hrs >= CONFIG.crisisDormantHours && !state.scars.includes('dormant')) {
        state.scars.push('dormant'); result.scarsAdded.push('dormant');
        if (els.plantHero) els.plantHero.classList.add('dormant-plant');
        if (!offline && typeof spawnFloatingText === 'function') spawnFloatingText('It withdrew into stillness.', null, 'warn');
        if (typeof renderPlant === 'function') renderPlant('plantGroup', state.dna, state.stage);
    }
    if (hrs >= CONFIG.crisisScar1Hours && !state.scars.includes('wilt')) {
        state.scars.push('wilt'); result.scarsAdded.push('wilt');
        if (!offline && typeof spawnFloatingText === 'function') spawnFloatingText('Crisis left a scar.', null, 'bad');
        if (typeof renderPlant === 'function') renderPlant('plantGroup', state.dna, state.stage);
    }
    if (hrs >= CONFIG.crisisScar2Hours && !state.scars.includes('bend')) {
        state.scars.push('bend'); result.scarsAdded.push('bend');
        if (typeof renderPlant === 'function') renderPlant('plantGroup', state.dna, state.stage);
    }
    if (hrs >= CONFIG.crisisDeathHours) {
        triggerDeath(); result.died = true;
    }
    return result;
}

function generateDNA(parent = null) {
    const wild = Math.random() > 0.75;
    const baseH = wild ? Math.random() * 360 : 80 + Math.random() * 80; 

    const lerpHue = (a, b, t) => {
        const d = ((((b - a) % 360) + 540) % 360) - 180;
        return (a + d * t + 360) % 360;
    };
    const clamp = (v, lo, hi) => (v < lo ? lo : (v > hi ? hi : v));
    
    const coreH = parent ? lerpHue(parent.colorH, baseH, 0.30) : baseH;
    const coreS = clamp((parent ? lerp(parent.colorS, 50 + Math.random() * 35, 0.25) : (45 + Math.random() * 35)), 25, 85);
    const coreL = clamp((parent ? lerp(parent.colorL, 30 + Math.random() * 25, 0.25) : (35 + Math.random() * 20)), 18, 70);

    let flowerH0 = Math.random() * 360;
    let safe = false;
    let attempts = 0;
    while (!safe && attempts < 10) {
        if (flowerH0 < 75 || flowerH0 > 165) safe = true;
        else flowerH0 = Math.random() * 360;
        attempts++;
    }
    if (!safe) flowerH0 = 180;

    const flowerH = parent ? lerpHue(parent.flowerH ?? flowerH0, flowerH0, 0.55) : flowerH0;

    let flowerType = 'simple';
    const r = Math.random() * 100;
    if (r < 42) flowerType = 'simple';
    else if (r < 64) flowerType = 'daisy';
    else if (r < 78) flowerType = 'tulip';
    else if (r < 90) flowerType = 'bell';
    else if (r < 98) flowerType = 'rose';
    else flowerType = 'orchid';

    let petalCount0 = 5;
    if (flowerType === 'tulip') petalCount0 = 6;
    else if (flowerType === 'bell' || flowerType === 'orchid') petalCount0 = 5;
    else if (flowerType === 'rose') petalCount0 = 10 + Math.floor(Math.random() * 10);
    else if (flowerType === 'daisy') petalCount0 = 12 + Math.floor(Math.random() * 14);
    else petalCount0 = 4 + Math.floor(Math.random() * 5);

    const petalShape0 = DNA_OPTIONS.petalShapes[Math.floor(Math.random() * DNA_OPTIONS.petalShapes.length)];

    const dna = {
        colorH: coreH,
        colorS: coreS,
        colorL: coreL,
        flowerH: flowerH,
        flowerS: clamp(60 + Math.random() * 30, 35, 95),
        flowerL: clamp(50 + Math.random() * 25, 30, 85),
        stemCurve: parent ? parent.stemCurve * 0.3 + (Math.random() - 0.5) * 50 : (Math.random() - 0.5) * 35,
        stemHeight: clamp((parent ? lerp(parent.stemHeight, 72 + Math.random() * 38, 0.35) : (70 + Math.random() * 35)), 55, 120),
        stemWidth: clamp((parent ? lerp(parent.stemWidth ?? 3.5, 3.0 + Math.random() * 2.6, 0.35) : (3.0 + Math.random() * 2.6)), 2.6, 6.2),
        stemHueOffset: (Math.random() * 14 - 7),
        stemTexture: DNA_OPTIONS.stemTextures[Math.floor(Math.random() * DNA_OPTIONS.stemTextures.length)],
        stemSurface: (Math.random() < 0.25 ? DNA_OPTIONS.stemSurfaces[Math.floor(Math.random() * DNA_OPTIONS.stemSurfaces.length)] : 'none'),
        stemStripeStrength: Math.random() < 0.25 ? (0.15 + Math.random() * 0.25) : 0,
        stemSpeckleStrength: Math.random() < 0.25 ? (0.10 + Math.random() * 0.25) : 0,
        leafCount: Math.floor(3 + Math.random() * 4),
        leafNodes: Math.floor(3 + Math.random() * 4),
        leafSize: 0.75 + Math.random() * 0.55,
        leafScale: 0.85 + Math.random() * 0.35,
        leafAngle: 30 + Math.random() * 40,
        leafShape: DNA_OPTIONS.leafShapes[Math.floor(Math.random() * DNA_OPTIONS.leafShapes.length)],
        leafEdge: DNA_OPTIONS.leafEdges[Math.floor(Math.random() * DNA_OPTIONS.leafEdges.length)],
        leafTexture: DNA_OPTIONS.leafTextures[Math.floor(Math.random() * DNA_OPTIONS.leafTextures.length)],
        leafHueOffset: (Math.random() * 18 - 9),
        leafSatOffset: (Math.random() * 14 - 7),
        leafLightOffset: (Math.random() * 14 - 7),
        leafVeinStrength: 0.15 + Math.random() * 0.25,
        leafVariegation: Math.random() < 0.22 ? (0.12 + Math.random() * 0.22) : 0,
        leafSpeckleStrength: Math.random() < 0.20 ? (0.10 + Math.random() * 0.25) : 0,
        leanDirection: Math.random() > 0.5 ? 1 : -1,
        branchSpread: 18 + Math.random() * 18,
        flowerType: flowerType,
        flowerCount: Math.floor(1 + Math.random() * 3),
        petalCount: petalCount0,
        petalShape: petalShape0,
        flowerCenterHueOffset: (Math.random() * 60 - 30),
        flowerCenterLight: 50 + Math.random() * 20,
        resilience: parent?.resilience || (0.8 + Math.random() * 0.4),
        bloomSpeed: parent?.bloomSpeed || (0.9 + Math.random() * 0.2),
        fireflyChance: parent?.fireflyChance || 0.05
    };

    dna.seed = parent && parent.seed ? (parent.seed + Math.floor(Math.random() * 99991)) : Math.floor(Math.random() * 1e9);

    if (Math.random() < 0.55) {
        const n = 2 + Math.floor(Math.random() * 3);
        const set = new Set([dna.leafShape]);
        while (set.size < n) set.add(DNA_OPTIONS.leafShapes[Math.floor(Math.random() * DNA_OPTIONS.leafShapes.length)]);
        dna.leafShapes = [...set];
    } else {
        dna.leafShapes = [dna.leafShape];
    }

    dna.leafSizeVar = 0.22 + Math.random() * 0.26;

    if (state.inheritedTraits) {
        state.inheritedTraits.forEach(tid => {
            if (tid === 'resilience') dna.resilience = Math.min(2, (dna.resilience || 1) + 0.2);
            if (tid === 'bloomSpeed') dna.bloomSpeed = Math.min(1.5, (dna.bloomSpeed || 1) + 0.1);
            if (tid === 'leafiness') dna.leafNodes = Math.min(7, (dna.leafNodes || 4) + 1);
            if (tid === 'colorVibrancy') dna.colorS = Math.min(85, (dna.colorS || 50) + 10);
            if (tid === 'flowerPower') dna.flowerCount = Math.min(4, (dna.flowerCount || 1) + 1);
            if (tid === 'fireflyAffinity') dna.fireflyChance = Math.min(0.15, (dna.fireflyChance || 0.05) + 0.03);
        });
    }

    dna.flowerColor = `hsl(${dna.flowerH},${dna.flowerS}%,${dna.flowerL}%)`;
    const ch = (dna.flowerH + dna.flowerCenterHueOffset + 360) % 360;
    dna.flowerCenterColor = `hsl(${ch},${Math.max(35, dna.flowerS - 25)}%,${dna.flowerCenterLight}%)`;

    return dna;
}

const DNA_OPTIONS = {
    leafShapes: ['round', 'oval', 'lanceolate', 'pointed', 'teardrop', 'heart', 'spade', 'oak', 'lobed', 'maple', 'fern', 'needle', 'eucalyptus', 'banana'],
    leafEdges: ['smooth', 'serrated', 'lobed'],
    leafTextures: ['plain', 'veined', 'speckled', 'variegated'],
    stemTextures: ['smooth', 'ridged', 'speckled', 'striped'],
    stemSurfaces: ['nodes', 'thorns', 'hairs'],
    petalShapes: ['round', 'pointed', 'wavy']
};

function triggerDeath() {
    state.isDead = true;
    if (els.plantHero) els.plantHero.classList.add('dead-plant');
    if (els.deathOverlay) els.deathOverlay.classList.add('open');
    if (typeof audio !== 'undefined') {
        audio.stopRainSound();
        audio.stopBackgroundMusic();
    }
    saveState();
}

function processBuffs() {
    if (!state.buffs || state.buffs.length === 0) return;
    
    let dirty = false;
    for (let i = 0; i < state.buffs.length; i++) {
        const b = state.buffs[i];
        b.remaining--;
        
        if (b.type === 'water') state.water = Math.min(100, state.water + b.strength);
        else if (b.type === 'sun') state.sun = Math.min(100, state.sun + b.strength);
        else if (b.type === 'love') state.love = Math.min(100, state.love + b.strength);
        else if (b.type === 'growth') state.growth += b.strength;
        else if (b.type === 'health') {
            state.water = Math.min(100, state.water + b.strength * 0.3);
            state.sun = Math.min(100, state.sun + b.strength * 0.3);
            state.love = Math.min(100, state.love + b.strength * 0.3);
        }
        
        if (b.remaining <= 0) dirty = true;
    }
    
    if (dirty) {
        state.buffs = state.buffs.filter(b => b.remaining > 0);
    }
}

function processGuardians() {
    if (!state.activeGuardians || state.activeGuardians.length === 0) return;
    
    state.activeGuardians.forEach(i => {
        const f = FIREFLY_FAMILIES[i];
        if (!f) return;
        
        if (f.effect === 'water') state.water = Math.min(100, state.water + 0.02);
        else if (f.effect === 'sun') state.sun = Math.min(100, state.sun + 0.02);
        else if (f.effect === 'love') state.love = Math.min(100, state.love + 0.02);
        else if (f.effect === 'growth') state.growth += 0.1;
        else if (f.effect === 'health') {
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

function isDaytime() { 
    const h = new Date().getHours();
    return (h >= 5 && h < 20);
}

function startGameLoop() { 
    if (window.gameInterval) clearInterval(window.gameInterval);
    window.gameInterval = setInterval(gameTick, CONFIG.tickRate); 
}

let _lastRenderTime = 0;
let _lastTimeOfDayCheck = 0;
const RENDER_THROTTLE_MS = 1000;
const TIME_CHECK_THROTTLE_MS = 30000;

function gameTick() {
    if (document.visibilityState !== 'visible') return;

    if (state.isDead) return;
    
    const now = Date.now();
    lastTickTime = now;
    
    simulateStep(CONFIG.tickRate / 1000, 'online');
    processBuffs();
    processGuardians();
    if (typeof attemptSpawnFirefly === 'function') attemptSpawnFirefly();
    
    if (!saveDebounceTimer) {
        saveDebounceTimer = setTimeout(() => { 
            if (typeof saveState === 'function') saveState(); 
            saveDebounceTimer = null; 
        }, 5000);
    }
    
    if (now - _lastRenderTime > RENDER_THROTTLE_MS) {
        if (typeof render === 'function') render();
        _lastRenderTime = now;
    }
    
    if (now - _lastTimeOfDayCheck > TIME_CHECK_THROTTLE_MS) {
        if (typeof updateTimeOfDay === 'function') updateTimeOfDay();
        _lastTimeOfDayCheck = now;
    }
}
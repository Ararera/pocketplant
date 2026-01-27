window.gardenState = window.gardenState || {};
Object.assign(window.gardenState, {
    isOpen: false,
    fireflies: [],
    fireflySpawnTimer: null,
    ambientInterval: null,
    windInterval: null,
    soundscapeActive: false,
    audioContext: null,
    gainNode: null,
    ambienceGain: null,
    musicalGain: null,
    plantGain: null,
    ambientTimers: {},
    plantDrones: [],
    audioBuffers: {},
    currentMood: 'contemplative',
    moodTransitionTimer: null,
    plantBreathTimer: null,
    entryTime: null,
    maxFireflies: 15,
    moonFlightActive: false,
    moonStreakKey: null,
    moonStreakCount: 0,
    moonTintTimer: null,
    moonHitTimer: null,
    moonHitFadeTimer: null,
    _moonBaseBoxShadow: null,
    _moonBaseBackground: null,
    visualLoopId: null,

    // --- Generative music engine (duration-based, seed-orchestrated) ---
    music: {
        isRunning: false,
        tempo: 54,
        swing: 0.08,
        meter: 4,
        stepsPerBar: 16,     // 16th-note grid
        barsPerCycle: 32,    // long-form loop
        keyMidi: 57,         // A3 (warm, not bright)
        mode: 'minor',       // 'minor' | 'major' | 'dorian'
        cycleStartTime: 0,
        currentStep: 0,
        nextStepTime: 0,
        lookaheadMs: 25,
        scheduleAheadSec: 0.18,
        timerId: null,
        // seed orchestration: each seed unlocks a "voice" layer
        seeds: {
            0: false,  // Ember (bass)
            1: false,  // Glade (pad)
            2: false,  // Nectar (arp)
            3: false,  // Aster (melody)
            4: false,  // Dew (counter-melody)
            5: false,  // Lumen (sparkle)
            6: false,  // Bloom (pulse)
            7: false,  // Breeze (drone + wind lift)
            8: false,  // Rhythm 1: soft kit (kick/snare/hat)
            9: false,  // Rhythm 2: hand perc (claves/shaker)
            10: false, // Rhythm 3: brush hats (lighter, busier)
            11: false  // Rhythm 4: low thumps (sparse, grounding)
        },
        // gentle progression (relative to key, in scale degrees)
        progression: [0, 5, 3, 6, 0, 5, 4, 6], // i VI iv VII | i VI v VII (minor-ish color)
        chordQuality: ['min7','maj7','min7','dom7','min7','maj7','min7','dom7'],
        voiceMemory: {
            bassMidi: null,
            melodyMidi: null,
            counterMidi: null,
            sparkleMidi: null
        },
        energy: 0,          // 0..1 grows with duration/interaction
        lastInteractAt: 0
    }
});

const GARDEN_CHORDS = Object.freeze({
    0: [261.63, 329.63, 392.00],
    1: [293.66, 369.99, 440.00],
    2: [329.63, 415.30, 493.88],
    3: [349.23, 440.00, 523.25],
    4: [392.00, 493.88, 587.33],
    5: [440.00, 554.37, 659.25],
    6: [493.88, 622.25, 739.99],
    7: [277.18, 349.23, 415.30]
});

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

function getNoiseBuffer(ctx, duration) {
    const key = Math.ceil(duration);
    if (!gardenState.audioBuffers) gardenState.audioBuffers = {};
    if (gardenState.audioBuffers[key]) return gardenState.audioBuffers[key];
    
    const bufferSize = ctx.sampleRate * key;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) output[i] = Math.random() * 2 - 1;
    
    gardenState.audioBuffers[key] = buffer;
    return buffer;
}

function initMidnightGarden() {
    createGardenStars();
    gardenState.elements = {
        overlay: document.getElementById('midnightGardenOverlay'),
        transition: document.getElementById('midnightTransition'),
        plantsScroll: document.getElementById('gardenPlantsScroll'),
        firefliesContainer: document.getElementById('gardenFireflies'),
        subtitle: document.getElementById('gardenSubtitle'),
        moon: document.getElementById('gardenMoon'),
        soundscapeIndicator: document.getElementById('soundscapeIndicator')
    };
    if (typeof initSoundSeedsUI === 'function') initSoundSeedsUI();
}

function createGardenStars() {
    const container = document.getElementById('gardenStars');
    if (!container) return;
    
    container.innerHTML = '';
    const starCount = 60;
    const fragment = document.createDocumentFragment();
    
    for (let i = 0; i < starCount; i++) {
        const star = document.createElement('div');
        star.className = 'garden-star';
        star.style.cssText = `
            left: ${Math.random() * 100}%;
            top: ${Math.random() * 55}%;
            --dur: ${3 + Math.random() * 4}s;
            --delay: ${Math.random() * 5}s;
            --brightness: ${0.5 + Math.random() * 0.5};
        `;
        fragment.appendChild(star);
    }
    container.appendChild(fragment);
}

function enterMidnightGarden() {
    if (gardenState.isOpen) return;
    gardenState.isOpen = true;
    gardenState.entryTime = Date.now();
    
    const transition = gardenState.elements?.transition || document.getElementById('midnightTransition');
    const overlay = gardenState.elements?.overlay || document.getElementById('midnightGardenOverlay');
    
    document.body.classList.add('midnight-garden-active');
    
    if (typeof audio !== 'undefined') {
        if (audio.stopRainSound) audio.stopRainSound();
        if (audio.stopBackgroundMusic) audio.stopBackgroundMusic();
    }
    
    transition.classList.add('active');
    
    setTimeout(() => {
        syncMoonPhase();
        renderGardenPlants();
        
        startGardenFireflies();
        overlay.classList.add('open');
        
        setTimeout(() => { transition.classList.remove('active'); }, 300);
        setTimeout(() => { startAmbientSoundscape(); }, 1000);
    }, 800);
    
    if (typeof pushHistoryState === 'function') pushHistoryState();
}

function exitMidnightGarden() {
    if (!gardenState.isOpen) return;
    
    const transition = gardenState.elements?.transition || document.getElementById('midnightTransition');
    const overlay = gardenState.elements?.overlay || document.getElementById('midnightGardenOverlay');
    
    stopAmbientSoundscape();
    stopGardenFireflies();
    
    transition.classList.add('active');
    
    setTimeout(() => {
        overlay.classList.remove('open');
        document.body.classList.remove('midnight-garden-active');
        
        if (gardenState.elements && gardenState.elements.firefliesContainer) {
            gardenState.elements.firefliesContainer.innerHTML = '';
        }

        setTimeout(() => {
            transition.classList.remove('active');
            gardenState.isOpen = false;
            
            if (typeof updateUI === 'function') updateUI();
            
            if (typeof state !== 'undefined' && state.isRainOn && typeof audio !== 'undefined' && audio.startRainSound) audio.startRainSound();
            if (typeof state !== 'undefined' && state.isMusicPlaying && typeof audio !== 'undefined' && audio.playBackgroundMusic) audio.playBackgroundMusic();
        }, 300);
    }, 800);
}

function syncMoonPhase() {
    const gardenMoon = gardenState.elements?.moon || document.getElementById('gardenMoon');
    const mainMoon = document.getElementById('moonElement');
    
    if (gardenMoon && mainMoon) {
        const phase = getComputedStyle(mainMoon).getPropertyValue('--moon-phase');
        gardenMoon.style.setProperty('--moon-phase', phase);
    } else if (gardenMoon && typeof getMoonPhase === 'function') {
        const phase = getMoonPhase();
        gardenMoon.style.setProperty('--moon-phase', phase.phase + '%');
    }
}

function renderGardenPlants() {
    const container = gardenState.elements?.plantsScroll || document.getElementById('gardenPlantsScroll');
    const subtitle = gardenState.elements?.subtitle || document.getElementById('gardenSubtitle');
    if (!container) return;
    
    container.innerHTML = '';
    const history = (typeof state !== 'undefined' && state.history) ? state.history : [];
    
    if (history.length === 0) {
        const emptyDiv = document.createElement('div');
        emptyDiv.className = 'garden-empty';
        emptyDiv.innerHTML = `<div class="garden-empty-icon">験</div><div class="garden-empty-text">No ancestors yet.<br>Ascend your first plant to<br>see it resting here.</div>`;
        container.appendChild(emptyDiv);
        if (subtitle) subtitle.style.display = 'none';
        return;
    }
    
    if (subtitle) {
        subtitle.style.display = '';
        subtitle.textContent = `${history.length} ancestor${history.length !== 1 ? 's' : ''} resting`;
    }
    
    const fragment = document.createDocumentFragment();
    history.forEach((plantData, index) => {
        fragment.appendChild(createGardenPlant(plantData, index));
    });
    container.appendChild(fragment);
}

function createGardenPlant(plantData, index) {
    const wrapper = document.createElement('div');
    wrapper.className = 'garden-plant';
    wrapper.style.setProperty('--appear-delay', `${index * 0.15}s`);
    
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 200 250');
    svg.setAttribute('class', 'garden-plant-svg');
    
    const potGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    const potBody = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    potBody.setAttribute('d', 'M72 197 L128 197 L118 232 L82 232 Z');
    potBody.setAttribute('fill', plantData.potColor || '#e07a5f');
    potGroup.appendChild(potBody);
    
    const potRim = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    potRim.setAttribute('d', 'M68 189 L132 189 L128 199 L72 199 Z');
    potRim.setAttribute('fill', plantData.potColor || '#e07a5f');
    potRim.style.filter = 'brightness(1.1)';
    potGroup.appendChild(potRim);
    
    const dirt = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
    dirt.setAttribute('cx', '100'); dirt.setAttribute('cy', '191'); dirt.setAttribute('rx', '24'); dirt.setAttribute('ry', '7'); dirt.setAttribute('fill', '#5d4037');
    potGroup.appendChild(dirt);
    
    const plantGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    svg.appendChild(plantGroup);
    svg.appendChild(potGroup);

    if (typeof renderPlant === 'function' && plantData.dna) {
        const tempId = `tempGardenPlant_${index}_${Date.now()}`;
        plantGroup.setAttribute('id', tempId);
        document.body.appendChild(svg);
        renderPlant(tempId, plantData.dna, plantData.stage || 5, plantData.scars || []);
        document.body.removeChild(svg);
    }
    
    wrapper.appendChild(svg);
    
    const nameEl = document.createElement('div');
    nameEl.className = 'garden-plant-name';
    nameEl.textContent = plantData.name || 'Unknown';
    wrapper.appendChild(nameEl);
    
    const genEl = document.createElement('div');
    genEl.className = 'garden-plant-gen';
    genEl.textContent = `Cycle ${plantData.gen || 1}`;
    wrapper.appendChild(genEl);
    
    wrapper.addEventListener('click', () => showGardenPlantDetail(plantData, index));
    return wrapper;
}

function showGardenPlantDetail(plantData, index) {
    const plantEl = document.querySelectorAll('.garden-plant')[index];
    if (plantEl) {
        plantEl.style.transition = 'transform 0.3s ease';
        plantEl.style.transform = 'scale(1.08) translateY(-8px)';
        setTimeout(() => { plantEl.style.transform = ''; }, 300);
    }
    playPlantSound(plantData);
}

function startGardenFireflies() {
    const container = gardenState.elements?.firefliesContainer || document.getElementById('gardenFireflies');
    if (!container) return;
    
    container.innerHTML = '';
    gardenState.fireflies = [];
    
    const fireflyInventory = (typeof state !== 'undefined' && state.fireflies) ? state.fireflies : {};
    let totalOwned = 0; const ownedFamilies = [];
    
    for (let i = 0; i < 8; i++) {
        const count = fireflyInventory[i] || 0;
        if (count > 0) { totalOwned += count; ownedFamilies.push(i); }
    }
    if (totalOwned === 0 || ownedFamilies.length === 0) return;
    
    const maxVisible = Math.min(gardenState.maxFireflies, Math.ceil(totalOwned / 2));
    const initialCount = Math.min(maxVisible, Math.max(3, Math.floor(maxVisible * 0.6)));
    
    for (let i = 0; i < initialCount; i++) {
        const famIndex = weightedFamilySelection(fireflyInventory, ownedFamilies);
        spawnGardenFirefly(famIndex, container);
    }
    
    gardenState.fireflySpawnTimer = setInterval(() => {
        if (!gardenState.isOpen) return;
        gardenState.fireflies = gardenState.fireflies.filter(ff => ff.element && ff.element.parentNode);
        if (gardenState.fireflies.length < maxVisible && ownedFamilies.length > 0) {
            const famIndex = weightedFamilySelection(fireflyInventory, ownedFamilies);
            spawnGardenFirefly(famIndex, container);
        }
    }, 4000 + Math.random() * 3000);

    startVisualLoop();
}

function weightedFamilySelection(inventory, ownedFamilies) {
    let totalWeight = 0;
    for (const fam of ownedFamilies) totalWeight += inventory[fam] || 0;
    let random = Math.random() * totalWeight;
    for (const fam of ownedFamilies) {
        random -= inventory[fam] || 0;
        if (random <= 0) return fam;
    }
    return ownedFamilies[0];
}

function spawnGardenFirefly(familyIndex, container) {
    const ff = document.createElement('div');
    ff.className = 'garden-firefly';
    
    const color = typeof getFireflyColor === 'function' ? getFireflyColor(familyIndex) : '#ffff00';
    
    const startX = 10 + Math.random() * 80;
    const startY = 15 + Math.random() * 55;
    
    ff.style.setProperty('--ff-color', color);
    ff.style.setProperty('--glow-dur', `${2 + Math.random() * 2}s`);
    ff.style.transform = `translate3d(${startX}vw, ${startY}vh, 0)`;
    
    ff.dataset.family = familyIndex;
    container.appendChild(ff);
    
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            ff.classList.add('visible');
        });
    });
    
    const fireflyData = {
        element: ff,
        family: familyIndex,
        color: color,
        x: startX,
        y: startY,
        targetX: startX,
        targetY: startY,
        velX: 0,
        velY: 0,
        timeToNewTarget: 0,
        spawnTime: Date.now(),
        lifeTime: (25 + Math.random() * 20) * 1000,
        phase: Math.random() * 10
    };
    
    const handleTap = (e) => {
        e.preventDefault(); e.stopPropagation();
        if (!gardenState.isOpen) return;
        if (gardenState.moonFlightActive) return;

        playFireflyChord(familyIndex);
        if (typeof unlockDiscovery === 'function') unlockDiscovery('garden_chord');
        if (typeof markGardenActivity === 'function') markGardenActivity();

        ff.removeEventListener('click', handleTap);
        ff.removeEventListener('touchend', handleTap);

        flyFireflyToMoon(fireflyData);
    };

    ff.addEventListener('click', handleTap);
    ff.addEventListener('touchend', handleTap, { passive: false });
    
    gardenState.fireflies.push(fireflyData);
}

function startVisualLoop() {
    if (gardenState.visualLoopId) cancelAnimationFrame(gardenState.visualLoopId);
    let lastTime = performance.now();
    
    const loop = (currentTime) => {
        if (!gardenState.isOpen) {
            gardenState.visualLoopId = null;
            return;
        }
        
        const dt = (currentTime - lastTime) / 1000;
        lastTime = currentTime;
        
        const safeDt = Math.min(dt, 0.1);
        
        updateFireflies(safeDt, currentTime);
        gardenState.visualLoopId = requestAnimationFrame(loop);
    };
    gardenState.visualLoopId = requestAnimationFrame(loop);
}

function updateFireflies(dt, now) {
    const active = [];
    const currentTime = Date.now();
    
    for (let i = 0; i < gardenState.fireflies.length; i++) {
        const f = gardenState.fireflies[i];
        const age = currentTime - f.spawnTime;
        
        if (age > f.lifeTime - 1200 && !f.fadingOut) {
            f.fadingOut = true;
            if (f.element) {
                f.element.classList.remove('visible');
                f.element.classList.add('fadeout');
            }
        }
        
        if (age > f.lifeTime) {
            if (f.element && f.element.parentNode) {
                f.element.parentNode.removeChild(f.element);
            }
            continue;
        }
        
        f.timeToNewTarget -= dt;
        
        if (f.timeToNewTarget <= 0) {
            const wanderRadius = 15 + Math.random() * 20;
            const angle = Math.random() * Math.PI * 2;
            f.targetX = Math.max(5, Math.min(95, f.x + Math.cos(angle) * wanderRadius));
            f.targetY = Math.max(10, Math.min(70, f.y + Math.sin(angle) * wanderRadius * 0.6));
            
            f.timeToNewTarget = 2 + Math.random() * 6;
            
            if (Math.random() < 0.15) {
                f.targetX = 10 + Math.random() * 80;
                f.targetY = 15 + Math.random() * 50;
                f.timeToNewTarget = 4 + Math.random() * 4;
            }
        }
        
        const dx = f.targetX - f.x;
        const dy = f.targetY - f.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        const time = now * 0.001;
        const flutter1 = Math.sin(time * 3.5 + f.phase * 2) * 0.08;
        const flutter2 = Math.cos(time * 5.2 + f.phase * 3) * 0.05;
        const flutter3 = Math.sin(time * 1.8 + f.phase) * 0.03;
        const wobbleX = flutter1 + flutter2 * 0.7;
        const wobbleY = flutter2 + flutter3 * 0.8 + Math.sin(time * 2.1 + f.phase * 1.5) * 0.04;
        
        const attraction = dist > 10 ? 0.012 : 0.006;
        
        f.velX += dx * attraction * dt + wobbleX * dt * 60;
        f.velY += dy * attraction * dt + wobbleY * dt * 60;
        
        f.velX *= 0.96;
        f.velY *= 0.97;
        
        const maxSpeed = 0.4;
        const speed = Math.sqrt(f.velX * f.velX + f.velY * f.velY);
        if (speed > maxSpeed) {
            const scale = maxSpeed / speed;
            f.velX *= scale;
            f.velY *= scale;
        }
        
        f.x += f.velX;
        f.y += f.velY;
        
        if (f.x < 3) { f.x = 3; f.velX = Math.abs(f.velX) * 0.5; }
        if (f.x > 97) { f.x = 97; f.velX = -Math.abs(f.velX) * 0.5; }
        if (f.y < 8) { f.y = 8; f.velY = Math.abs(f.velY) * 0.5; }
        if (f.y > 72) { f.y = 72; f.velY = -Math.abs(f.velY) * 0.5; }
        
        if (f.element) {
            f.element.style.transform = `translate3d(${f.x}vw, ${f.y}vh, 0)`;
        }
        
        active.push(f);
    }
    gardenState.fireflies = active;
}

function stopGardenFireflies() {
    if (gardenState.fireflySpawnTimer) {
        clearInterval(gardenState.fireflySpawnTimer);
        gardenState.fireflySpawnTimer = null;
    }
    if (gardenState.visualLoopId) {
        cancelAnimationFrame(gardenState.visualLoopId);
        gardenState.visualLoopId = null;
    }
    gardenState.fireflies = [];
}

function initGardenAudio() {
    if (gardenState.audioContext) return;
    try {
        gardenState.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        gardenState.gainNode = gardenState.audioContext.createGain();
        gardenState.gainNode.gain.value = 0.2;
        gardenState.gainNode.connect(gardenState.audioContext.destination);

        gardenState.ambienceGain = gardenState.audioContext.createGain();
        gardenState.ambienceGain.gain.value = 0.4;
        gardenState.ambienceGain.connect(gardenState.gainNode);

        gardenState.musicalGain = gardenState.audioContext.createGain();
        gardenState.musicalGain.gain.value = 0.7;
        gardenState.musicalGain.connect(gardenState.gainNode);

        // Percussion sits beside music (not ambience), so rhythms can be present without getting "washy".
        gardenState.percussionGain = gardenState.audioContext.createGain();
        gardenState.percussionGain.gain.value = 0.55;
        gardenState.percussionGain.connect(gardenState.gainNode);

        gardenState.plantGain = gardenState.audioContext.createGain();
        gardenState.plantGain.gain.value = 0.3;
        gardenState.plantGain.connect(gardenState.gainNode);
    } catch (e) { console.warn('Audio error', e); }
}


// ------------------------------
// Generative music engine
// ------------------------------
function _midiToFreq(m) { return 440 * Math.pow(2, (m - 69) / 12); }

function _clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

function _nowCtx() { return gardenState.audioContext ? gardenState.audioContext.currentTime : 0; }

function _getStepDurationSec() {
    const m = gardenState.music;
    const beatSec = 60 / Math.max(20, m.tempo);
    return beatSec / 4; // 16th note
}

function _getBarDurationSec() {
    const m = gardenState.music;
    const beatSec = 60 / Math.max(20, m.tempo);
    return beatSec * m.meter;
}

function _getCycleDurationSec() {
    const m = gardenState.music;
    return _getBarDurationSec() * m.barsPerCycle;
}

function _getBarIndexAtTime(t) {
    const m = gardenState.music;
    const dt = Math.max(0, t - m.cycleStartTime);
    const barSec = _getBarDurationSec();
    return Math.floor(dt / barSec) % m.barsPerCycle;
}

function _getStepIndexAtTime(t) {
    const m = gardenState.music;
    const dt = Math.max(0, t - m.cycleStartTime);
    const stepSec = _getStepDurationSec();
    return Math.floor(dt / stepSec) % (m.barsPerCycle * m.stepsPerBar);
}

function _modeSemitones(mode) {
    // scale degrees 1..7 in semitone offsets from tonic
    if (mode === 'major')  return [0,2,4,5,7,9,11];
    if (mode === 'dorian') return [0,2,3,5,7,9,10];
    return [0,2,3,5,7,8,10]; // natural minor
}

function _buildChordMidi(tonicMidi, degree, quality) {
    // degree: 0..6 (0 = i / I)
    const scale = _modeSemitones(gardenState.music.mode);
    const root = tonicMidi + scale[degree % 7];
    // basic 7th chords
    const intervalsByQuality = {
        'min7': [0, 3, 7, 10],
        'maj7': [0, 4, 7, 11],
        'dom7': [0, 4, 7, 10],
        'min9': [0, 3, 7, 10, 14],
        'sus2': [0, 2, 7, 10],
        'sus4': [0, 5, 7, 10]
    };
    const iv = intervalsByQuality[quality] || intervalsByQuality['min7'];
    return iv.map(semi => root + semi);
}

function _getHarmonyAtTime(t) {
    const m = gardenState.music;
    const bar = _getBarIndexAtTime(t);
    const progIndex = bar % m.progression.length;
    const degree = m.progression[progIndex] % 7;
    const quality = m.chordQuality[progIndex] || 'min7';
    const chord = _buildChordMidi(m.keyMidi, degree, quality);
    return { bar, progIndex, degree, quality, chord, tonic: m.keyMidi };
}

function _pickNearest(targetMidi, candidates) {
    if (candidates.length === 0) return targetMidi;
    let best = candidates[0], bestD = Infinity;
    for (const c of candidates) {
        const d = Math.abs(c - targetMidi);
        if (d < bestD) { bestD = d; best = c; }
    }
    return best;
}

function _constrainRange(midi, lo, hi) {
    while (midi < lo) midi += 12;
    while (midi > hi) midi -= 12;
    return midi;
}

function _quantizeToChordOrScale(prevMidi, harmony, preferChord = true, rangeLo = 48, rangeHi = 84) {
    const scale = _modeSemitones(gardenState.music.mode);
    const tonic = harmony.tonic;
    const chord = harmony.chord.slice();
    // Build scale over a couple octaves
    const scaleCandidates = [];
    for (let oct = -3; oct <= 4; oct++) {
        for (const s of scale) scaleCandidates.push(tonic + s + oct * 12);
    }
    const chordCandidates = [];
    for (let oct = -3; oct <= 4; oct++) {
        for (const c of chord) chordCandidates.push(c + oct * 12);
    }

    const baseTarget = prevMidi ?? (tonic + 12);
    const pool = (preferChord ? chordCandidates : scaleCandidates);
    let picked = _pickNearest(baseTarget, pool);
    picked = _constrainRange(picked, rangeLo, rangeHi);

    // If it's too static, nudge by a chord tone up/down
    if (prevMidi != null && Math.abs(picked - prevMidi) <= 1 && pool.length > 3) {
        const alt = pool[Math.floor(Math.random() * pool.length)];
        const alt2 = _constrainRange(alt, rangeLo, rangeHi);
        if (Math.abs(alt2 - prevMidi) <= 7) picked = alt2;
    }
    return picked;
}

function _envGain(gain, t0, attack, hold, release, peak) {
    const g = gain.gain;
    g.cancelScheduledValues(t0);
    g.setValueAtTime(0.0001, t0);
    g.linearRampToValueAtTime(peak, t0 + attack);
    g.setValueAtTime(peak, t0 + attack + hold);
    g.exponentialRampToValueAtTime(0.0001, t0 + attack + hold + release);
}

function _makeVoiceNodeChain({ type='sine', freq=220, detune=0, filter='lowpass', filterFreq=1200, q=0.7, outGain=null }) {
    const ctx = gardenState.audioContext;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    osc.detune.setValueAtTime(detune, ctx.currentTime);

    const filt = ctx.createBiquadFilter();
    filt.type = filter;
    filt.frequency.setValueAtTime(filterFreq, ctx.currentTime);
    filt.Q.setValueAtTime(q, ctx.currentTime);

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, ctx.currentTime);

    osc.connect(filt);
    filt.connect(g);
    (g).connect(outGain || gardenState.musicalGain || gardenState.gainNode);
    return { osc, filt, gain: g };
}

function _scheduleNote({ time, midi, seconds=0.25, peak=0.08, type='sine', filterFreq=1800, filterType='lowpass', detune=0, q=0.7, out=null }) {
    const ctx = gardenState.audioContext; if (!ctx) return;
    const freq = _midiToFreq(midi);
    const chain = _makeVoiceNodeChain({ type, freq, detune, filter: filterType, filterFreq, q, outGain: out || gardenState.musicalGain });
    const a = Math.min(0.06, seconds * 0.25);
    const r = Math.max(0.08, seconds * 0.55);
    const h = Math.max(0.02, seconds - a - r);
    _envGain(chain.gain, time, a, h, r, peak);
    chain.osc.start(time);
    chain.osc.stop(time + seconds + 0.05);
}

function _schedulePad({ time, chordMidis, seconds=2.4, peak=0.045 }) {
    const ctx = gardenState.audioContext; if (!ctx) return;
    chordMidis.slice(0, 4).forEach((midi, i) => {
        const det = (Math.random() - 0.5) * 6;
        _scheduleNote({
            time: time + i * 0.015,
            midi: _constrainRange(midi, 52, 76),
            seconds,
            peak: peak * (1 - i * 0.12),
            type: 'triangle',
            filterFreq: 900 + Math.random() * 600,
            detune: det,
            q: 0.8,
            out: gardenState.musicalGain
        });
    });
}

function _schedulePulse({ time, seconds=0.06, peak=0.035 }) {
    const ctx = gardenState.audioContext; if (!ctx) return;
    const buffer = getNoiseBuffer(ctx, 1.5);
    const src = ctx.createBufferSource();
    src.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1200 + Math.random()*900, time);
    filter.Q.setValueAtTime(2.2, time);

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, time);
    g.gain.linearRampToValueAtTime(peak, time + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, time + seconds);

    src.connect(filter); filter.connect(g); g.connect(gardenState.musicalGain);
    src.start(time);
    src.stop(time + seconds + 0.02);
}

// --- Rhythm seeds (beat layers) ---
// Seed 8: soft kit (kick/snare/hat) anchored to the 16th grid.
// Seed 9: hand percussion (claves/shaker) using Euclidean-ish patterns + gentle variation.

function _euclidHits(steps, pulses, rotate = 0) {
    // Simple evenly-spaced hit pattern (not full Bjorklund, but musical enough).
    const out = new Array(steps).fill(false);
    if (pulses <= 0) return out;
    const step = steps / pulses;
    for (let i = 0; i < pulses; i++) {
        const idx = (Math.round(i * step) + rotate) % steps;
        out[idx] = true;
    }
    return out;
}

function _scheduleKick(time, peak = 0.22) {
    const ctx = gardenState.audioContext; if (!ctx) return;
    const osc = ctx.createOscillator();
    osc.type = 'sine';

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, time);

    // classic pitch drop
    osc.frequency.setValueAtTime(120, time);
    osc.frequency.exponentialRampToValueAtTime(42, time + 0.09);

    g.gain.linearRampToValueAtTime(peak, time + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, time + 0.18);

    // soft saturation-ish "thump" via lowpass filter
    const filt = ctx.createBiquadFilter();
    filt.type = 'lowpass';
    filt.frequency.setValueAtTime(320, time);
    filt.Q.setValueAtTime(0.7, time);

    osc.connect(filt); filt.connect(g); g.connect(gardenState.percussionGain || gardenState.musicalGain);
    osc.start(time);
    osc.stop(time + 0.22);
}

function _scheduleSnare(time, peak = 0.10) {
    const ctx = gardenState.audioContext; if (!ctx) return;
    const buffer = getNoiseBuffer(ctx, 1.5);
    const src = ctx.createBufferSource();
    src.buffer = buffer;

    const band = ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.setValueAtTime(1800, time);
    band.Q.setValueAtTime(0.9, time);

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, time);
    g.gain.linearRampToValueAtTime(peak, time + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, time + 0.14);

    // tiny body tone
    const body = ctx.createOscillator();
    body.type = 'triangle';
    body.frequency.setValueAtTime(210, time);
    const bg = ctx.createGain();
    bg.gain.setValueAtTime(0.0001, time);
    bg.gain.linearRampToValueAtTime(peak * 0.25, time + 0.006);
    bg.gain.exponentialRampToValueAtTime(0.0001, time + 0.12);

    src.connect(band); band.connect(g); g.connect(gardenState.percussionGain || gardenState.musicalGain);
    body.connect(bg); bg.connect(gardenState.percussionGain || gardenState.musicalGain);

    src.start(time); src.stop(time + 0.16);
    body.start(time); body.stop(time + 0.14);
}

function _scheduleHat(time, peak = 0.055, open = false) {
    const ctx = gardenState.audioContext; if (!ctx) return;
    const buffer = getNoiseBuffer(ctx, 1.0);
    const src = ctx.createBufferSource();
    src.buffer = buffer;

    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.setValueAtTime(6000 + Math.random()*1500, time);
    hp.Q.setValueAtTime(0.7, time);

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, time);
    g.gain.linearRampToValueAtTime(peak, time + 0.002);
    const dur = open ? (0.12 + Math.random()*0.08) : (0.04 + Math.random()*0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, time + dur);

    src.connect(hp); hp.connect(g); g.connect(gardenState.percussionGain || gardenState.musicalGain);
    src.start(time);
    src.stop(time + dur + 0.02);
}

function _scheduleClaves(time, peak = 0.06) {
    const ctx = gardenState.audioContext; if (!ctx) return;
    const osc = ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(1800 + Math.random()*400, time);

    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(2400, time);
    bp.Q.setValueAtTime(6.0, time);

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, time);
    g.gain.linearRampToValueAtTime(peak, time + 0.0015);
    g.gain.exponentialRampToValueAtTime(0.0001, time + 0.06);

    osc.connect(bp); bp.connect(g); g.connect(gardenState.percussionGain || gardenState.musicalGain);
    osc.start(time);
    osc.stop(time + 0.07);
}

function _scheduleShaker(time, peak = 0.045) {
    const ctx = gardenState.audioContext; if (!ctx) return;
    const buffer = getNoiseBuffer(ctx, 1.0);
    const src = ctx.createBufferSource();
    src.buffer = buffer;

    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(5200 + Math.random()*1200, time);
    bp.Q.setValueAtTime(2.2, time);

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, time);
    g.gain.linearRampToValueAtTime(peak, time + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0001, time + 0.045);

    src.connect(bp); bp.connect(g); g.connect(gardenState.percussionGain || gardenState.musicalGain);
    src.start(time);
    src.stop(time + 0.07);
}

function _scheduleRhythmSeeds(stepTime, stepInBar, barIndex, swungTime) {
    const m = gardenState.music;
    const e = m.energy;

    // Seed 8: soft kit groove
    if (m.seeds[8]) {
        // Kick: 1 & 3, with occasional pickup
        const kick = (stepInBar === 0) || (stepInBar === 8) || (e > 0.65 && stepInBar === 12 && Math.random() < 0.35);
        if (kick) _scheduleKick(stepTime, 0.18 + e*0.06);

        // Snare: 2 & 4 (soft)
        const snare = (stepInBar === 4) || (stepInBar === 12);
        if (snare) _scheduleSnare(stepTime, 0.08 + e*0.05);

        // Hat: 8ths, with gentle openness on bar ends
        if (stepInBar % 2 === 0) {
            const open = (stepInBar === 14 && Math.random() < (0.25 + e*0.35));
            const prob = 0.70 + e*0.20;
            if (Math.random() < prob) _scheduleHat(swungTime, 0.040 + e*0.020, open);
        }
    }

    // Seed 9: hand percussion (claves + shaker) – more syncopation
    if (m.seeds[9]) {
        const clavesPattern = _euclidHits(16, 3 + (e > 0.6 ? 1 : 0), (barIndex % 4));
        const shakerPattern = _euclidHits(16, 5 + (e > 0.4 ? 1 : 0), (barIndex % 3));

        if (clavesPattern[stepInBar] && Math.random() < (0.75 + e*0.15)) {
            _scheduleClaves(stepTime, 0.045 + e*0.030);
        }
        if (shakerPattern[stepInBar] && Math.random() < (0.60 + e*0.25)) {
            _scheduleShaker(swungTime, 0.032 + e*0.020);
        }
    }
    // Seed 10: brush hats (lighter, busier texture)
    if (m.seeds[10]) {
        // 16ths with probability, softened, occasional ghost snare
        const prob = 0.38 + e*0.22;
        if (Math.random() < prob) {
            const open = (stepInBar === 15 && Math.random() < (0.18 + e*0.25));
            _scheduleHat(swungTime, 0.026 + e*0.014, open);
        }
        const ghost = (stepInBar === 7 || stepInBar === 11) && Math.random() < (0.10 + e*0.18);
        if (ghost) _scheduleSnare(stepTime, 0.030 + e*0.020);
    }

    // Seed 11: low thumps (sparse, grounding)
    if (m.seeds[11]) {
        const thump = (stepInBar === 0) || (stepInBar === 6 && Math.random() < 0.35) || (e > 0.7 && stepInBar === 14 && Math.random() < 0.25);
        if (thump) _scheduleKick(stepTime, 0.12 + e*0.05);
    }

}

function _updateMusicEnergy(nowSec) {
    const m = gardenState.music;
    if (!gardenState.entryTime) return;
    const elapsedSec = (Date.now() - gardenState.entryTime) / 1000;
    // slow ramp (0..1) over ~3 minutes
    const timeRamp = _clamp(elapsedSec / 180, 0, 1);

    // interaction bump decays
    const sinceInteract = (Date.now() - (m.lastInteractAt || 0)) / 1000;
    const interactBoost = _clamp(1 - (sinceInteract / 20), 0, 1) * 0.35;

    m.energy = _clamp(timeRamp * 0.75 + interactBoost, 0, 1);
}

function _scheduleMusicStep(stepTime, stepIndex) {
    const ctx = gardenState.audioContext; if (!ctx) return;
    const m = gardenState.music;
    const harmony = _getHarmonyAtTime(stepTime);

    const stepInBar = stepIndex % m.stepsPerBar;         // 0..15
    const beatInBar = Math.floor(stepInBar / 4);         // 0..3
    const isDownbeat = (stepInBar === 0);
    const isBeat = (stepInBar % 4 === 0);

    _updateMusicEnergy(stepTime);

    // Slight swing on off-8ths (steps 2,6,10,14) – subtle, not jazz
    const swingSteps = new Set([2,6,10,14]);
    const swungTime = swingSteps.has(stepInBar) ? (stepTime + m.swing * _getStepDurationSec()) : stepTime;

    
    // ---- Rhythm seeds (8/9) ----
    _scheduleRhythmSeeds(stepTime, stepInBar, harmony.bar, swungTime);

// ---- Voice: drone (seed 7) ----
    if (m.seeds[7] && isDownbeat) {
        const root = _constrainRange(harmony.chord[0], 45, 57);
        const fifth = root + 7;
        _scheduleNote({ time: stepTime, midi: root, seconds: 4.5, peak: 0.030 * _seedVolMult(7), type:'sine', filterFreq: 500, q:0.7 });
        _scheduleNote({ time: stepTime + 0.03, midi: fifth, seconds: 4.2, peak: 0.018 * _seedVolMult(7), type:'sine', filterFreq: 520, q:0.7 });
    }

    // ---- Voice: bass (seed 0) ----
    if (m.seeds[0] && isBeat) {
        const target = (beatInBar === 0) ? harmony.chord[0] : (Math.random() < 0.3 ? harmony.chord[2] : harmony.chord[0]);
        const midi = _constrainRange(target, 36, 52);
        m.voiceMemory.bassMidi = midi;
        _scheduleNote({ time: stepTime, midi, seconds: 0.38, peak: 0.070 * _seedVolMult(0), type:'sine', filterFreq: 360, q:0.9 });
    }

    // ---- Voice: pad (seed 1) ----
    if (m.seeds[1] && (isDownbeat || (m.energy > 0.65 && stepInBar === 8))) {
        // invert gently by moving one chord tone up
        const chord = harmony.chord.slice();
        if (Math.random() < 0.55) chord[1] += 12;
        if (Math.random() < 0.35) chord[2] += 12;
        _schedulePad({ time: stepTime, chordMidis: chord, seconds: 3.2, peak: (0.040 + m.energy*0.010) * _seedVolMult(1) });
    }

    // ---- Voice: arp (seed 2) ----
    if (m.seeds[2] && (stepInBar % 2 === 0)) {
        const arpPool = harmony.chord.concat([harmony.chord[0] + 12, harmony.chord[1] + 12, harmony.chord[2] + 12]);
        const idx = (stepInBar / 2) % arpPool.length;
        const midi = _constrainRange(arpPool[idx], 60, 84);
        _scheduleNote({ time: swungTime, midi, seconds: 0.18, peak: (0.040 + m.energy*0.020) * _seedVolMult(2), type:'triangle', filterFreq: 1400 + Math.random()*700, q:0.9 });
    }

    // ---- Voice: pulse (seed 6) ----
    if (m.seeds[6]) {
        const gate = (stepInBar % 4 === 0) || (m.energy > 0.55 && (stepInBar % 4 === 2));
        if (gate) {
            // Bloom: warm pluck that anchors rhythm to the harmony (distinct from Lumen sparkle)
            const target = (stepInBar % 8 === 0) ? harmony.chord[0] : (Math.random() < 0.4 ? harmony.chord[1] : harmony.chord[2]);
            const midi = _constrainRange(target + 12, 58, 76);
            _scheduleNote({
                time: swungTime,
                midi,
                seconds: 0.14,
                peak: (0.022 + m.energy*0.020) * _seedVolMult(6),
                type: 'triangle',
                filterType: 'lowpass',
                filterFreq: 900 + Math.random()*500,
                detune: (Math.random()-0.5)*8,
                q: 0.9
            });
        }
    }

    // ---- Voice: melody (seed 3) ----
    if (m.seeds[3]) {
        const melodicGate =
            (stepInBar === 0) ||
            (m.energy > 0.30 && stepInBar === 6) ||
            (m.energy > 0.55 && stepInBar === 10) ||
            (m.energy > 0.70 && stepInBar === 14);

        if (melodicGate && Math.random() < (0.65 + m.energy*0.25)) {
            const preferChord = (stepInBar === 0 || stepInBar === 10);
            const prev = m.voiceMemory.melodyMidi ?? (harmony.tonic + 12);
            const midi = _quantizeToChordOrScale(prev, harmony, preferChord, 60, 88);
            m.voiceMemory.melodyMidi = midi;
            _scheduleNote({ time: swungTime, midi, seconds: 0.32, peak: (0.045 + m.energy*0.030) * _seedVolMult(3), type:'sine', filterFreq: 2200 + Math.random()*900, q:0.8 });
        }
    }

    // ---- Voice: counter melody (seed 4) ----
    if (m.seeds[4]) {
        const counterGate = (stepInBar === 4) || (stepInBar === 12);
        if (counterGate && Math.random() < (0.55 + m.energy*0.25)) {
            const prev = m.voiceMemory.counterMidi ?? (harmony.tonic + 19);
            const midi = _quantizeToChordOrScale(prev, harmony, true, 55, 80);
            m.voiceMemory.counterMidi = midi;
            _scheduleNote({ time: stepTime, midi, seconds: 0.55, peak: (0.030 + m.energy*0.018) * _seedVolMult(4), type:'triangle', filterFreq: 1100 + Math.random()*600, q:0.9 });
        }
    }

    // ---- Voice: sparkle (seed 5) ----
    if (m.seeds[5]) {
        const sparkleGate = (stepInBar === 2) || (stepInBar === 9) || (m.energy > 0.6 && stepInBar === 15);
        if (sparkleGate && Math.random() < (0.45 + m.energy*0.35)) {
            const prev = m.voiceMemory.sparkleMidi ?? (harmony.tonic + 31);
            const midi = _quantizeToChordOrScale(prev, harmony, false, 72, 96);
            m.voiceMemory.sparkleMidi = midi;
            _scheduleNote({ time: swungTime, midi, seconds: 0.20, peak: 0.018 + m.energy*0.018, type:'sine', filterType:'highpass', filterFreq: 1800 + Math.random()*1400, q:0.7 });
        }
    }
}

function _musicSchedulerTick() {
    const ctx = gardenState.audioContext; if (!ctx) return;
    const m = gardenState.music;
    const now = ctx.currentTime;
    while (m.nextStepTime < now + m.scheduleAheadSec) {
        _scheduleMusicStep(m.nextStepTime, m.currentStep);

        // advance
        const stepSec = _getStepDurationSec();
        m.currentStep = (m.currentStep + 1) % (m.barsPerCycle * m.stepsPerBar);
        m.nextStepTime += stepSec;
    }
}

function startGardenMusicEngine() {
    initGardenAudio();
    const ctx = gardenState.audioContext; if (!ctx) return;
    const m = gardenState.music;
    if (m.isRunning) return;

    if (ctx.state === 'suspended') ctx.resume();

    // Start quietly; overall loudness still governed by gardenState.gainNode/musicalGain.
    m.cycleStartTime = ctx.currentTime + 0.05;
    m.currentStep = 0;
    m.nextStepTime = m.cycleStartTime;
    m.isRunning = true;

    // Default seeds: a gentle foundation so it's never empty
    m.seeds[7] = true; // drone
    m.seeds[1] = true; // pad (very soft)
    m.seeds[6] = false;
    m.lastInteractAt = Date.now();

    if (m.timerId) clearInterval(m.timerId);
    m.timerId = setInterval(_musicSchedulerTick, m.lookaheadMs);

    // Expose helpers so your sound-seed UI can drive layers without tight coupling.
    window.setGardenSoundSeedActive = function(seedIndex, isActive) {
        const k = Number(seedIndex);
        if (!Number.isFinite(k) || k < 0 || k > 11) return;
        m.seeds[k] = !!isActive;
        m.lastInteractAt = Date.now();
    };
    window.toggleGardenSoundSeed = function(seedIndex) {
        const k = Number(seedIndex);
        if (!Number.isFinite(k) || k < 0 || k > 11) return;
        m.seeds[k] = !m.seeds[k];
        m.lastInteractAt = Date.now();
        return m.seeds[k];
    };
    window.getGardenSoundSeedState = function() {
        return Object.assign({}, m.seeds);
    };
    window.getGardenHarmony = function() {
        const h = _getHarmonyAtTime(_nowCtx());
        return { bar: h.bar, degree: h.degree, quality: h.quality, chord: h.chord.slice() };
    };
}

function stopGardenMusicEngine() {
    const m = gardenState.music;
    if (m.timerId) { clearInterval(m.timerId); m.timerId = null; }
    m.isRunning = false;
}

function _quantizedTimeToNext(stepMultiple = 4) {
    // returns an AudioContext time snapped to the next multiple of `stepMultiple` 16th-notes
    const ctx = gardenState.audioContext; if (!ctx) return 0;
    const m = gardenState.music;
    const stepSec = _getStepDurationSec();
    const now = ctx.currentTime;

    const stepNow = _getStepIndexAtTime(now);
    const next = Math.ceil((stepNow + 0.0001) / stepMultiple) * stepMultiple;
    const deltaSteps = (next - stepNow + (m.barsPerCycle*m.stepsPerBar)) % (m.barsPerCycle*m.stepsPerBar);
    return now + deltaSteps * stepSec;
}

function gardenMusicOnInteraction(intensity = 1) {
    const m = gardenState.music;
    m.lastInteractAt = Date.now();
    // small tempo breathe with energy
    m.tempo = 52 + Math.round(_clamp(m.energy + (intensity*0.15), 0, 1) * 10);
}


// --- Sound seed identities (UI-facing names) + per-seed loudness tuning ---
// If your UI already defines labels elsewhere, you can override by setting:
//   gardenState.music.seedLabels = ['Breeze', ...]  // length 12
const _DEFAULT_SEED_LABELS = Object.freeze([
    'Ember','Glade','Nectar','Aster','Dew','Lumen','Bloom','Breeze',
    'Rhythm I','Rhythm II','Rhythm III','Rhythm IV'
]);

const _SEED_VOLUME_MULT_BY_LABEL = Object.freeze({
    // User-requested boosts
    'Breeze': 1.45,
    'Aster': 1.55,
    'Nectar': 1.50,
    'Glade': 1.35,
    'Dew': 1.55,
    'Ember': 1.40
});

function _seedLabel(seedIndex) {
    const labels = gardenState?.music?.seedLabels;
    if (Array.isArray(labels) && labels[seedIndex]) return String(labels[seedIndex]);
    return _DEFAULT_SEED_LABELS[seedIndex] || `Seed ${seedIndex}`;
}

function _seedVolMult(seedIndex) {
    const label = _seedLabel(seedIndex);
    return _SEED_VOLUME_MULT_BY_LABEL[label] || 1.0;
}
function playFireflyChord(familyIndex) {
    initGardenAudio();
    if (!gardenState.audioContext) return;
    if (gardenState.audioContext.state === 'suspended') gardenState.audioContext.resume();

    // Fireflies are "voices" that reveal harmony; they don't decide harmony.
    // We quantize the stinger to the next beat so everything feels like one song.
    const ctx = gardenState.audioContext;
    const playAt = _quantizedTimeToNext(4) || ctx.currentTime;

    gardenMusicOnInteraction(1);

    const harmony = _getHarmonyAtTime(playAt);
    const timbre = FIREFLY_TIMBRES[familyIndex] || FIREFLY_TIMBRES[0];

    // Choose voicing/inversion by family for variety while staying in-key.
    const chordMidis = harmony.chord.slice(0, 4);
    // Spread upward a bit so it shimmers instead of clumping.
    if (familyIndex % 2 === 1) chordMidis[1] += 12;
    if (familyIndex % 3 === 0) chordMidis[2] += 12;
    if (familyIndex === 5 || familyIndex === 7) chordMidis[3] += 12;

    // Convert to frequencies
    const freqs = chordMidis.slice(0, 3).map(m => _midiToFreq(_constrainRange(m, 52, 90)));

    freqs.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        osc.type = timbre.type;
        osc.frequency.setValueAtTime(freq, playAt);
        osc.detune.setValueAtTime((Math.random() - 0.5) * timbre.detune, playAt);

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(timbre.filterFreq, playAt);
        filter.Q.setValueAtTime(0.8, playAt);

        const noteGain = ctx.createGain();
        noteGain.gain.setValueAtTime(0.0001, playAt);

        const peak = 0.13 - (i * 0.025);
        const a = Math.max(0.01, timbre.attack);
        const d = Math.max(0.35, timbre.decay);

        noteGain.gain.linearRampToValueAtTime(peak, playAt + a);
        noteGain.gain.exponentialRampToValueAtTime(0.001, playAt + d);

        osc.connect(filter); filter.connect(noteGain); noteGain.connect(gardenState.musicalGain);
        osc.start(playAt + i * 0.02);
        osc.stop(playAt + d + 0.45);
    });

    // Sparkle tail on special families (keeps your previous "reverb" vibe, but in time)
    if (familyIndex === 5) playReverbTail(freqs[0], 0.05, 3);

    // Optional: make certain families also "unlock" a layer if player hasn't yet.
    // (This makes tapping fireflies gradually orchestrate the full song.)
    const autoUnlock = familyIndex % 8;
    if (gardenState.music && gardenState.music.seeds && gardenState.music.seeds[autoUnlock] === false) {
        // keep it gentle: only unlock one of the musical layers, not all at once
        gardenState.music.seeds[autoUnlock] = true;
    }
}

function playReverbTail(baseFreq, volume, duration) {
    const ctx = gardenState.audioContext;
    const now = ctx.currentTime;
    for (let i = 0; i < 2; i++) {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = baseFreq * (1 + i * 0.002);
        
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(volume / (i + 1), now + 0.3 + i * 0.2);
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration + i * 0.5);
        
        osc.connect(gain); gain.connect(gardenState.musicalGain);
        osc.start(now + i * 0.1); osc.stop(now + duration + i * 0.5 + 0.5);
    }
}

function _parseColorToRgb(col) {
    if (!col) return { r: 254, g: 249, b: 195 };
    col = String(col).trim();
    if (col[0] === '#') {
        const h = col.slice(1);
        if (h.length === 3) return { r: parseInt(h[0]+h[0],16), g: parseInt(h[1]+h[1],16), b: parseInt(h[2]+h[2],16) };
        if (h.length >= 6) return { r: parseInt(h.slice(0,2),16), g: parseInt(h.slice(2,4),16), b: parseInt(h.slice(4,6),16) };
        return { r: 255, g: 255, b: 255 };
    }
    const m = col.match(/^rgba?\(([^)]+)\)$/i);
    if (m) {
        const p = m[1].split(',').map(s => parseFloat(s.trim()));
        return { r: p[0]||0, g: p[1]||0, b: p[2]||0 };
    }
    return { r: 254, g: 249, b: 195 };
}

function _rgbToCss(rgb, a) { return `rgba(${Math.round(rgb.r)}, ${Math.round(rgb.g)}, ${Math.round(rgb.b)}, ${typeof a === 'number' ? a : 1})`; }
function _mixRgb(a, b, t) { return { r: a.r * (1 - t) + b.r * t, g: a.g * (1 - t) + b.g * t, b: a.b * (1 - t) + b.b * t }; }

function _restoreMoonBaseAppearance(moonEl) {
    if (!moonEl) return;
    moonEl.style.removeProperty('--moon-tint-opacity');
    moonEl.style.removeProperty('--moon-tint-color');
    moonEl.style.removeProperty('--moon-hit-1');
    moonEl.style.removeProperty('--moon-hit-2');
    moonEl.style.removeProperty('box-shadow');
    moonEl.style.removeProperty('transition');
    moonEl.style.removeProperty('background');
    moonEl.style.removeProperty('background-image');
    moonEl.style.removeProperty('backgroundColor');
}

function _ensureMoonBaseStyles() {
    const moon = gardenState.elements?.moon || document.getElementById('gardenMoon');
    if (!moon) return null;
    if (!gardenState._moonBaseBoxShadow) {
        const cs = getComputedStyle(moon);
        gardenState._moonBaseBoxShadow = cs.boxShadow;
    }
    return moon;
}

function _applyMoonHitGlow(colorCss) {
    const moon = _ensureMoonBaseStyles();
    if (!moon) return;

    _restoreMoonBaseAppearance(moon);
    if (gardenState.moonHitTimer) clearTimeout(gardenState.moonHitTimer);
    
    moon.style.transition = 'box-shadow 1.8s ease';
    moon.style.boxShadow = `0 0 70px ${colorCss}, 0 0 140px ${colorCss}, 0 0 240px rgba(0,0,0,0)`;
    gardenState.moonHitTimer = setTimeout(() => { moon.style.boxShadow = gardenState._moonBaseBoxShadow; }, 650);
}

function _applyMoonFullTint(colorCss, durationMs) {
    const moon = _ensureMoonBaseStyles();
    if (!moon) return;

    if (gardenState.moonTintTimer) { clearTimeout(gardenState.moonTintTimer); gardenState.moonTintTimer = null; }
    if (gardenState.moonHitFadeTimer) { clearTimeout(gardenState.moonHitFadeTimer); gardenState.moonHitFadeTimer = null; }
    if (gardenState._moonTintRafId) { cancelAnimationFrame(gardenState._moonTintRafId); gardenState._moonTintRafId = null; }

    gardenState._moonTintToken = (gardenState._moonTintToken || 0) + 1;
    const token = gardenState._moonTintToken;

    const totalMs = Math.max(900, Number(durationMs) || 7000);
    const fadeMs = Math.min(3200, Math.max(1200, Math.floor(totalMs * 0.40)));
    const holdMs = Math.max(0, totalMs - fadeMs);

    const base = { r: 254, g: 249, b: 195 };
    const rgb = _parseColorToRgb(colorCss);
    const soft = _mixRgb(base, rgb, 0.55);
    const deep = _mixRgb(base, rgb, 0.70);

    const tintGradient = `radial-gradient(circle at 30% 30%, ${_rgbToCss(soft, 0.95)}, ${_rgbToCss(deep, 0.95)}, ${_rgbToCss(deep, 0.80)})`;
    _restoreMoonBaseAppearance(moon);
    moon.style.setProperty('--moon-tint-color', tintGradient);

    moon.style.transition = 'box-shadow 2.8s ease';
    moon.style.boxShadow = `0 0 60px rgba(254,249,195,0.5), 0 0 120px rgba(254,249,195,0.3), 0 0 85px ${_rgbToCss(soft, 0.45)}`;

    const start = performance.now();
    const end = start + totalMs;

    function step(now) {
        if (gardenState._moonTintToken !== token) return;
        const t = now - start;

        let opacity = 0;
        if (t <= fadeMs) {
            const x = Math.min(1, t / fadeMs);
            opacity = x * (2 - x);
        } else if (t <= fadeMs + holdMs) {
            opacity = 1;
        } else {
            const x = Math.min(1, (t - fadeMs - holdMs) / fadeMs);
            const y = 1 - x;
            opacity = y * y;
        }

        moon.style.setProperty('--moon-tint-opacity', String(opacity));

        if (now >= end) {
            _restoreMoonBaseAppearance(moon);
            gardenState._moonTintRafId = null;
            return;
        }

        gardenState._moonTintRafId = requestAnimationFrame(step);
    }

    moon.style.setProperty('--moon-tint-opacity', '0');
    gardenState._moonTintRafId = requestAnimationFrame(step);

    gardenState.moonTintTimer = setTimeout(() => {
        if (gardenState._moonTintToken !== token) return;
        _restoreMoonBaseAppearance(moon);
    }, totalMs + 1200);
}

function spawnColoredMoteRain(colorCss, durationMs) {
    const container = document.getElementById('gardenMotes');
    if (!container) return;
    
    const rgb = _parseColorToRgb(colorCss);
    const moteColor = _rgbToCss(rgb, 0.5);
    const glowColor = _rgbToCss(rgb, 0.3);
    
    const moteCount = 25;
    const spawnInterval = durationMs / moteCount;
    let spawned = 0;
    
    const spawnMote = () => {
        if (spawned >= moteCount || !gardenState.isOpen) return;
        spawned++;
        
        const mote = document.createElement('div');
        mote.className = 'colored-mote';
        mote.style.cssText = `
            position: absolute;
            width: ${2 + Math.random() * 2}px;
            height: ${2 + Math.random() * 2}px;
            border-radius: 50%;
            background: ${moteColor};
            box-shadow: 0 0 5px ${glowColor}, 0 0 10px ${glowColor};
            left: ${Math.random() * 100}%;
            top: -3%;
            opacity: 0;
            pointer-events: none;
            z-index: 406;
        `;
        
        container.appendChild(mote);
        
        const fallDuration = 12000 + Math.random() * 8000;
        const swayAmount = 15 + Math.random() * 20;
        const swaySpeed = 0.8 + Math.random() * 0.7;
        const startTime = performance.now();
        const startX = parseFloat(mote.style.left);
        
        const animateMote = (now) => {
            const elapsed = now - startTime;
            const progress = Math.min(1, elapsed / fallDuration);
            
            const y = progress * 105;
            const sway = Math.sin(progress * Math.PI * swaySpeed) * swayAmount;
            
            let opacity = 0;
            if (progress < 0.2) opacity = progress / 0.2;
            else if (progress > 0.8) opacity = (1 - progress) / 0.2;
            else opacity = 1;
            opacity *= 0.5;
            
            mote.style.top = `${y}%`;
            mote.style.left = `calc(${startX}% + ${sway}px)`;
            mote.style.opacity = String(opacity);
            
            if (progress < 1 && gardenState.isOpen) {
                requestAnimationFrame(animateMote);
            } else {
                mote.remove();
            }
        };
        
        requestAnimationFrame(animateMote);
        
        if (spawned < moteCount) {
            setTimeout(spawnMote, spawnInterval * (0.7 + Math.random() * 0.6));
        }
    };
    
    spawnMote();
}

function _updateMoonStreak(key, colorCss) {
    if (gardenState.moonStreakKey === key) gardenState.moonStreakCount++;
    else { gardenState.moonStreakKey = key; gardenState.moonStreakCount = 1; }
    
    if (gardenState.moonStreakCount >= 3) {
        gardenState.moonStreakCount = 0; gardenState.moonStreakKey = null;
        _applyMoonFullTint(colorCss, 7000);
        spawnColoredMoteRain(colorCss, 7000);
    }
}

function flyFireflyToMoon(fireflyData) {
    if (gardenState.moonFlightActive) return false;
    const overlay = gardenState.elements?.overlay || document.getElementById('midnightGardenOverlay');
    const moon = gardenState.elements?.moon || document.getElementById('gardenMoon');
    if (!overlay || !moon) return false;
    
    gardenState.moonFlightActive = true;
    
    gardenState.fireflies = gardenState.fireflies.filter(f => f !== fireflyData);
    if (fireflyData.element && fireflyData.element.parentNode) fireflyData.element.parentNode.removeChild(fireflyData.element);
    
    const overlayRect = overlay.getBoundingClientRect();
    const moonRect = moon.getBoundingClientRect();
    
    const startX = (fireflyData.x / 100) * window.innerWidth;
    const startY = (fireflyData.y / 100) * window.innerHeight;
    const endX = (moonRect.left - overlayRect.left) + moonRect.width / 2;
    const endY = (moonRect.top - overlayRect.top) + moonRect.height / 2;
    
    const flight = document.createElement('div'); 
    flight.className = 'moon-flight-firefly';
    flight.style.setProperty('--ff-color', fireflyData.color); 
    flight.style.left = '0'; flight.style.top = '0';
    flight.style.transform = `translate3d(${startX}px, ${startY}px, 0)`;
    overlay.appendChild(flight);
    
    const dur = 1600; const startT = performance.now();
    const dx = endX - startX; const dy = endY - startY;
    const ease = (t) => t * t * (3 - 2 * t);
    
    const step = (now) => {
        const t = Math.min(1, (now - startT) / dur);
        const tt = ease(t);
        const scale = 1 - 0.35 * tt;
        
        flight.style.transform = `translate3d(${startX + dx * tt}px, ${startY + dy * tt + Math.sin(Math.PI * tt) * -45}px, 0) scale(${scale})`;
        flight.style.opacity = t < 0.75 ? 1 : (1 - (t - 0.75) / 0.25);
        
        if (t < 1) requestAnimationFrame(step);
        else {
            try {
                _applyMoonHitGlow(fireflyData.color);
                _updateMoonStreak(String(fireflyData.family), fireflyData.color);
            } catch (err) {
                console.warn('[MidnightGarden] moon flight completion error:', err);
            } finally {
                if (flight.parentNode) flight.parentNode.removeChild(flight);
                setTimeout(() => { gardenState.moonFlightActive = false; }, 260);
            }
        }
    };
    requestAnimationFrame(step);
    return true;
}

function startSpatialAmbience() {
    initGardenAudio();
    if (!gardenState.audioContext) return;
    
    startForestBreath();
    scheduleAmbientSound('distantOwl', playDistantOwl);
    scheduleAmbientSound('insectChirr', playInsectChirr);
    scheduleAmbientSound('leavesRustle', playLeavesRustle);
    scheduleAmbientSound('fenceCreak', playFenceCreak);
}

function stopSpatialAmbience() {
    Object.keys(gardenState.ambientTimers).forEach(key => clearTimeout(gardenState.ambientTimers[key]));
    gardenState.ambientTimers = {};
}

function scheduleAmbientSound(soundName, playFunction) {
    const config = AMBIENT_SOUNDS[soundName];
    if (!config) return;
    
    const schedule = () => {
        if (!gardenState.isOpen || !gardenState.soundscapeActive) return;
        if (!config.chance || Math.random() < config.chance) playFunction();
        const delay = config.minInterval + Math.random() * (config.maxInterval - config.minInterval);
        gardenState.ambientTimers[soundName] = setTimeout(schedule, delay);
    };
    gardenState.ambientTimers[soundName] = setTimeout(schedule, 1000 + Math.random() * (config.minInterval * 0.5));
}

function startForestBreath() {
    const ctx = gardenState.audioContext; if (!ctx) return;
    const buffer = getNoiseBuffer(ctx, 10);
    
    const playBreath = () => {
        if (!gardenState.isOpen || !gardenState.soundscapeActive) return;
        const now = ctx.currentTime; const duration = 6 + Math.random() * 4;
        
        const noiseSource = ctx.createBufferSource(); noiseSource.buffer = buffer;
        const filter = ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 150; filter.Q.value = 0.5;
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.08, now + duration * 0.3);
        gain.gain.linearRampToValueAtTime(0.12, now + duration * 0.5);
        gain.gain.linearRampToValueAtTime(0, now + duration);
        
        noiseSource.connect(filter); filter.connect(gain); gain.connect(gardenState.ambienceGain);
        noiseSource.start(now); noiseSource.stop(now + duration);
        
        gardenState.ambientTimers.forestBreath = setTimeout(playBreath, (duration + 2 + Math.random() * 3) * 1000);
    };
    gardenState.ambientTimers.forestBreath = setTimeout(playBreath, 500);
}

function playDistantOwl() {
    const ctx = gardenState.audioContext; if (!ctx) return;
    const now = ctx.currentTime; const baseFreq = 280 + Math.random() * 40;
    [0, 0.6].forEach((delay, i) => {
        const osc = ctx.createOscillator(); osc.type = 'sine'; osc.frequency.setValueAtTime(baseFreq * (i===0?1:0.85), now+delay);
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0, now+delay);
        gain.gain.linearRampToValueAtTime(0.12, now+delay+0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, now+delay+0.8);
        const filter = ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 600;
        osc.connect(filter); filter.connect(gain); gain.connect(gardenState.ambienceGain);
        osc.start(now+delay); osc.stop(now+delay+1);
    });
}

function playInsectChirr() {
    const ctx = gardenState.audioContext; if (!ctx) return;
    const now = ctx.currentTime; const baseFreq = 3000 + Math.random() * 1500;
    const chirps = 2 + Math.floor(Math.random() * 4);
    for (let i=0; i<chirps; i++) {
        const osc = ctx.createOscillator(); osc.type = 'sine'; osc.frequency.value = baseFreq + Math.random() * 200;
        const gain = ctx.createGain(); const t = now + i * 0.08;
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.06, t + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
        osc.connect(gain); gain.connect(gardenState.ambienceGain);
        osc.start(t); osc.stop(t + 0.1);
    }
}

function playLeavesRustle() {
    const ctx = gardenState.audioContext; if (!ctx) return;
    const now = ctx.currentTime; const duration = 0.8 + Math.random() * 0.6;
    const buffer = getNoiseBuffer(ctx, 2);
    
    const noiseSource = ctx.createBufferSource(); noiseSource.buffer = buffer;
    const filter = ctx.createBiquadFilter(); filter.type = 'bandpass'; filter.frequency.value = 2000 + Math.random() * 1000; filter.Q.value = 0.8;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.08, now + 0.05);
    gain.gain.linearRampToValueAtTime(0.12, now + duration * 0.3);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    
    noiseSource.connect(filter); filter.connect(gain); gain.connect(gardenState.ambienceGain);
    noiseSource.start(now); noiseSource.stop(now + duration);
}

function playFenceCreak() {
    const ctx = gardenState.audioContext; if (!ctx) return;
    const now = ctx.currentTime; const baseFreq = 80 + Math.random() * 40;
    const osc = ctx.createOscillator(); osc.type = 'sawtooth'; osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.linearRampToValueAtTime(baseFreq * 0.7, now + 0.3);
    const filter = ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 300; filter.Q.value = 2;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.10, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    osc.connect(filter); filter.connect(gain); gain.connect(gardenState.ambienceGain);
    osc.start(now); osc.stop(now + 0.5);
}

function startPlantBreaths() { if (gardenState.plantBreathTimer) return; scheduleNextPlantBreath(true); }
function stopPlantBreaths() { if (gardenState.plantBreathTimer) { clearTimeout(gardenState.plantBreathTimer); gardenState.plantBreathTimer = null; } }
function scheduleNextPlantBreath(isFirst = false) {
    stopPlantBreaths();
    if (!gardenState.isOpen) return;
    const delay = isFirst ? (9000 + Math.random() * 7000) : (12000 + Math.random() * 20000);
    gardenState.plantBreathTimer = setTimeout(() => { if (!gardenState.isOpen) return; playPlantBreath(); scheduleNextPlantBreath(false); }, delay);
}

function playPlantBreath() {
    initGardenAudio(); if (!gardenState.audioContext) return;
    const ctx = gardenState.audioContext; const now = ctx.currentTime;
    const history = (typeof state !== 'undefined' && state.history) ? state.history : [];
    if (!history || history.length === 0) return;
    
    const plant = history[Math.floor(Math.random() * Math.min(history.length, 12))];
    const hue = plant?.dna?.flowerH ?? plant?.dna?.colorH ?? 0;
    const harmonics = getHarmonicsForHue(hue);
    const baseFreq = harmonics[Math.floor(Math.random() * harmonics.length)];

    // Plants sing *within* the current harmony so they feel like counter-melody, not random tones.
    // Start from the plant's color-harmonic, then quantize to the active chord/scale.
    let freq = baseFreq;
    const approxMidi = 69 + 12 * (Math.log2(baseFreq / 440));
    if (gardenState.music && gardenState.music.isRunning) {
        const harmony = _getHarmonyAtTime(now);
        const preferChord = Math.random() < (0.55 + (gardenState.music.energy || 0) * 0.25);
        const midi = _quantizeToChordOrScale(approxMidi, harmony, preferChord, 50, 86);
        // occasional octave drift for breath-like motion
        const octave = (Math.random() < 0.18) ? (Math.random() < 0.5 ? -12 : 12) : 0;
        freq = _midiToFreq(midi + octave);
    } else {
        freq = baseFreq * (Math.random() < 0.25 ? 0.5 : (Math.random() < 0.35 ? 2 : 1));
    }
    
    const osc = ctx.createOscillator(); osc.type = 'sine'; osc.frequency.setValueAtTime(freq, now);
    const det = (Math.random() * 6) - 3; osc.detune.setValueAtTime(det, now);
    
    const filter = ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.setValueAtTime(900 + Math.random() * 900, now); filter.Q.setValueAtTime(0.7, now);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    const peak = 0.035;
    gain.gain.linearRampToValueAtTime(peak, now + 1.6);
    gain.gain.linearRampToValueAtTime(peak * 0.6, now + 3.2);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 7.0);
    
    osc.connect(filter); filter.connect(gain); gain.connect(gardenState.plantGain || gardenState.gainNode);
    osc.start(now); osc.stop(now + 7.2);
}

function getHarmonicsForHue(hue) {
    if (hue >= 340 || hue < 20) return PLANT_HARMONICS.red;
    if (hue >= 20 && hue < 50) return PLANT_HARMONICS.orange;
    if (hue >= 50 && hue < 80) return PLANT_HARMONICS.yellow;
    if (hue >= 80 && hue < 160) return PLANT_HARMONICS.green;
    if (hue >= 160 && hue < 200) return PLANT_HARMONICS.cyan;
    if (hue >= 200 && hue < 260) return PLANT_HARMONICS.blue;
    if (hue >= 260 && hue < 300) return PLANT_HARMONICS.purple;
    return PLANT_HARMONICS.pink;
}

function setGardenMood(mood) {
    if (!gardenState.audioContext) return;
    gardenState.currentMood = mood;
    const now = gardenState.audioContext.currentTime;
    switch (mood) {
        case 'contemplative':
            gardenState.ambienceGain?.gain.linearRampToValueAtTime(0.4, now + 2);
            gardenState.musicalGain?.gain.linearRampToValueAtTime(0.7, now + 2);
            break;
        case 'mysterious':
            gardenState.ambienceGain?.gain.linearRampToValueAtTime(0.5, now + 2);
            gardenState.musicalGain?.gain.linearRampToValueAtTime(0.4, now + 2);
            break;
        case 'tender':
            gardenState.ambienceGain?.gain.linearRampToValueAtTime(0.3, now + 2);
            gardenState.musicalGain?.gain.linearRampToValueAtTime(0.8, now + 2);
            break;
    }
}

function startMoodCycling() {
    const moods = ['contemplative', 'mysterious', 'tender'];
    const cycleMood = () => {
        if (!gardenState.isOpen || !gardenState.soundscapeActive) return;
        setGardenMood(moods[Math.floor(Math.random() * moods.length)]);
        gardenState.moodTransitionTimer = setTimeout(cycleMood, 60000 + Math.random() * 120000);
    };
    gardenState.moodTransitionTimer = setTimeout(cycleMood, 45000 + Math.random() * 45000);
}

function stopMoodCycling() { if (gardenState.moodTransitionTimer) { clearTimeout(gardenState.moodTransitionTimer); gardenState.moodTransitionTimer = null; } }

function startAmbientSoundscape() {
    if (gardenState.soundscapeActive) return;
    initGardenAudio(); if (!gardenState.audioContext) return;
    if (gardenState.audioContext.state === 'suspended') gardenState.audioContext.resume();

    // Start the duration-based musical spine. Seeds/voices layer on top.
    startGardenMusicEngine();
    
    const indicator = gardenState.elements?.soundscapeIndicator || document.getElementById('soundscapeIndicator');
    gardenState.soundscapeActive = true;
    if (indicator) indicator.classList.add('active');
    
    startSpatialAmbience();
    startPlantBreaths();
    startMoodCycling();
    startWindSystem();
}

function stopAmbientSoundscape() {
    gardenState.soundscapeActive = false;

    // Stop the generative score scheduler (notes already scheduled will ring out naturally).
    stopGardenMusicEngine();
    const indicator = gardenState.elements?.soundscapeIndicator || document.getElementById('soundscapeIndicator');
    if (indicator) indicator.classList.remove('active');
    
    stopSpatialAmbience();
    stopPlantBreaths();
    stopMoodCycling();
    stopWindSystem();
    if (gardenState.audioContext && gardenState.audioContext.state === 'running') {
        gardenState.audioContext.suspend();
    }
}

function startWindSystem() { if (gardenState.windInterval) return; scheduleNextWindGust(); }
function stopWindSystem() { if (gardenState.windInterval) { clearTimeout(gardenState.windInterval); gardenState.windInterval = null; } }
function scheduleNextWindGust() {
    if (!gardenState.isOpen) return;
    const delay = 8000 + Math.random() * 12000;
    gardenState.windInterval = setTimeout(() => { if (gardenState.isOpen) { triggerWindGust(); scheduleNextWindGust(); } }, delay);
}
function triggerWindGust() { playWindSound(); }

function playWindSound() {
    initGardenAudio(); if (!gardenState.audioContext) return;
    if (gardenState.audioContext.state === 'suspended') gardenState.audioContext.resume();
    const ctx = gardenState.audioContext; const now = ctx.currentTime;
    
    const buffer = getNoiseBuffer(ctx, 30);
    const noiseSource = ctx.createBufferSource(); noiseSource.buffer = buffer;
    
    const filter = ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.Q.value = 1.0;
    filter.frequency.setValueAtTime(150, now);
    filter.frequency.linearRampToValueAtTime(600, now + 5);
    filter.frequency.linearRampToValueAtTime(150, now + 30);
    
    const windGain = ctx.createGain();
    windGain.gain.setValueAtTime(0, now);
    windGain.gain.linearRampToValueAtTime(0.16, now + 12);
    windGain.gain.exponentialRampToValueAtTime(0.001, now + 30);
    
    noiseSource.connect(filter); filter.connect(windGain); windGain.connect(gardenState.ambienceGain || gardenState.gainNode);
    noiseSource.start(now); noiseSource.stop(now + 30);
}

window.handleBackButtonGarden = function(e) {
    if (gardenState.isOpen) { exitMidnightGarden(); e.preventDefault(); return; }
    if (typeof handleBackButton === 'function') handleBackButton(e);
};

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initMidnightGarden); 
else setTimeout(initMidnightGarden, 100);

window.enterMidnightGarden = enterMidnightGarden;
window.exitMidnightGarden = exitMidnightGarden;
window.triggerWindGust = triggerWindGust;
window.setGardenMood = setGardenMood;
window.gardenState = gardenState;
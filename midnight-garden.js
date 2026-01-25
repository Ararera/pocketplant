/* ============================================
   MIDNIGHT GARDEN - JavaScript
   Optimized for Performance & Battery Life
   ============================================ */

// Garden state
let gardenState = {
    isOpen: false,
    fireflies: [],
    // Replaced individual intervals with master loop logic
    fireflySpawnTimer: null,
    
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
    // Audio Buffers Cache
    audioBuffers: {},
    
    // Current mood
    currentMood: 'contemplative', 
    moodTransitionTimer: null,
    plantBreathTimer: null,
    entryTime: null,
    maxFireflies: 15, // Reduced for mobile safety

    // Firefly -> Moon interaction
    moonFlightActive: false,
    moonStreakKey: null,
    moonStreakCount: 0,
    moonTintTimer: null,
    moonHitTimer: null,
    moonHitFadeTimer: null,
    _moonBaseBoxShadow: null,
    _moonBaseBackground: null,
    
    // Master Loop ID
    visualLoopId: null
};

// Musical notes for firefly chords (frequencies in Hz)
const GARDEN_CHORDS = Object.freeze({
    0: [261.63, 329.63, 392.00],       // Ember - C major
    1: [293.66, 369.99, 440.00],       // Citrine - D major
    2: [329.63, 415.30, 493.88],       // Verdant - E major
    3: [349.23, 440.00, 523.25],       // Aqua - F major
    4: [392.00, 493.88, 587.33],       // Azure - G major
    5: [440.00, 554.37, 659.25],       // Violet - A major
    6: [493.88, 622.25, 739.99],       // Rose - B major
    7: [277.18, 349.23, 415.30]        // Pearl - C# major
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

// Helper for caching noise buffers
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

/**
 * Initialize the Midnight Garden
 */
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
}

/**
 * Create stars for the garden sky
 */
function createGardenStars() {
    const container = document.getElementById('gardenStars');
    if (!container) return;
    
    container.innerHTML = '';
    // Reduced star count for mobile performance
    const starCount = 60;
    const fragment = document.createDocumentFragment();
    
    for (let i = 0; i < starCount; i++) {
        const star = document.createElement('div');
        star.className = 'garden-star';
        // Note: CSS animations handle the twinkling, which is performant
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

/**
 * Enter the Midnight Garden
 */
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

/**
 * Exit the Midnight Garden
 */
function exitMidnightGarden() {
    if (!gardenState.isOpen) return;
    
    const transition = gardenState.elements?.transition || document.getElementById('midnightTransition');
    const overlay = gardenState.elements?.overlay || document.getElementById('midnightGardenOverlay');
    
    stopAmbientSoundscape();
    stopGardenFireflies(); // Stops the visual loop
    
    transition.classList.add('active');
    
    setTimeout(() => {
        overlay.classList.remove('open');
        document.body.classList.remove('midnight-garden-active');
        
        // Clean DOM
        if (gardenState.elements && gardenState.elements.firefliesContainer) {
            gardenState.elements.firefliesContainer.innerHTML = '';
        }

        setTimeout(() => {
            transition.classList.remove('active');
            gardenState.isOpen = false;
            
            if (typeof render === 'function') render();
            if (typeof updateUI === 'function') updateUI();
            
            if (typeof state !== 'undefined' && state.isRainOn && typeof audio !== 'undefined' && audio.startRainSound) audio.startRainSound();
            if (typeof state !== 'undefined' && state.isMusicPlaying && typeof audio !== 'undefined' && audio.playBackgroundMusic) audio.playBackgroundMusic();
        }, 300);
    }, 800);
}

/**
 * Sync moon phase from main game
 */
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

/**
 * Render all ascended plants in the garden
 */
function renderGardenPlants() {
    const container = gardenState.elements?.plantsScroll || document.getElementById('gardenPlantsScroll');
    const subtitle = gardenState.elements?.subtitle || document.getElementById('gardenSubtitle');
    if (!container) return;
    
    container.innerHTML = '';
    const history = (typeof state !== 'undefined' && state.history) ? state.history : [];
    
    if (history.length === 0) {
        const emptyDiv = document.createElement('div');
        emptyDiv.className = 'garden-empty';
        emptyDiv.innerHTML = `<div class="garden-empty-icon">🌱</div><div class="garden-empty-text">No ancestors yet.<br>Ascend your first plant to<br>see it resting here.</div>`;
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
    
    // Pot construction
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
    
    // Plant Render logic
    const plantGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    svg.appendChild(plantGroup);
    svg.appendChild(potGroup);

    if (typeof renderPlant === 'function' && plantData.dna) {
        const tempId = `tempGardenPlant_${index}_${Date.now()}`;
        plantGroup.setAttribute('id', tempId);
        // Temporarily mount for getComputedStyle if needed by renderer
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

function playPlantSound(plantData) {
    initGardenAudio();
    if (!gardenState.audioContext) return;
    if (gardenState.audioContext.state === 'suspended') gardenState.audioContext.resume();
    
    const ctx = gardenState.audioContext;
    const now = ctx.currentTime;
    const dna = plantData.dna || {};
    
    const hue = dna.flowerH || dna.colorH || 0;
    const harmonics = getHarmonicsForHue(hue);
    const baseNote = harmonics[0];
    
    const stage = plantData.stage || 3;
    const oscType = stage >= 5 ? 'sine' : stage >= 3 ? 'triangle' : 'sine';
    const scars = plantData.scars || [];
    const detuneAmount = scars.length * 6;
    const hasScars = scars.length > 0;
    
    const notes = [baseNote, baseNote * 1.25, baseNote * 1.5];
    
    notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        osc.type = oscType;
        osc.frequency.value = freq;
        osc.detune.value = detuneAmount + (Math.random() - 0.5) * 4;
        
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 800 + (stage * 200);
        filter.Q.value = hasScars ? 2 : 1;
        
        const gain = ctx.createGain();
        const noteStart = now + i * 0.08;
        gain.gain.setValueAtTime(0, noteStart);
        gain.gain.linearRampToValueAtTime(0.12 - (i * 0.02), noteStart + 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, noteStart + 2);
        
        osc.connect(filter); filter.connect(gain); gain.connect(gardenState.musicalGain);
        osc.start(noteStart); osc.stop(noteStart + 2.5);
    });
    
    // Only check context state before creating delayed nodes
    if (stage >= 5 && ctx.state === 'running') {
        setTimeout(() => {
            if (!gardenState.isOpen) return;
            const tailOsc = ctx.createOscillator();
            tailOsc.type = 'sine'; tailOsc.frequency.value = baseNote * 2;
            const tailGain = ctx.createGain();
            tailGain.gain.setValueAtTime(0, ctx.currentTime);
            tailGain.gain.linearRampToValueAtTime(0.04, ctx.currentTime + 0.2);
            tailGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 3);
            tailOsc.connect(tailGain); tailGain.connect(gardenState.musicalGain);
            tailOsc.start(ctx.currentTime); tailOsc.stop(ctx.currentTime + 3.5);
        }, 200);
    }
}

// ============================================
// OPTIMIZED FIREFLY SYSTEM (Master Loop)
// ============================================

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
    
    // Single interval to add more fireflies occasionally
    gardenState.fireflySpawnTimer = setInterval(() => {
        if (!gardenState.isOpen) return;
        gardenState.fireflies = gardenState.fireflies.filter(ff => ff.element && ff.element.parentNode);
        if (gardenState.fireflies.length < maxVisible && ownedFamilies.length > 0) {
            const famIndex = weightedFamilySelection(fireflyInventory, ownedFamilies);
            spawnGardenFirefly(famIndex, container);
        }
    }, 4000 + Math.random() * 3000);

    // Start the Master Visual Loop
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
    
    // Position logic (0-100 scale)
    const startX = 10 + Math.random() * 80;
    const startY = 15 + Math.random() * 55;
    
    // REMOVED: ff.style.background = color; - Visual is handled by ::before pseudo-element
    ff.style.setProperty('--ff-color', color);
    ff.style.setProperty('--glow-dur', `${2 + Math.random() * 2}s`);
    // Initialize transform for GPU-accelerated positioning
    ff.style.transform = `translate3d(${startX}vw, ${startY}vh, 0)`;
    
    ff.dataset.family = familyIndex;
    container.appendChild(ff);
    
    // Trigger fade-in after a frame to ensure CSS transition works
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            ff.classList.add('visible');
        });
    });
    
    // Create Data Object
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

        // Hand off to flight system
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
        
        // Use a safe delta to prevent huge jumps if tab was hidden
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
        
        // Check if approaching end of life - trigger fadeout
        if (age > f.lifeTime - 1200 && !f.fadingOut) {
            f.fadingOut = true;
            if (f.element) {
                f.element.classList.remove('visible');
                f.element.classList.add('fadeout');
            }
        }
        
        // Remove after fadeout completes
        if (age > f.lifeTime) {
            if (f.element && f.element.parentNode) {
                f.element.parentNode.removeChild(f.element);
            }
            continue;
        }
        
        // === ENHANCED MOVEMENT LOGIC ===
        f.timeToNewTarget -= dt;
        
        // Pick new target more frequently with larger movements
        if (f.timeToNewTarget <= 0) {
            // More dramatic target changes - fireflies dart around!
            const wanderRadius = 15 + Math.random() * 20;
            const angle = Math.random() * Math.PI * 2;
            f.targetX = Math.max(5, Math.min(95, f.x + Math.cos(angle) * wanderRadius));
            f.targetY = Math.max(10, Math.min(70, f.y + Math.sin(angle) * wanderRadius * 0.6));
            
            // Vary timing - sometimes quick darts, sometimes lazy drifts
            f.timeToNewTarget = 2 + Math.random() * 6;
            
            // Occasionally do a big repositioning
            if (Math.random() < 0.15) {
                f.targetX = 10 + Math.random() * 80;
                f.targetY = 15 + Math.random() * 50;
                f.timeToNewTarget = 4 + Math.random() * 4;
            }
        }
        
        const dx = f.targetX - f.x;
        const dy = f.targetY - f.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        // Multi-layered organic wobble for that firefly flutter
        const time = now * 0.001;
        const flutter1 = Math.sin(time * 3.5 + f.phase * 2) * 0.08;
        const flutter2 = Math.cos(time * 5.2 + f.phase * 3) * 0.05;
        const flutter3 = Math.sin(time * 1.8 + f.phase) * 0.03;
        const wobbleX = flutter1 + flutter2 * 0.7;
        const wobbleY = flutter2 + flutter3 * 0.8 + Math.sin(time * 2.1 + f.phase * 1.5) * 0.04;
        
        // Stronger attraction when far, gentler when close
        const attraction = dist > 10 ? 0.012 : 0.006;
        
        f.velX += dx * attraction * dt + wobbleX * dt * 60;
        f.velY += dy * attraction * dt + wobbleY * dt * 60;
        
        // Light damping for smooth but active motion
        f.velX *= 0.96;
        f.velY *= 0.97;
        
        // Speed limits - allow faster movement
        const maxSpeed = 0.4;
        const speed = Math.sqrt(f.velX * f.velX + f.velY * f.velY);
        if (speed > maxSpeed) {
            const scale = maxSpeed / speed;
            f.velX *= scale;
            f.velY *= scale;
        }
        
        f.x += f.velX;
        f.y += f.velY;
        
        // Soft boundary bounce
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

// ============================================
// AUDIO & AMBIENCE
// ============================================

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
        
        gardenState.plantGain = gardenState.audioContext.createGain();
        gardenState.plantGain.gain.value = 0.3;
        gardenState.plantGain.connect(gardenState.gainNode);
    } catch (e) { console.warn('Audio error', e); }
}

function playFireflyChord(familyIndex) {
    initGardenAudio();
    if (!gardenState.audioContext) return;
    if (gardenState.audioContext.state === 'suspended') gardenState.audioContext.resume();
    
    const chord = GARDEN_CHORDS[familyIndex] || GARDEN_CHORDS[0];
    const timbre = FIREFLY_TIMBRES[familyIndex] || FIREFLY_TIMBRES[0];
    const ctx = gardenState.audioContext;
    const now = ctx.currentTime;
    
    chord.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        osc.type = timbre.type;
        osc.frequency.value = freq;
        osc.detune.value = (Math.random() - 0.5) * timbre.detune;
        
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = timbre.filterFreq;
        
        const noteGain = ctx.createGain();
        noteGain.gain.setValueAtTime(0, now);
        noteGain.gain.linearRampToValueAtTime(0.15 - (i * 0.02), now + timbre.attack);
        noteGain.gain.exponentialRampToValueAtTime(0.001, now + timbre.decay);
        
        osc.connect(filter); filter.connect(noteGain); noteGain.connect(gardenState.musicalGain);
        osc.start(now + i * 0.03); osc.stop(now + timbre.decay + 0.5);
    });
    
    if (familyIndex === 5) playReverbTail(chord[0], 0.05, 3);
}

function playReverbTail(baseFreq, volume, duration) {
    const ctx = gardenState.audioContext;
    const now = ctx.currentTime;
    // Optimization: Reduced to 2 oscillators
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

// ============================================
// COLORS & PARSING (OPTIMIZED)
// ============================================

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
    const hM = col.match(/^hsla?\(([^)]+)\)$/i);
    if (hM) {
        // Optimization: Approximate or use valid conversion logic, avoided heavyweight fallback
        return { r: 254, g: 249, b: 195 }; // Simplified for now to save bytes/perf
    }
    return { r: 254, g: 249, b: 195 };
}

function _rgbToCss(rgb, a) { return `rgba(${Math.round(rgb.r)}, ${Math.round(rgb.g)}, ${Math.round(rgb.b)}, ${typeof a === 'number' ? a : 1})`; }
function _mixRgb(a, b, t) { return { r: a.r * (1 - t) + b.r * t, g: a.g * (1 - t) + b.g * t, b: a.b * (1 - t) + b.b * t }; }

// ============================================
// MOON & INTERACTION
// ============================================

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
    if (gardenState.moonHitTimer) clearTimeout(gardenState.moonHitTimer);
    
    moon.style.transition = 'box-shadow 1.8s ease';
    moon.style.boxShadow = `0 0 70px ${colorCss}, 0 0 140px ${colorCss}, 0 0 240px rgba(0,0,0,0)`;
    gardenState.moonHitTimer = setTimeout(() => { moon.style.boxShadow = gardenState._moonBaseBoxShadow; }, 650);
}

function _applyMoonFullTint(colorCss) {
    const moon = _ensureMoonBaseStyles();
    if (!moon) return;
    if (gardenState.moonTintTimer) clearTimeout(gardenState.moonTintTimer);
    
    const base = { r: 254, g: 249, b: 195 };
    const rgb = _parseColorToRgb(colorCss);
    const soft = _mixRgb(base, rgb, 0.55);
    const deep = _mixRgb(base, rgb, 0.70);
    
    const tintGradient = `radial-gradient(circle at 30% 30%, ${_rgbToCss(soft, 0.95)}, ${_rgbToCss(deep, 0.95)}, ${_rgbToCss(deep, 0.80)})`;
    moon.style.setProperty('--moon-tint-color', tintGradient);
    moon.style.boxShadow = `0 0 60px rgba(254,249,195,0.5), 0 0 120px rgba(254,249,195,0.3), 0 0 85px ${_rgbToCss(soft, 0.45)}`;
    
    requestAnimationFrame(() => moon.style.setProperty('--moon-tint-opacity', '1'));
    
    gardenState.moonTintTimer = setTimeout(() => {
        moon.style.setProperty('--moon-tint-opacity', '0');
        moon.style.boxShadow = gardenState._moonBaseBoxShadow;
    }, 7000);
}

function _updateMoonStreak(key, colorCss) {
    if (gardenState.moonStreakKey === key) gardenState.moonStreakCount++;
    else { gardenState.moonStreakKey = key; gardenState.moonStreakCount = 1; }
    
    if (gardenState.moonStreakCount >= 3) {
        gardenState.moonStreakCount = 0; gardenState.moonStreakKey = null;
        _applyMoonFullTint(colorCss);
        addEssence(100, colorCss);
        startEssenceRain(colorCss);
    }
}

function flyFireflyToMoon(fireflyData) {
    // Note: fireflyData is the object from our master list
    if (gardenState.moonFlightActive) return false;
    const overlay = gardenState.elements?.overlay || document.getElementById('midnightGardenOverlay');
    const moon = gardenState.elements?.moon || document.getElementById('gardenMoon');
    if (!overlay || !moon) return false;
    
    gardenState.moonFlightActive = true;
    
    // Remove from simulation
    gardenState.fireflies = gardenState.fireflies.filter(f => f !== fireflyData);
    if (fireflyData.element && fireflyData.element.parentNode) fireflyData.element.parentNode.removeChild(fireflyData.element);
    
    const overlayRect = overlay.getBoundingClientRect();
    const moonRect = moon.getBoundingClientRect();
    
    // Pixel calculations for precision flight
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
        const arc = Math.sin(Math.PI * tt) * -45;
        const x = startX + dx * tt;
        const y = startY + dy * tt + arc;
        const scale = 1 - 0.35 * tt;
        
        flight.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${scale})`;
        flight.style.opacity = t < 0.75 ? 1 : (1 - (t - 0.75) / 0.25);
        
        if (t < 1) requestAnimationFrame(step);
        else {
            _applyMoonHitGlow(fireflyData.color); 
            _updateMoonStreak(String(fireflyData.family), fireflyData.color);
            if (flight.parentNode) flight.parentNode.removeChild(flight);
            setTimeout(() => { gardenState.moonFlightActive = false; }, 260);
        }
    };
    requestAnimationFrame(step);
    return true;
}

// ============================================
// AMBIENCE & WIND
// ============================================

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
    const buffer = getNoiseBuffer(ctx, 10); // Reuse buffer
    
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
    const buffer = getNoiseBuffer(ctx, 2); // Reuse
    
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
    const base = harmonics[Math.floor(Math.random() * harmonics.length)];
    const freq = base * (Math.random() < 0.25 ? 0.5 : (Math.random() < 0.35 ? 2 : 1));
    
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
    const indicator = gardenState.elements?.soundscapeIndicator || document.getElementById('soundscapeIndicator');
    if (indicator) indicator.classList.remove('active');
    
    stopSpatialAmbience();
    stopPlantBreaths();
    stopMoodCycling();
    stopWindSystem();
    // Optimization: Suspend context to save battery when not in garden
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
    
    const buffer = getNoiseBuffer(ctx, 30); // Reuse buffer
    const noiseSource = ctx.createBufferSource(); noiseSource.buffer = buffer;
    
    const filter = ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.Q.value = 1.0;
    filter.frequency.setValueAtTime(150, now);
    filter.frequency.linearRampToValueAtTime(600, now + 5);
    filter.frequency.linearRampToValueAtTime(150, now + 30);
    
    const windGain = ctx.createGain();
    windGain.gain.setValueAtTime(0, now);
    windGain.gain.linearRampToValueAtTime(0.12, now + 12);
    windGain.gain.exponentialRampToValueAtTime(0.001, now + 30);
    
    noiseSource.connect(filter); filter.connect(windGain); windGain.connect(gardenState.ambienceGain || gardenState.gainNode);
    noiseSource.start(now); noiseSource.stop(now + 30);
}

// ============================================
// ESSENCE SYSTEM REMOVED
// Keeping stub functions to prevent errors if called elsewhere
// ============================================

function getEssence() { return 0; }
function updateEssenceJarUI() { /* Removed */ }
function addEssence(amount, colorCss) { /* Removed */ }
function startEssenceRain(colorCss) { /* Removed */ }
function spendEssence() { /* Removed */ }

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
window.spendEssence = spendEssence;
/* ============================================
   MIDNIGHT GARDEN - JavaScript
   ============================================ */

// Garden state
let gardenState = {
    isOpen: false,
    fireflies: [],
    fireflySpawnInterval: null,
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
    // Current mood
    currentMood: 'contemplative', // contemplative, mysterious, tender
    moodTransitionTimer: null,
    entryTime: null,
    maxFireflies: 20
};

// Musical notes for firefly chords (frequencies in Hz)
const GARDEN_CHORDS = {
    // Each family has a unique chord feel
    0: [261.63, 329.63, 392.00],       // Ember - C major (warm)
    1: [293.66, 369.99, 440.00],       // Citrine - D major (bright)
    2: [329.63, 415.30, 493.88],       // Verdant - E major (vital)
    3: [349.23, 440.00, 523.25],       // Aqua - F major (flowing)
    4: [392.00, 493.88, 587.33],       // Azure - G major (calm)
    5: [440.00, 554.37, 659.25],       // Violet - A major (dreamy)
    6: [493.88, 622.25, 739.99],       // Rose - B major (loving)
    7: [277.18, 349.23, 415.30]        // Pearl - C# major (mysterious)
};

// Firefly family timbres - each has distinct oscillator settings
const FIREFLY_TIMBRES = {
    0: { type: 'sawtooth', filterFreq: 800, attack: 0.08, decay: 1.5, detune: 5 },      // Ember - warm, analog
    1: { type: 'sine', filterFreq: 2000, attack: 0.02, decay: 1.2, detune: 0 },         // Citrine - bright, clear
    2: { type: 'triangle', filterFreq: 1200, attack: 0.01, decay: 0.8, detune: 2 },     // Verdant - plucked, harp-like
    3: { type: 'sine', filterFreq: 3000, attack: 0.01, decay: 1.8, detune: 0 },         // Aqua - glassy, bell-like
    4: { type: 'triangle', filterFreq: 1000, attack: 0.1, decay: 2.0, detune: 3 },      // Azure - soft, calm
    5: { type: 'sine', filterFreq: 1500, attack: 0.15, decay: 2.5, detune: 8 },         // Violet - airy, reverberant
    6: { type: 'triangle', filterFreq: 1400, attack: 0.05, decay: 1.6, detune: 4 },     // Rose - tender, warm
    7: { type: 'sawtooth', filterFreq: 600, attack: 0.03, decay: 2.0, detune: 15 }      // Pearl - shimmering, dissonant
};

// Ambient note pool for plant-based soundscape
const AMBIENT_NOTES = [196.00, 220.00, 246.94, 261.63, 293.66, 329.63, 349.23, 392.00, 440.00];

// Plant harmonic frequencies based on hue ranges
const PLANT_HARMONICS = {
    red: [220.00, 277.18, 329.63],      // A, C#, E - warm
    orange: [246.94, 311.13, 369.99],   // B, D#, F#
    yellow: [261.63, 329.63, 392.00],   // C, E, G - bright
    green: [293.66, 369.99, 440.00],    // D, F#, A - vital
    cyan: [311.13, 392.00, 466.16],     // D#, G, A#
    blue: [329.63, 415.30, 493.88],     // E, G#, B - calm
    purple: [349.23, 440.00, 523.25],   // F, A, C - dreamy
    pink: [369.99, 466.16, 554.37]      // F#, A#, C# - tender
};

// Spatial ambience configurations
const AMBIENT_SOUNDS = {
    forestBreath: { minInterval: 6000, maxInterval: 12000 },
    distantOwl: { minInterval: 30000, maxInterval: 90000, chance: 0.5 },
    insectChirr: { minInterval: 4000, maxInterval: 10000, chance: 0.6 },
    leavesRustle: { minInterval: 8000, maxInterval: 20000 },
    fenceCreak: { minInterval: 25000, maxInterval: 60000, chance: 0.4 }
};

/**
 * Initialize the Midnight Garden
 */
function initMidnightGarden() {
    // Create garden stars
    createGardenStars();
    
    // Cache garden elements
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
    const starCount = 100;
    
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
        container.appendChild(star);
    }
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
    
    // Add body class
    document.body.classList.add('midnight-garden-active');
    
    // Pause rain sound if playing
    if (typeof audio !== 'undefined' && audio.stopRainSound) {
        audio.stopRainSound();
    }
    
    // Fade to black
    transition.classList.add('active');
    
    // After fade completes, show garden
    setTimeout(() => {
        // Sync moon phase from main game
        syncMoonPhase();
        
        // Render the garden plants
        renderGardenPlants();
        
        // Start ambient fireflies
        startGardenFireflies();
        
        // Show garden
        overlay.classList.add('open');
        
        // Fade transition out
        setTimeout(() => {
            transition.classList.remove('active');
        }, 300);
        
        // Start ambient soundscape after a moment
        setTimeout(() => {
            startAmbientSoundscape();
        }, 1000);
        
    }, 800);
    
    // Push history state for back button
    if (typeof pushHistoryState === 'function') {
        pushHistoryState();
    }
}

/**
 * Exit the Midnight Garden
 */
function exitMidnightGarden() {
    if (!gardenState.isOpen) return;
    
    const transition = gardenState.elements?.transition || document.getElementById('midnightTransition');
    const overlay = gardenState.elements?.overlay || document.getElementById('midnightGardenOverlay');
    
    // Stop soundscape
    stopAmbientSoundscape();
    
    // Stop firefly spawning
    stopGardenFireflies();
    
    // Fade to black
    transition.classList.add('active');
    
    setTimeout(() => {
        // Hide garden
        overlay.classList.remove('open');
        
        // Remove body class
        document.body.classList.remove('midnight-garden-active');
        
        // Calculate time spent in garden and apply to offline simulation
        if (gardenState.entryTime) {
            const timeInGarden = Date.now() - gardenState.entryTime;
            // If significant time was spent, the normal offline processing will handle it
            // since lastSave tracks when we were last active
        }
        
        // Fade transition out
        setTimeout(() => {
            transition.classList.remove('active');
            gardenState.isOpen = false;
            
            // Refresh main game UI
            if (typeof render === 'function') render();
            if (typeof updateUI === 'function') updateUI();
            
            // Resume rain sound if rain is on
            if (typeof state !== 'undefined' && state.isRainOn && typeof audio !== 'undefined' && audio.startRainSound) {
                audio.startRainSound();
            }
            
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
    
    // Get history from game state
    const history = (typeof state !== 'undefined' && state.history) ? state.history : [];
    
    if (history.length === 0) {
        // Show empty state
        const emptyDiv = document.createElement('div');
        emptyDiv.className = 'garden-empty';
        emptyDiv.innerHTML = `
            <div class="garden-empty-icon">🌱</div>
            <div class="garden-empty-text">
                No ancestors yet.<br>
                Ascend your first plant to<br>
                see it resting here.
            </div>
        `;
        container.appendChild(emptyDiv);
        
        if (subtitle) {
            subtitle.textContent = 'awaiting ancestors';
        }
        return;
    }
    
    // Update subtitle
    if (subtitle) {
        const count = history.length;
        subtitle.textContent = `${count} ancestor${count !== 1 ? 's' : ''} resting`;
    }
    
    // Render each plant from history
    history.forEach((plantData, index) => {
        const plantEl = createGardenPlant(plantData, index);
        container.appendChild(plantEl);
    });
}

/**
 * Create a single garden plant element
 */
function createGardenPlant(plantData, index) {
    const wrapper = document.createElement('div');
    wrapper.className = 'garden-plant';
    wrapper.style.setProperty('--appear-delay', `${index * 0.15}s`);
    
    // Create SVG container
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 200 250');
    svg.setAttribute('class', 'garden-plant-svg');
    
    // Add defs for patterns if needed
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    svg.appendChild(defs);
    
    // Create plant group
    const plantGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    plantGroup.setAttribute('id', `gardenPlant_${index}`);
    svg.appendChild(plantGroup);
    
    // Create pot group
    const potGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    
    // Pot body
    const potBody = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    potBody.setAttribute('d', 'M72 197 L128 197 L118 232 L82 232 Z');
    potBody.setAttribute('fill', plantData.potColor || '#e07a5f');
    potGroup.appendChild(potBody);
    
    // Pot rim
    const potRim = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    potRim.setAttribute('d', 'M68 189 L132 189 L128 199 L72 199 Z');
    potRim.setAttribute('fill', plantData.potColor || '#e07a5f');
    potRim.style.filter = 'brightness(1.1)';
    potGroup.appendChild(potRim);
    
    // Dirt
    const dirt = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
    dirt.setAttribute('cx', '100');
    dirt.setAttribute('cy', '191');
    dirt.setAttribute('rx', '24');
    dirt.setAttribute('ry', '7');
    dirt.setAttribute('fill', '#5d4037');
    potGroup.appendChild(dirt);
    
    svg.appendChild(potGroup);
    
    // Render the plant using the existing renderPlant function if available
    if (typeof renderPlant === 'function' && plantData.dna) {
        // We need to render to a temporary container, then move
        const tempId = `tempGardenPlant_${index}_${Date.now()}`;
        plantGroup.setAttribute('id', tempId);
        
        // Append to DOM temporarily
        document.body.appendChild(svg);
        
        renderPlant(tempId, plantData.dna, plantData.stage || 5, plantData.scars || []);
        
        // Remove from temp location
        document.body.removeChild(svg);
    }
    
    wrapper.appendChild(svg);
    
    // Plant name
    const nameEl = document.createElement('div');
    nameEl.className = 'garden-plant-name';
    nameEl.textContent = plantData.name || 'Unknown';
    wrapper.appendChild(nameEl);
    
    // Generation badge
    const genEl = document.createElement('div');
    genEl.className = 'garden-plant-gen';
    genEl.textContent = `Cycle ${plantData.gen || 1}`;
    wrapper.appendChild(genEl);
    
    // Click handler for plant details (could expand later)
    wrapper.addEventListener('click', () => {
        showGardenPlantDetail(plantData, index);
    });
    
    return wrapper;
}

/**
 * Show plant detail and play its unique tone when tapped
 */
function showGardenPlantDetail(plantData, index) {
    const plantEl = document.querySelectorAll('.garden-plant')[index];
    
    // Visual feedback - gentle pulse
    if (plantEl) {
        plantEl.style.transition = 'transform 0.3s ease';
        plantEl.style.transform = 'scale(1.08) translateY(-8px)';
        setTimeout(() => {
            plantEl.style.transform = '';
        }, 300);
    }
    
    // Play the plant's unique sound based on its traits
    playPlantSound(plantData);
}

/**
 * Play a plant's unique sound based on its DNA
 */
function playPlantSound(plantData) {
    initGardenAudio();
    if (!gardenState.audioContext) return;
    
    if (gardenState.audioContext.state === 'suspended') {
        gardenState.audioContext.resume();
    }
    
    const ctx = gardenState.audioContext;
    const now = ctx.currentTime;
    const dna = plantData.dna || {};
    
    // Determine base note from flower/leaf hue
    const hue = dna.flowerH || dna.colorH || 0;
    const harmonics = getHarmonicsForHue(hue);
    const baseNote = harmonics[0];
    
    // Determine timbre based on stage
    const stage = plantData.stage || 3;
    const oscType = stage >= 5 ? 'sine' : stage >= 3 ? 'triangle' : 'sine';
    
    // Determine character based on scars
    const scars = plantData.scars || [];
    const detuneAmount = scars.length * 6;
    const hasScars = scars.length > 0;
    
    // Play a soft chord unique to this plant
    const notes = [
        baseNote,
        baseNote * 1.25,  // Major third
        baseNote * 1.5    // Perfect fifth
    ];
    
    notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        osc.type = oscType;
        osc.frequency.value = freq;
        osc.detune.value = detuneAmount + (Math.random() - 0.5) * 4;
        
        // Filter - brighter for flourishing plants
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 800 + (stage * 200);
        filter.Q.value = hasScars ? 2 : 1;
        
        // Gain envelope
        const gain = ctx.createGain();
        const noteStart = now + i * 0.08;
        gain.gain.setValueAtTime(0, noteStart);
        gain.gain.linearRampToValueAtTime(0.12 - (i * 0.02), noteStart + 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, noteStart + 2);
        
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(gardenState.musicalGain);
        
        osc.start(noteStart);
        osc.stop(noteStart + 2.5);
    });
    
    // Add a soft reverb tail for flourishing plants
    if (stage >= 5) {
        setTimeout(() => {
            const tailOsc = ctx.createOscillator();
            tailOsc.type = 'sine';
            tailOsc.frequency.value = baseNote * 2;
            
            const tailGain = ctx.createGain();
            tailGain.gain.setValueAtTime(0, ctx.currentTime);
            tailGain.gain.linearRampToValueAtTime(0.04, ctx.currentTime + 0.2);
            tailGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 3);
            
            tailOsc.connect(tailGain);
            tailGain.connect(gardenState.musicalGain);
            
            tailOsc.start(ctx.currentTime);
            tailOsc.stop(ctx.currentTime + 3.5);
        }, 200);
    }
}

/**
 * Start spawning ambient fireflies
 */
function startGardenFireflies() {
    const container = gardenState.elements?.firefliesContainer || document.getElementById('gardenFireflies');
    if (!container) return;
    
    // Clear existing
    container.innerHTML = '';
    gardenState.fireflies = [];
    
    // Get firefly inventory from game state
    const fireflyInventory = (typeof state !== 'undefined' && state.fireflies) ? state.fireflies : {};
    
    // Calculate total owned fireflies
    let totalOwned = 0;
    const ownedFamilies = [];
    
    for (let i = 0; i < 8; i++) {
        const count = fireflyInventory[i] || 0;
        if (count > 0) {
            totalOwned += count;
            ownedFamilies.push(i);
        }
    }
    
    // If player has no fireflies, don't spawn any
    if (totalOwned === 0 || ownedFamilies.length === 0) {
        return;
    }
    
    // Calculate how many to show (capped, scaled to inventory)
    const maxVisible = Math.min(gardenState.maxFireflies, Math.ceil(totalOwned / 2));
    
    // Spawn initial batch spread across owned families
    const initialCount = Math.min(maxVisible, Math.max(3, Math.floor(maxVisible * 0.6)));
    
    for (let i = 0; i < initialCount; i++) {
        // Weight selection towards families with more fireflies
        const famIndex = weightedFamilySelection(fireflyInventory, ownedFamilies);
        spawnGardenFirefly(famIndex, container);
    }
    
    // Continuous spawn interval to rotate fireflies in and out
    gardenState.fireflySpawnInterval = setInterval(() => {
        if (!gardenState.isOpen) return;
        
        // Clean up dead fireflies from tracking
        gardenState.fireflies = gardenState.fireflies.filter(ff => ff.element && ff.element.parentNode);
        
        // Only spawn if below cap and player has fireflies
        if (gardenState.fireflies.length < maxVisible && ownedFamilies.length > 0) {
            const famIndex = weightedFamilySelection(fireflyInventory, ownedFamilies);
            spawnGardenFirefly(famIndex, container);
        }
        
    }, 4000 + Math.random() * 3000); // Varied interval for natural feel
}

/**
 * Select a family weighted by inventory count
 */
function weightedFamilySelection(inventory, ownedFamilies) {
    let totalWeight = 0;
    for (const fam of ownedFamilies) {
        totalWeight += inventory[fam] || 0;
    }
    
    let random = Math.random() * totalWeight;
    for (const fam of ownedFamilies) {
        random -= inventory[fam] || 0;
        if (random <= 0) {
            return fam;
        }
    }
    
    return ownedFamilies[0];
}

/**
 * Spawn a single garden firefly
 */
function spawnGardenFirefly(familyIndex, container) {
    const ff = document.createElement('div');
    ff.className = 'garden-firefly';
    
    // Get color from family
    const color = typeof getFireflyColor === 'function' 
        ? getFireflyColor(familyIndex)
        : `hsl(${[15, 45, 120, 180, 210, 270, 330, 0][familyIndex]}, 70%, 60%)`;
    
    // Random starting position (as percentages)
    let posX = 10 + Math.random() * 80;
    let posY = 15 + Math.random() * 55;
    
    // Random animation parameters
    const glowDur = 2 + Math.random() * 2;
    const lifeDur = 25 + Math.random() * 20; // 25-45 seconds lifespan
    
    ff.style.cssText = `
        left: ${posX}%;
        top: ${posY}%;
        background: ${color};
        --ff-color: ${color};
        --glow-dur: ${glowDur}s;
        --life: ${lifeDur}s;
    `;
    
    ff.dataset.family = familyIndex;
    
    // Tap handler - play chord
    const handleTap = (e) => {
        e.preventDefault();
        e.stopPropagation();
        playFireflyChord(familyIndex);
    };
    
    ff.addEventListener('click', handleTap);
    ff.addEventListener('touchend', handleTap, { passive: false });
    
    container.appendChild(ff);
    
    // Movement state
    const moveState = {
        x: posX,
        y: posY,
        targetX: posX,
        targetY: posY,
        velX: 0,
        velY: 0,
        timeToNewTarget: 0
    };
    
    // Animation loop for smooth movement
    let animationId = null;
    let lastTime = performance.now();
    
    const animateFirefly = (currentTime) => {
        if (!ff.parentNode || !gardenState.isOpen) {
            cancelAnimationFrame(animationId);
            return;
        }
        
        const deltaTime = (currentTime - lastTime) / 1000;
        lastTime = currentTime;
        
        // Update time to new target
        moveState.timeToNewTarget -= deltaTime;
        
        // Pick new target periodically
        if (moveState.timeToNewTarget <= 0) {
            // New random target - very small movements from current position
            moveState.targetX = moveState.x + (Math.random() - 0.5) * 8;
            moveState.targetY = moveState.y + (Math.random() - 0.5) * 5;
            // Clamp target to bounds
            moveState.targetX = Math.max(5, Math.min(95, moveState.targetX));
            moveState.targetY = Math.max(10, Math.min(65, moveState.targetY));
            moveState.timeToNewTarget = 8 + Math.random() * 12; // New target every 8-20 seconds
        }
        
        // Extremely slow, gentle movement towards target
        const dx = moveState.targetX - moveState.x;
        const dy = moveState.targetY - moveState.y;
        
        // Tiny wobble
        const wobbleX = Math.sin(currentTime * 0.0003 + familyIndex) * 0.003;
        const wobbleY = Math.cos(currentTime * 0.00025 + familyIndex) * 0.002;
        
        // Tiny acceleration
        moveState.velX += (dx * 0.0008 * deltaTime + wobbleX);
        moveState.velY += (dy * 0.0008 * deltaTime + wobbleY);
        
        // Heavy damping for very slow, floaty movement
        moveState.velX *= 0.995;
        moveState.velY *= 0.995;
        
        // Clamp velocity to very slow max speed
        const maxSpeed = 0.02;
        const speed = Math.sqrt(moveState.velX * moveState.velX + moveState.velY * moveState.velY);
        if (speed > maxSpeed) {
            moveState.velX = (moveState.velX / speed) * maxSpeed;
            moveState.velY = (moveState.velY / speed) * maxSpeed;
        }
        
        // Update position
        moveState.x += moveState.velX;
        moveState.y += moveState.velY;
        
        // Clamp to bounds
        moveState.x = Math.max(2, Math.min(98, moveState.x));
        moveState.y = Math.max(5, Math.min(70, moveState.y));
        
        // Apply position
        ff.style.left = moveState.x + '%';
        ff.style.top = moveState.y + '%';
        
        animationId = requestAnimationFrame(animateFirefly);
    };
    
    // Start movement animation
    animationId = requestAnimationFrame(animateFirefly);
    
    // Track firefly
    const fireflyData = {
        element: ff,
        family: familyIndex,
        spawnTime: Date.now(),
        animationId: animationId
    };
    gardenState.fireflies.push(fireflyData);
    
    // Remove after life cycle (graceful fade is handled by CSS animation)
    setTimeout(() => {
        if (animationId) {
            cancelAnimationFrame(animationId);
        }
        if (ff.parentNode) {
            ff.remove();
        }
        // Remove from tracking
        gardenState.fireflies = gardenState.fireflies.filter(f => f.element !== ff);
    }, lifeDur * 1000);
}

/**
 * Stop garden fireflies
 */
function stopGardenFireflies() {
    if (gardenState.fireflySpawnInterval) {
        clearInterval(gardenState.fireflySpawnInterval);
        gardenState.fireflySpawnInterval = null;
    }
    
    // Cancel all animation frames
    gardenState.fireflies.forEach(ff => {
        if (ff.animationId) {
            cancelAnimationFrame(ff.animationId);
        }
    });
    
    gardenState.fireflies = [];
}

/**
 * Initialize Web Audio API for garden sounds with layered architecture
 */
function initGardenAudio() {
    if (gardenState.audioContext) return;
    
    try {
        gardenState.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // Master gain
        gardenState.gainNode = gardenState.audioContext.createGain();
        gardenState.gainNode.gain.value = 0.2;
        gardenState.gainNode.connect(gardenState.audioContext.destination);
        
        // Layer A: Spatial Ambience (place) - lowest volume
        gardenState.ambienceGain = gardenState.audioContext.createGain();
        gardenState.ambienceGain.gain.value = 0.4;
        gardenState.ambienceGain.connect(gardenState.gainNode);
        
        // Layer B: Reactive Musical (fireflies) - medium volume
        gardenState.musicalGain = gardenState.audioContext.createGain();
        gardenState.musicalGain.gain.value = 0.7;
        gardenState.musicalGain.connect(gardenState.gainNode);
        
        // Layer C: Emergent Plant Layer - subtle background
        gardenState.plantGain = gardenState.audioContext.createGain();
        gardenState.plantGain.gain.value = 0.3;
        gardenState.plantGain.connect(gardenState.gainNode);
        
    } catch (e) {
        console.warn('Garden audio not available:', e);
    }
}

/**
 * Play a firefly chord when tapped - with family-specific timbre
 */
function playFireflyChord(familyIndex) {
    initGardenAudio();
    if (!gardenState.audioContext) return;
    
    // Resume audio context if suspended (mobile browsers)
    if (gardenState.audioContext.state === 'suspended') {
        gardenState.audioContext.resume();
    }
    
    const chord = GARDEN_CHORDS[familyIndex] || GARDEN_CHORDS[0];
    const timbre = FIREFLY_TIMBRES[familyIndex] || FIREFLY_TIMBRES[0];
    const ctx = gardenState.audioContext;
    const now = ctx.currentTime;
    
    chord.forEach((freq, i) => {
        // Main oscillator with family-specific type
        const osc = ctx.createOscillator();
        osc.type = timbre.type;
        osc.frequency.value = freq;
        osc.detune.value = (Math.random() - 0.5) * timbre.detune;
        
        // Filter for tonal shaping
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = timbre.filterFreq;
        filter.Q.value = 1;
        
        // Gain envelope
        const noteGain = ctx.createGain();
        noteGain.gain.setValueAtTime(0, now);
        noteGain.gain.linearRampToValueAtTime(0.15 - (i * 0.02), now + timbre.attack);
        noteGain.gain.exponentialRampToValueAtTime(0.001, now + timbre.decay);
        
        // Connect: osc -> filter -> gain -> musical layer
        osc.connect(filter);
        filter.connect(noteGain);
        noteGain.connect(gardenState.musicalGain);
        
        osc.start(now + i * 0.03); // Slight arpeggio
        osc.stop(now + timbre.decay + 0.5);
    });
    
    // Add subtle reverb tail for Violet family
    if (familyIndex === 5) {
        playReverbTail(chord[0], 0.05, 3);
    }
}

/**
 * Play a reverb-like tail (for dreamy sounds)
 */
function playReverbTail(baseFreq, volume, duration) {
    const ctx = gardenState.audioContext;
    const now = ctx.currentTime;
    
    for (let i = 0; i < 3; i++) {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = baseFreq * (1 + i * 0.002);
        
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(volume / (i + 1), now + 0.3 + i * 0.2);
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration + i * 0.5);
        
        osc.connect(gain);
        gain.connect(gardenState.musicalGain);
        
        osc.start(now + i * 0.1);
        osc.stop(now + duration + i * 0.5 + 0.5);
    }
}

/**
 * Play a single garden note
 */
function playGardenNote(frequency, volume = 0.1, duration = 1, destination = null) {
    initGardenAudio();
    if (!gardenState.audioContext) return;
    
    if (gardenState.audioContext.state === 'suspended') {
        gardenState.audioContext.resume();
    }
    
    const ctx = gardenState.audioContext;
    const now = ctx.currentTime;
    const dest = destination || gardenState.musicalGain;
    
    const osc = ctx.createOscillator();
    const noteGain = ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.value = frequency;
    
    noteGain.gain.setValueAtTime(0, now);
    noteGain.gain.linearRampToValueAtTime(volume, now + 0.1);
    noteGain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    
    osc.connect(noteGain);
    noteGain.connect(dest);
    
    osc.start(now);
    osc.stop(now + duration + 0.1);
}

// ============================================
// LAYER A: SPATIAL AMBIENCE (Place)
// ============================================

/**
 * Start all ambient environmental sounds
 */
function startSpatialAmbience() {
    initGardenAudio();
    if (!gardenState.audioContext) return;
    
    // Start forest breath (continuous filtered noise)
    startForestBreath();
    
    // Schedule periodic ambient sounds
    scheduleAmbientSound('distantOwl', playDistantOwl);
    scheduleAmbientSound('insectChirr', playInsectChirr);
    scheduleAmbientSound('leavesRustle', playLeavesRustle);
    scheduleAmbientSound('fenceCreak', playFenceCreak);
}

/**
 * Stop all ambient sounds
 */
function stopSpatialAmbience() {
    // Clear all ambient timers
    Object.keys(gardenState.ambientTimers).forEach(key => {
        clearTimeout(gardenState.ambientTimers[key]);
    });
    gardenState.ambientTimers = {};
}

/**
 * Schedule a recurring ambient sound
 */
function scheduleAmbientSound(soundName, playFunction) {
    const config = AMBIENT_SOUNDS[soundName];
    if (!config) return;
    
    const schedule = () => {
        if (!gardenState.isOpen || !gardenState.soundscapeActive) return;
        
        // Check chance if specified
        if (!config.chance || Math.random() < config.chance) {
            playFunction();
        }
        
        // Schedule next occurrence
        const delay = config.minInterval + Math.random() * (config.maxInterval - config.minInterval);
        gardenState.ambientTimers[soundName] = setTimeout(schedule, delay);
    };
    
    // Initial delay before first sound - shorter for faster feedback
    const initialDelay = 1000 + Math.random() * (config.minInterval * 0.5);
    gardenState.ambientTimers[soundName] = setTimeout(schedule, initialDelay);
}

/**
 * Forest breath - continuous low filtered noise that swells and falls
 */
function startForestBreath() {
    const ctx = gardenState.audioContext;
    if (!ctx) return;
    
    // Create noise buffer (longer for continuous sound)
    const bufferSize = ctx.sampleRate * 10;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    
    for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
    }
    
    const playBreath = () => {
        if (!gardenState.isOpen || !gardenState.soundscapeActive) return;
        
        const now = ctx.currentTime;
        const duration = 6 + Math.random() * 4;
        
        const noiseSource = ctx.createBufferSource();
        noiseSource.buffer = noiseBuffer;
        
        // Very low filter for rumble
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 150;
        filter.Q.value = 0.5;
        
        // Gentle swell envelope - boosted volume
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.08, now + duration * 0.3);
        gain.gain.linearRampToValueAtTime(0.12, now + duration * 0.5);
        gain.gain.linearRampToValueAtTime(0.06, now + duration * 0.8);
        gain.gain.linearRampToValueAtTime(0, now + duration);
        
        noiseSource.connect(filter);
        filter.connect(gain);
        gain.connect(gardenState.ambienceGain);
        
        noiseSource.start(now);
        noiseSource.stop(now + duration);
        
        // Schedule next breath
        gardenState.ambientTimers.forestBreath = setTimeout(playBreath, (duration + 2 + Math.random() * 3) * 1000);
    };
    
    // Start after short delay
    gardenState.ambientTimers.forestBreath = setTimeout(playBreath, 500);
}

/**
 * Distant owl hoot - very rare, atmospheric
 */
function playDistantOwl() {
    const ctx = gardenState.audioContext;
    if (!ctx) return;
    
    const now = ctx.currentTime;
    const baseFreq = 280 + Math.random() * 40;
    
    // Two-note owl call
    [0, 0.6].forEach((delay, i) => {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(baseFreq * (i === 0 ? 1 : 0.85), now + delay);
        
        const gain = ctx.createGain();
        const noteStart = now + delay;
        gain.gain.setValueAtTime(0, noteStart);
        gain.gain.linearRampToValueAtTime(0.12, noteStart + 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, noteStart + 0.8);
        
        // Filter to make it sound distant
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 600;
        
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(gardenState.ambienceGain);
        
        osc.start(noteStart);
        osc.stop(noteStart + 1);
    });
}

/**
 * Insect chirr - sparse cricket-like sounds
 */
function playInsectChirr() {
    const ctx = gardenState.audioContext;
    if (!ctx) return;
    
    const now = ctx.currentTime;
    const baseFreq = 3000 + Math.random() * 1500;
    const chirps = 2 + Math.floor(Math.random() * 4);
    
    for (let i = 0; i < chirps; i++) {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = baseFreq + Math.random() * 200;
        
        const gain = ctx.createGain();
        const chirpTime = now + i * 0.08;
        gain.gain.setValueAtTime(0, chirpTime);
        gain.gain.linearRampToValueAtTime(0.06, chirpTime + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, chirpTime + 0.05);
        
        osc.connect(gain);
        gain.connect(gardenState.ambienceGain);
        
        osc.start(chirpTime);
        osc.stop(chirpTime + 0.1);
    }
}

/**
 * Leaves rustling - filtered noise burst
 */
function playLeavesRustle() {
    const ctx = gardenState.audioContext;
    if (!ctx) return;
    
    const now = ctx.currentTime;
    const duration = 0.8 + Math.random() * 0.6;
    
    // Create noise
    const bufferSize = ctx.sampleRate * duration;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    
    for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
    }
    
    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    
    // Bandpass filter for leafy texture
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 2000 + Math.random() * 1000;
    filter.Q.value = 0.8;
    
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.08, now + 0.05);
    gain.gain.linearRampToValueAtTime(0.12, now + duration * 0.3);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    
    noiseSource.connect(filter);
    filter.connect(gain);
    gain.connect(gardenState.ambienceGain);
    
    noiseSource.start(now);
    noiseSource.stop(now + duration);
}

/**
 * Fence creak - low wooden sound
 */
function playFenceCreak() {
    const ctx = gardenState.audioContext;
    if (!ctx) return;
    
    const now = ctx.currentTime;
    const baseFreq = 80 + Math.random() * 40;
    
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.linearRampToValueAtTime(baseFreq * 0.7, now + 0.3);
    
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 300;
    filter.Q.value = 2;
    
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.10, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(gardenState.ambienceGain);
    
    osc.start(now);
    osc.stop(now + 0.5);
}

// ============================================
// LAYER C: EMERGENT PLANT LAYER
// ============================================

/**
 * Start plant harmonic drones based on ancestors
 */
function startPlantHarmonics() {
    const history = (typeof state !== 'undefined' && state.history) ? state.history : [];
    if (history.length === 0) return;
    
    initGardenAudio();
    if (!gardenState.audioContext) return;
    
    const ctx = gardenState.audioContext;
    
    // Stop any existing drones
    stopPlantHarmonics();
    
    // Create a drone for each plant (up to 8 to avoid audio overload)
    const plantsToSound = history.slice(0, 8);
    
    plantsToSound.forEach((plant, index) => {
        const drone = createPlantDrone(plant, index, plantsToSound.length);
        if (drone) {
            gardenState.plantDrones.push(drone);
        }
    });
}

/**
 * Create a harmonic drone for a single plant
 */
function createPlantDrone(plant, index, totalPlants) {
    const ctx = gardenState.audioContext;
    if (!ctx) return null;
    
    // Determine harmonic based on plant color
    const hue = plant.dna?.flowerH || plant.dna?.colorH || 0;
    const harmonics = getHarmonicsForHue(hue);
    const baseNote = harmonics[index % harmonics.length];
    
    // Adjust for scars - slightly detune scarred plants
    let detune = 0;
    if (plant.scars && plant.scars.length > 0) {
        detune = plant.scars.length * 8; // More scars = more detuned
    }
    
    // Adjust volume based on stage (flourishing = brighter)
    const stageMultiplier = plant.stage ? (0.6 + (plant.stage / 6) * 0.4) : 0.8;
    const volumePerPlant = 0.06 / Math.sqrt(totalPlants); // Scale down with more plants
    
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = baseNote;
    osc.detune.value = detune;
    
    // Very slow LFO for subtle movement
    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.05 + Math.random() * 0.05; // Very slow
    
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 3 + Math.random() * 2; // Subtle pitch wobble
    
    lfo.connect(lfoGain);
    lfoGain.connect(osc.detune);
    
    // Main gain with slow swell
    const gain = ctx.createGain();
    gain.gain.value = 0;
    
    // Fade in over several seconds
    const now = ctx.currentTime;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(volumePerPlant * stageMultiplier, now + 3 + index * 0.5);
    
    osc.connect(gain);
    gain.connect(gardenState.plantGain);
    
    osc.start(now);
    lfo.start(now);
    
    return { osc, lfo, gain };
}

/**
 * Get harmonic frequencies based on hue
 */
function getHarmonicsForHue(hue) {
    if (hue < 30) return PLANT_HARMONICS.red;
    if (hue < 60) return PLANT_HARMONICS.orange;
    if (hue < 90) return PLANT_HARMONICS.yellow;
    if (hue < 150) return PLANT_HARMONICS.green;
    if (hue < 200) return PLANT_HARMONICS.cyan;
    if (hue < 260) return PLANT_HARMONICS.blue;
    if (hue < 320) return PLANT_HARMONICS.purple;
    return PLANT_HARMONICS.pink;
}

/**
 * Stop all plant harmonic drones
 */
function stopPlantHarmonics() {
    const ctx = gardenState.audioContext;
    if (!ctx) return;
    
    const now = ctx.currentTime;
    
    gardenState.plantDrones.forEach(drone => {
        if (drone.gain) {
            drone.gain.gain.linearRampToValueAtTime(0, now + 2);
        }
        setTimeout(() => {
            try {
                drone.osc?.stop();
                drone.lfo?.stop();
            } catch (e) {}
        }, 2500);
    });
    
    gardenState.plantDrones = [];
}

// ============================================
// MOOD SYSTEM
// ============================================

/**
 * Set the garden mood - affects all audio layers
 */
function setGardenMood(mood) {
    if (!gardenState.audioContext) return;
    
    gardenState.currentMood = mood;
    const now = gardenState.audioContext.currentTime;
    
    switch (mood) {
        case 'contemplative':
            // Default - balanced, soft
            gardenState.ambienceGain?.gain.linearRampToValueAtTime(0.4, now + 2);
            gardenState.musicalGain?.gain.linearRampToValueAtTime(0.7, now + 2);
            gardenState.plantGain?.gain.linearRampToValueAtTime(0.3, now + 2);
            break;
            
        case 'mysterious':
            // Darker, more space, quieter
            gardenState.ambienceGain?.gain.linearRampToValueAtTime(0.5, now + 2);
            gardenState.musicalGain?.gain.linearRampToValueAtTime(0.4, now + 2);
            gardenState.plantGain?.gain.linearRampToValueAtTime(0.2, now + 2);
            break;
            
        case 'tender':
            // Warmer, fuller
            gardenState.ambienceGain?.gain.linearRampToValueAtTime(0.3, now + 2);
            gardenState.musicalGain?.gain.linearRampToValueAtTime(0.8, now + 2);
            gardenState.plantGain?.gain.linearRampToValueAtTime(0.45, now + 2);
            break;
    }
}

/**
 * Start mood cycling - subtle shifts over time
 */
function startMoodCycling() {
    const moods = ['contemplative', 'mysterious', 'tender'];
    
    const cycleMood = () => {
        if (!gardenState.isOpen || !gardenState.soundscapeActive) return;
        
        // Random mood shift
        const newMood = moods[Math.floor(Math.random() * moods.length)];
        setGardenMood(newMood);
        
        // Next shift in 60-180 seconds
        const nextDelay = 60000 + Math.random() * 120000;
        gardenState.moodTransitionTimer = setTimeout(cycleMood, nextDelay);
    };
    
    // First mood shift after 45-90 seconds
    gardenState.moodTransitionTimer = setTimeout(cycleMood, 45000 + Math.random() * 45000);
}

/**
 * Stop mood cycling
 */
function stopMoodCycling() {
    if (gardenState.moodTransitionTimer) {
        clearTimeout(gardenState.moodTransitionTimer);
        gardenState.moodTransitionTimer = null;
    }
}

/**
 * Start ambient soundscape - all three layers
 */
function startAmbientSoundscape() {
    if (gardenState.soundscapeActive) return;
    
    initGardenAudio();
    if (!gardenState.audioContext) return;
    
    // Resume audio context if needed
    if (gardenState.audioContext.state === 'suspended') {
        gardenState.audioContext.resume();
    }
    
    const indicator = gardenState.elements?.soundscapeIndicator || document.getElementById('soundscapeIndicator');
    
    gardenState.soundscapeActive = true;
    
    if (indicator) {
        indicator.classList.add('active');
    }
    
    // Layer A: Spatial Ambience
    startSpatialAmbience();
    
    // Layer C: Plant Harmonics
    startPlantHarmonics();
    
    // Start mood cycling
    startMoodCycling();
    
    // Start wind system
    startWindSystem();
}

/**
 * Stop ambient soundscape - all layers
 */
function stopAmbientSoundscape() {
    gardenState.soundscapeActive = false;
    
    const indicator = gardenState.elements?.soundscapeIndicator || document.getElementById('soundscapeIndicator');
    if (indicator) {
        indicator.classList.remove('active');
    }
    
    // Stop all layers
    stopSpatialAmbience();
    stopPlantHarmonics();
    stopMoodCycling();
    stopWindSystem();
    
    if (gardenState.ambientInterval) {
        clearInterval(gardenState.ambientInterval);
        gardenState.ambientInterval = null;
    }
}

/**
 * Start the wind system
 */
function startWindSystem() {
    if (gardenState.windInterval) return;
    
    // Schedule random wind gusts
    scheduleNextWindGust();
}

/**
 * Schedule the next wind gust
 */
function scheduleNextWindGust() {
    if (!gardenState.isOpen) return;
    
    // Random interval between gusts: 8-20 seconds
    const delay = 8000 + Math.random() * 12000;
    
    gardenState.windInterval = setTimeout(() => {
        if (gardenState.isOpen) {
            triggerWindGust();
            scheduleNextWindGust();
        }
    }, delay);
}

/**
 * Stop the wind system
 */
function stopWindSystem() {
    if (gardenState.windInterval) {
        clearTimeout(gardenState.windInterval);
        gardenState.windInterval = null;
    }
}

/**
 * Trigger a wind gust - plays sound
 */
function triggerWindGust() {
    // Play wind sound
    playWindSound();
}

/**
 * Play wind sound using filtered white noise
 */
function playWindSound() {
    initGardenAudio();
    if (!gardenState.audioContext) return;
    
    if (gardenState.audioContext.state === 'suspended') {
        gardenState.audioContext.resume();
    }
    
    const ctx = gardenState.audioContext;
    const now = ctx.currentTime;
    
    // Duration of the wind gust - long rolling gust
    const gustDuration = 30;
    
    // Create white noise buffer
    const bufferSize = ctx.sampleRate * gustDuration;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    
    for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
    }
    
    // Create noise source
    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    
    // Create lowpass filter for wind character
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.Q.value = 1.0;
    
    // Animate the filter cutoff for rolling "whooshing" effect
    filter.frequency.setValueAtTime(150, now);
    filter.frequency.linearRampToValueAtTime(350, now + 2);
    filter.frequency.linearRampToValueAtTime(600, now + 5);
    filter.frequency.linearRampToValueAtTime(400, now + 8);
    filter.frequency.linearRampToValueAtTime(750, now + 12);
    filter.frequency.linearRampToValueAtTime(500, now + 16);
    filter.frequency.linearRampToValueAtTime(700, now + 20);
    filter.frequency.linearRampToValueAtTime(450, now + 24);
    filter.frequency.linearRampToValueAtTime(300, now + 27);
    filter.frequency.linearRampToValueAtTime(150, now + 30);
    
    // Create gain envelope for volume - gentle waves
    const windGain = ctx.createGain();
    windGain.gain.setValueAtTime(0, now);
    windGain.gain.linearRampToValueAtTime(0.07, now + 2);
    windGain.gain.linearRampToValueAtTime(0.10, now + 5);
    windGain.gain.linearRampToValueAtTime(0.06, now + 8);
    windGain.gain.linearRampToValueAtTime(0.12, now + 12);
    windGain.gain.linearRampToValueAtTime(0.07, now + 16);
    windGain.gain.linearRampToValueAtTime(0.11, now + 20);
    windGain.gain.linearRampToValueAtTime(0.08, now + 24);
    windGain.gain.linearRampToValueAtTime(0.05, now + 27);
    windGain.gain.exponentialRampToValueAtTime(0.001, now + 30);
    
    // Connect the chain: noise -> filter -> gain -> ambience layer
    noiseSource.connect(filter);
    filter.connect(windGain);
    windGain.connect(gardenState.ambienceGain || gardenState.gainNode);
    
    // Start and stop
    noiseSource.start(now);
    noiseSource.stop(now + gustDuration);
}

/**
 * Handle back button for garden
 */
function handleGardenBack(e) {
    if (gardenState.isOpen) {
        exitMidnightGarden();
        return true;
    }
    return false;
}

// Integrate with existing back button handler
const originalHandleBackButton = typeof handleBackButton === 'function' ? handleBackButton : null;

window.handleBackButtonGarden = function(e) {
    if (gardenState.isOpen) {
        exitMidnightGarden();
        e.preventDefault();
        return;
    }
    if (originalHandleBackButton) {
        originalHandleBackButton(e);
    }
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMidnightGarden);
} else {
    // Small delay to ensure other scripts have loaded
    setTimeout(initMidnightGarden, 100);
}

// Export for use in main game
window.enterMidnightGarden = enterMidnightGarden;
window.exitMidnightGarden = exitMidnightGarden;
window.triggerWindGust = triggerWindGust;
window.setGardenMood = setGardenMood;
window.gardenState = gardenState;

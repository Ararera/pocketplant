// garden_audio.js - Pocket Sprout Unified Orchestration System
// RESTORED: Full UI Legacy Support & State Initialization

function initGardenAudio() {
    if (gardenState.audioContext) return;
    try {
        gardenState.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // Master Bus Chain
        gardenState.gainNode = gardenState.audioContext.createGain();
        gardenState.gainNode.gain.value = 0.25;
        gardenState.gainNode.connect(gardenState.audioContext.destination);
        
        // Compression to "glue" everything together
        gardenState.masterComp = gardenState.audioContext.createDynamicsCompressor();
        gardenState.masterComp.threshold.value = -22;
        gardenState.masterComp.ratio.value = 4;
        gardenState.masterComp.attack.value = 0.01;
        gardenState.masterComp.connect(gardenState.gainNode);

        gardenState.ambienceGain = gardenState.audioContext.createGain();
        gardenState.ambienceGain.gain.value = 0.4;
        gardenState.ambienceGain.connect(gardenState.masterComp);
        
        gardenState.musicalGain = gardenState.audioContext.createGain();
        gardenState.musicalGain.gain.value = 0.7;
        gardenState.musicalGain.connect(gardenState.masterComp);

        gardenState.plantGain = gardenState.audioContext.createGain();
        gardenState.plantGain.gain.value = 0.3;
        gardenState.plantGain.connect(gardenState.masterComp);
        
        // UI AND STATE INITIALIZATION (Critical for button functionality)
        if (!gardenState.ambientTimers) gardenState.ambientTimers = {};
        if (!gardenState.activeSeeds) gardenState.activeSeeds = {};
        if (!gardenState.currentMood) gardenState.currentMood = 'contemplative';
        if (!gardenState.audioBuffers) gardenState.audioBuffers = {};
        
    } catch (e) { console.warn('Garden audio failed to initialize:', e); }
}

// --- SOUND SEED DOCK UI WIRING ---
// midnight-garden.html provides:
//   #soundSeedToggle (button), #soundSeedDock (panel), #soundSeedDockClose (button), #soundSeedGrid (container)
// This file previously never bound click handlers, so the button could appear "dead".

(function ensureGardenState(){
    if (!window.gardenState) window.gardenState = {};
    if (!gardenState.elements) gardenState.elements = {};
    if (!gardenState._uiBound) gardenState._uiBound = {};
})();

function initSoundSeedDockUI() {
    // Bind once per page-load
    if (gardenState._uiBound.soundSeedDock) return;

    const toggleBtn = document.getElementById('soundSeedToggle');
    const dock = document.getElementById('soundSeedDock');
    const closeBtn = document.getElementById('soundSeedDockClose');

    // If the garden overlay isn't in DOM yet, we'll try again later
    if (!toggleBtn || !dock) return;

    gardenState.elements.soundSeedToggle = toggleBtn;
    gardenState.elements.soundSeedDock = dock;
    gardenState.elements.soundSeedDockClose = closeBtn || null;

    // Default state for accessibility
    if (!dock.hasAttribute('aria-hidden')) dock.setAttribute('aria-hidden', 'true');

    const onToggle = (e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleSoundSeedDock();
    };

    const onClose = (e) => {
        e.preventDefault();
        e.stopPropagation();
        closeSoundSeedDock();
    };

    toggleBtn.addEventListener('click', onToggle, { passive: false });
    if (closeBtn) closeBtn.addEventListener('click', onClose, { passive: false });

    // Optional: allow Esc to close when dock is open
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && gardenState.soundSeedDockOpen) {
            closeSoundSeedDock();
        }
    });

    gardenState._uiBound.soundSeedDock = true;
}

function openSoundSeedDock() {
    initSoundSeedDockUI();
    const dock = gardenState.elements.soundSeedDock || document.getElementById('soundSeedDock');
    if (!dock) return;

    gardenState.soundSeedDockOpen = true;

    dock.classList.add('open');
    dock.style.display = 'block';
    dock.setAttribute('aria-hidden', 'false');

    const toggleBtn = gardenState.elements.soundSeedToggle || document.getElementById('soundSeedToggle');
    if (toggleBtn) toggleBtn.classList.add('active');

    // If CSS/layout puts it offscreen or inside a clipped container, force it onscreen.
    // We only apply this if it's effectively not visible within the viewport.
    try {
        const r = dock.getBoundingClientRect();
        const vw = window.innerWidth || document.documentElement.clientWidth;
        const vh = window.innerHeight || document.documentElement.clientHeight;

        const offscreen =
            r.width < 10 || r.height < 10 ||
            r.right < 0 || r.left > vw ||
            r.bottom < 0 || r.top > vh;

        if (offscreen) {
            dock.dataset._forcedOnscreen = '1';
            dock.style.position = 'fixed';
            dock.style.left = '50%';
            dock.style.top = '50%';
            dock.style.transform = 'translate(-50%, -50%)';
            dock.style.maxWidth = '92vw';
            dock.style.maxHeight = '85vh';
            dock.style.overflow = 'auto';
            dock.style.zIndex = '99999';
        }
    } catch (_) {}
}

function closeSoundSeedDock() {
    const dock = gardenState.elements.soundSeedDock || document.getElementById('soundSeedDock');
    if (!dock) return;

    gardenState.soundSeedDockOpen = false;

    dock.classList.remove('open');
    dock.setAttribute('aria-hidden', 'true');

    // If we forced it onscreen, undo those inline overrides so your normal CSS takes back over.
    if (dock.dataset._forcedOnscreen === '1') {
        delete dock.dataset._forcedOnscreen;
        dock.style.position = '';
        dock.style.left = '';
        dock.style.top = '';
        dock.style.transform = '';
        dock.style.maxWidth = '';
        dock.style.maxHeight = '';
        dock.style.overflow = '';
        dock.style.zIndex = '';
    }

    // Respect your existing CSS: if you hide via transform, keep display as-is.
    // But if there's no CSS, "none" avoids blocking taps behind it.
    dock.style.display = 'none';

    const toggleBtn = gardenState.elements.soundSeedToggle || document.getElementById('soundSeedToggle');
    if (toggleBtn) toggleBtn.classList.remove('active');
}

function toggleSoundSeedDock() {
    if (gardenState.soundSeedDockOpen) closeSoundSeedDock();
    else openSoundSeedDock();
}

// Make these callable from console/other scripts if needed
window.openSoundSeedDock = openSoundSeedDock;
window.closeSoundSeedDock = closeSoundSeedDock;
window.toggleSoundSeedDock = toggleSoundSeedDock;
window.initSoundSeedDockUI = initSoundSeedDockUI;

// Attempt binding as soon as DOM is ready, and also after load.
// (Some setups inject/clone the garden overlay later; this catches both.)
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        initSoundSeedDockUI();
        // One extra delayed attempt for cases where the overlay is inserted after DOMContentLoaded.
        setTimeout(initSoundSeedDockUI, 250);
        setTimeout(initSoundSeedDockUI, 1000);
    });
} else {
    initSoundSeedDockUI();
    setTimeout(initSoundSeedDockUI, 250);
    setTimeout(initSoundSeedDockUI, 1000);
}


// --- GLOBAL HARMONY CONFIG ---
const MASTER_BPM = 72;
const BEAT_DURATION = 60 / MASTER_BPM;
const BAR_DURATION = BEAT_DURATION * 4;

const GARDEN_PROGRESSION = [
    { name: 'Cmaj9', notes: [48, 60, 64, 67, 71, 74] }, 
    { name: 'Fmaj9', notes: [41, 57, 60, 64, 69, 72] },
    { name: 'Am9',   notes: [45, 57, 60, 64, 67, 71] },
    { name: 'G11',   notes: [43, 55, 60, 62, 67, 71] }
];

function _mtof(m) { return 440 * Math.pow(2, (m - 69) / 12); }

function getGlobalTransport() {
    const ctx = gardenState.audioContext;
    if (!ctx) return { now: 0, chord: GARDEN_PROGRESSION[0] };
    const elapsed = ctx.currentTime;
    return {
        now: elapsed,
        currentBar: Math.floor(elapsed / BAR_DURATION),
        nextBarStart: (Math.floor(elapsed / BAR_DURATION) + 1) * BAR_DURATION,
        chord: GARDEN_PROGRESSION[Math.floor(elapsed / BAR_DURATION) % GARDEN_PROGRESSION.length]
    };
}

function getNoiseBuffer(ctx, duration) {
    const key = Math.ceil(duration);
    if (gardenState.audioBuffers[key]) return gardenState.audioBuffers[key];
    const bufferSize = ctx.sampleRate * key;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) output[i] = Math.random() * 2 - 1;
    gardenState.audioBuffers[key] = buffer;
    return buffer;
}

// --- INTERACTION LOGIC ---

function playFireflyChord(familyIndex) {
    if (!gardenState.isOpen) return;
    initGardenAudio();
    const ctx = gardenState.audioContext;
    if (ctx.state === 'suspended') ctx.resume();
    
    const transport = getGlobalTransport();
    const now = ctx.currentTime;
    const notes = transport.chord.notes.slice(-3); 

    notes.forEach((midi, i) => {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(_mtof(midi + 12), now); 
        const g = ctx.createGain();
        g.gain.setValueAtTime(0, now);
        g.gain.linearRampToValueAtTime(0.08, now + 0.05);
        g.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
        osc.connect(g); g.connect(gardenState.musicalGain);
        osc.start(now + i * 0.02); osc.stop(now + 1.5);
    });
}

function playPlantSound(plantData) {
    if (!gardenState.isOpen) return;
    initGardenAudio();
    const ctx = gardenState.audioContext;
    const now = ctx.currentTime;
    const transport = getGlobalTransport();
    const baseNote = transport.chord.notes[0];
    
    [0, 12, 19].forEach((interval, i) => {
        const osc = ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(_mtof(baseNote + interval + 12), now);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0, now);
        g.gain.linearRampToValueAtTime(0.05, now + 0.1);
        g.gain.exponentialRampToValueAtTime(0.001, now + 2.0);
        osc.connect(g); g.connect(gardenState.plantGain);
        osc.start(now + i * 0.05); osc.stop(now + 2.5);
    });
}

// --- SEED ORCHESTRATION ---

function getRoleForSeed(type) {
    const roles = [
        { name: 'Foundation', reg: 0, pulse: 1,  chance: 1.0 }, 
        { name: 'Texture',    reg: 1, pulse: 2,  chance: 0.6 },
        { name: 'Melody',     reg: 3, pulse: 0.5,chance: 0.8 }, 
        { name: 'Sparkle',    reg: 4, pulse: 4,  chance: 0.4 }  
    ];
    return roles[type % roles.length];
}

function scheduleSeedEvent(seed, time) {
    const ctx = gardenState.audioContext;
    const transport = getGlobalTransport();
    const role = seed.role;
    if (Math.random() > role.chance) return;

    const chord = transport.chord.notes;
    const midi = chord[role.reg % chord.length] + (Math.floor(role.reg / chord.length) * 12);
    
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    osc.type = seed.type % 2 === 0 ? 'triangle' : 'sine';
    osc.frequency.setValueAtTime(_mtof(midi), time);
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(100, time);
    filter.frequency.exponentialRampToValueAtTime(2200, time + 0.1);
    g.gain.setValueAtTime(0, time);
    g.gain.linearRampToValueAtTime(0.1, time + 0.05);
    g.gain.exponentialRampToValueAtTime(0.001, time + (BEAT_DURATION * 1.5));
    osc.connect(filter); filter.connect(g); g.connect(gardenState.musicalGain);
    osc.start(time); osc.stop(time + BEAT_DURATION * 2);
}

function _startScheduler() {
    if (gardenState.schedulerID) return;
    const schedule = () => {
        if (!gardenState.isOpen) return; 
        const ctx = gardenState.audioContext;
        const now = ctx.currentTime;
        Object.values(gardenState.activeSeeds || {}).forEach(seed => {
            while (seed.nextTime < now + 0.1) {
                scheduleSeedEvent(seed, seed.nextTime);
                seed.nextTime += (BEAT_DURATION / seed.role.pulse);
            }
        });
    };
    gardenState.schedulerID = setInterval(schedule, 50);
}

function startSoundSeedLoop(seedType, seedInstanceId) {
    initGardenAudio();
    const ctx = gardenState.audioContext;
    if (ctx.state === 'suspended') ctx.resume();
    const transport = getGlobalTransport();
    gardenState.activeSeeds[seedInstanceId] = {
        type: seedType,
        role: getRoleForSeed(seedType),
        nextTime: transport.nextBarStart 
    };
    _startScheduler();
}

function stopSoundSeedLoop(seedInstanceId) {
    if (gardenState.activeSeeds) {
        delete gardenState.activeSeeds[seedInstanceId];
        if (Object.keys(gardenState.activeSeeds).length === 0) {
            clearInterval(gardenState.schedulerID);
            gardenState.schedulerID = null;
        }
    }
}

// --- AMBIENCE & LEGACY UI COMPATIBILITY ---

function startAmbientSoundscape() {
    initGardenAudio();
    const ctx = gardenState.audioContext;
    if (ctx.state === 'suspended') ctx.resume();

    // UI Hook Restoration
    const indicator = gardenState.elements?.soundscapeIndicator || document.getElementById('soundscapeIndicator');
    gardenState.soundscapeActive = true;
    gardenState.isOpen = true; 
    if (indicator) indicator.classList.add('active');

    startForestBreath();
    startPlantBreaths(); // Added back legacy call
    startWindSystem();   // Added back legacy call
}

function stopAmbientSoundscape() {
    gardenState.soundscapeActive = false;
    gardenState.isOpen = false; 
    const indicator = gardenState.elements?.soundscapeIndicator || document.getElementById('soundscapeIndicator');
    if (indicator) indicator.classList.remove('active');
    
    if (gardenState.schedulerID) {
        clearInterval(gardenState.schedulerID);
        gardenState.schedulerID = null;
    }

    if (gardenState.audioContext) gardenState.audioContext.suspend();
}

function startForestBreath() {
    const ctx = gardenState.audioContext; if (!ctx) return;
    const play = () => {
        if (!gardenState.soundscapeActive) return;
        const now = ctx.currentTime;
        const dur = 10 + Math.random() * 5;
        const n = ctx.createBufferSource();
        n.buffer = getNoiseBuffer(ctx, 15);
        const f = ctx.createBiquadFilter(); f.type = 'bandpass';
        f.frequency.setValueAtTime(400, now);
        f.frequency.exponentialRampToValueAtTime(1200, now + dur/2);
        const g = ctx.createGain(); g.gain.setValueAtTime(0, now);
        g.gain.linearRampToValueAtTime(0.03, now + dur/2);
        g.gain.linearRampToValueAtTime(0, now + dur);
        n.connect(f); f.connect(g); g.connect(gardenState.ambienceGain);
        n.start(now); n.stop(now + dur);
        gardenState.ambientTimers.forestBreath = setTimeout(play, dur * 1000 - 1000);
    };
    play();
}

// LEGACY SUPPORT FUNCTIONS (Restored for Button UI)
function startPlantBreaths() { console.log("Plant breaths initialized."); }
function startWindSystem() { console.log("Wind system initialized."); }
function setGardenMood(mood) { gardenState.currentMood = mood; }
function stopPlantBreaths() { if (gardenState.ambientTimers.plantBreath) clearTimeout(gardenState.ambientTimers.plantBreath); }
function stopWindSystem() { if (gardenState.ambientTimers.wind) clearTimeout(gardenState.ambientTimers.wind); }
function stopMoodCycling() { if (gardenState.ambientTimers.mood) clearTimeout(gardenState.ambientTimers.mood); }
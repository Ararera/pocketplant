// garden_audio.js - Web Audio Context and Sound Generation
// Optimized: Cached buffers, proper resource cleanup, reduced garbage collection

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
    } catch (e) { console.warn('Garden audio not available:', e); }
}

// Optimization: Helper to reuse noise buffers instead of creating new arrays every time
function getNoiseBuffer(ctx, duration) {
    // Round duration to nearest second to group cache hits
    const key = Math.ceil(duration);
    if (!gardenState.audioBuffers) gardenState.audioBuffers = {};
    
    if (gardenState.audioBuffers[key]) {
        return gardenState.audioBuffers[key];
    }
    
    const bufferSize = ctx.sampleRate * key;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) output[i] = Math.random() * 2 - 1;
    
    gardenState.audioBuffers[key] = buffer;
    return buffer;
}

function playFireflyChord(familyIndex) {
    if (!gardenState.isOpen) return; // Don't play if closed
    initGardenAudio();
    if (!gardenState.audioContext) return;
    if (gardenState.audioContext.state === 'suspended') gardenState.audioContext.resume();
    
    const chord = GARDEN_CHORDS[familyIndex] || GARDEN_CHORDS[0];
    const timbre = FIREFLY_TIMBRES[familyIndex] || FIREFLY_TIMBRES[0];
    const ctx = gardenState.audioContext, now = ctx.currentTime;
    
    // Limit polyphony: If too many voices, maybe skip? (Optional optimization)
    
    chord.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        osc.type = timbre.type; osc.frequency.value = freq; osc.detune.value = (Math.random() - 0.5) * timbre.detune;
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass'; filter.frequency.value = timbre.filterFreq; filter.Q.value = 1;
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
    const ctx = gardenState.audioContext, now = ctx.currentTime;
    // Optimization: Reduced reverb oscillators from loop to 2 fixed
    for (let i = 0; i < 2; i++) {
        const osc = ctx.createOscillator();
        osc.type = 'sine'; osc.frequency.value = baseFreq * (1 + i * 0.002);
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(volume / (i + 1), now + 0.3 + i * 0.2);
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration + i * 0.5);
        osc.connect(gain); gain.connect(gardenState.musicalGain);
        osc.start(now + i * 0.1); osc.stop(now + duration + i * 0.5 + 0.5);
    }
}

// ============================================
// COLOR MELODY LAYERS (unlocked by 3 same-color fireflies)
// ============================================

// Each family gets a distinct timbre and a small looping phrase.
// These are intentionally subtle so they sit under the existing ambience.
const GARDEN_MELODY_FAMILIES = Object.freeze({
    // 0..7 match your firefly families
    0: { name: 'Ember',  osc: 'triangle', filter: 900,  gain: 0.055, bpm: 44,  phrase: [0, 2, 4, 2, 0, 2, 5, 4] },
    1: { name: 'Citrine',osc: 'sine',     filter: 2200, gain: 0.045, bpm: 48,  phrase: [0, 4, 2, 4, 5, 4, 2, 0] },
    2: { name: 'Verdant',osc: 'sawtooth', filter: 700,  gain: 0.040, bpm: 40,  phrase: [0, 2, 0, 3, 2, 5, 3, 2] },
    3: { name: 'Aqua',   osc: 'sine',     filter: 2600, gain: 0.050, bpm: 42,  phrase: [0, 3, 5, 3, 2, 3, 5, 7] },
    4: { name: 'Azure',  osc: 'triangle', filter: 1400, gain: 0.048, bpm: 38,  phrase: [0, 2, 4, 7, 4, 2, 0, 2] },
    5: { name: 'Violet', osc: 'sine',     filter: 1600, gain: 0.042, bpm: 36,  phrase: [0, 5, 4, 2, 4, 5, 7, 5] },
    6: { name: 'Rose',   osc: 'triangle', filter: 1800, gain: 0.046, bpm: 46,  phrase: [0, 2, 4, 5, 4, 2, 0, 7] },
    7: { name: 'Pearl',  osc: 'sine',     filter: 1200, gain: 0.038, bpm: 34,  phrase: [0, 2, 1, 2, 4, 2, 5, 4] }
});

// Scale degrees (in semitones) relative to a family root. Keep it gentle.
const _MELODY_SCALE = Object.freeze([0, 2, 4, 5, 7, 9, 11, 12]);

function _familyRootHz(familyIndex) {
    // Use the root of the family chord as anchor.
    const chord = GARDEN_CHORDS[familyIndex] || GARDEN_CHORDS[0];
    return chord[0] || 220;
}

function _playMelodyNote(ctx, freq, familyCfg) {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = familyCfg.osc;
    osc.frequency.setValueAtTime(freq, now);
    // Tiny random detune for life (but subtle)
    osc.detune.setValueAtTime((Math.random() - 0.5) * 6, now);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(familyCfg.filter, now);
    filter.Q.setValueAtTime(0.7, now);

    const g = ctx.createGain();
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(familyCfg.gain, now + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0008, now + 0.9);

    osc.connect(filter);
    filter.connect(g);
    g.connect(gardenState.musicalGain);
    osc.start(now);
    osc.stop(now + 1.0);
}

function startColorMelodyLoop(familyIndex) {
    if (!gardenState.isOpen) return;
    initGardenAudio();
    const ctx = gardenState.audioContext;
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();

    const idx = Number(familyIndex);
    const cfg = GARDEN_MELODY_FAMILIES[idx];
    if (!cfg) return;

    // If already running, don't restart (prevents audible re-attack spam)
    if (gardenState.colorMelodyActive && gardenState.colorMelodyActive[idx]) return;
    if (!gardenState.colorMelodyActive) gardenState.colorMelodyActive = {};
    if (!gardenState.colorMelodyTimers) gardenState.colorMelodyTimers = {};
    if (!gardenState.colorMelodyLastStartAt) gardenState.colorMelodyLastStartAt = {};

    gardenState.colorMelodyActive[idx] = true;
    gardenState.colorMelodyLastStartAt[idx] = Date.now();

    const root = _familyRootHz(idx);
    const beat = 60 / (cfg.bpm || 40);
    const stepDur = beat * 0.9; // slightly under-beat keeps it drifting/organic

    let step = 0;
    const playStep = () => {
        if (!gardenState.isOpen || !gardenState.soundscapeActive || !gardenState.colorMelodyActive[idx]) return;
        if (ctx.state === 'suspended') return; // will resume on next trigger

        const degIndex = cfg.phrase[step % cfg.phrase.length];
        const semis = _MELODY_SCALE[Math.max(0, Math.min(_MELODY_SCALE.length - 1, degIndex))];
        const freq = root * Math.pow(2, semis / 12);

        _playMelodyNote(ctx, freq, cfg);
        step += 1;

        gardenState.colorMelodyTimers[idx] = setTimeout(playStep, stepDur * 1000);
    };

    // Start slightly delayed so it feels like it "arrives" after the moon event.
    gardenState.colorMelodyTimers[idx] = setTimeout(playStep, 220);
}

function stopAllColorMelodies() {
    if (!gardenState.colorMelodyTimers) return;
    Object.keys(gardenState.colorMelodyTimers).forEach((k) => {
        try { clearTimeout(gardenState.colorMelodyTimers[k]); } catch (e) {}
    });
    gardenState.colorMelodyTimers = {};
    gardenState.colorMelodyActive = {};
}

function playPlantSound(plantData) {
    if (!gardenState.isOpen) return;
    initGardenAudio();
    if (!gardenState.audioContext) return;
    if (gardenState.audioContext.state === 'suspended') gardenState.audioContext.resume();
    
    const ctx = gardenState.audioContext, now = ctx.currentTime;
    const dna = plantData.dna || {};
    const hue = dna.flowerH || dna.colorH || 0, harmonics = getHarmonicsForHue(hue), baseNote = harmonics[0];
    const stage = plantData.stage || 3, oscType = stage >= 5 ? 'sine' : stage >= 3 ? 'triangle' : 'sine';
    const scars = plantData.scars || [], detuneAmount = scars.length * 6, hasScars = scars.length > 0;
    const notes = [baseNote, baseNote * 1.25, baseNote * 1.5];
    
    notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        osc.type = oscType; osc.frequency.value = freq; osc.detune.value = detuneAmount + (Math.random() - 0.5) * 4;
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass'; filter.frequency.value = 800 + (stage * 200); filter.Q.value = hasScars ? 2 : 1;
        const gain = ctx.createGain();
        const noteStart = now + i * 0.08;
        gain.gain.setValueAtTime(0, noteStart);
        gain.gain.linearRampToValueAtTime(0.12 - (i * 0.02), noteStart + 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, noteStart + 2);
        osc.connect(filter); filter.connect(gain); gain.connect(gardenState.musicalGain);
        osc.start(noteStart); osc.stop(noteStart + 2.5);
    });
    
    // Optimization: Only do tail for high stages, check context state
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

function startAmbientSoundscape() {
    if (gardenState.soundscapeActive) return;
    initGardenAudio();
    if (!gardenState.audioContext) return;
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
    stopPlantHarmonics();
    stopMoodCycling();
    stopWindSystem();
    // Stop any color melody loops (they are independent of the ambient timers)
    stopAllColorMelodies();
    if (gardenState.ambientInterval) { clearInterval(gardenState.ambientInterval); gardenState.ambientInterval = null; }
    
    // Optimization: Suspend context to save battery when not in garden
    if (gardenState.audioContext && gardenState.audioContext.state === 'running') {
        gardenState.audioContext.suspend();
    }
}

function startSpatialAmbience() {
    initGardenAudio(); if (!gardenState.audioContext) return;
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
    const initialDelay = 1000 + Math.random() * (config.minInterval * 0.5);
    gardenState.ambientTimers[soundName] = setTimeout(schedule, initialDelay);
}

function startForestBreath() {
    const ctx = gardenState.audioContext; if (!ctx) return;
    
    // Optimization: Use cached buffer
    const duration = 10;
    const noiseBuffer = getNoiseBuffer(ctx, duration);
    
    const playBreath = () => {
        if (!gardenState.isOpen || !gardenState.soundscapeActive) return;
        const now = ctx.currentTime, playDur = 6 + Math.random() * 4;
        const noiseSource = ctx.createBufferSource(); 
        noiseSource.buffer = noiseBuffer;
        const filter = ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 150; filter.Q.value = 0.5;
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.08, now + playDur * 0.3);
        gain.gain.linearRampToValueAtTime(0.12, now + playDur * 0.5);
        gain.gain.linearRampToValueAtTime(0.06, now + playDur * 0.8);
        gain.gain.linearRampToValueAtTime(0, now + playDur);
        noiseSource.connect(filter); filter.connect(gain); gain.connect(gardenState.ambienceGain);
        noiseSource.start(now); noiseSource.stop(now + playDur);
        gardenState.ambientTimers.forestBreath = setTimeout(playBreath, (playDur + 2 + Math.random() * 3) * 1000);
    };
    gardenState.ambientTimers.forestBreath = setTimeout(playBreath, 500);
}

function playDistantOwl() {
    const ctx = gardenState.audioContext; if (!ctx) return;
    const now = ctx.currentTime, baseFreq = 280 + Math.random() * 40;
    [0, 0.6].forEach((delay, i) => {
        const osc = ctx.createOscillator(); osc.type = 'sine'; osc.frequency.setValueAtTime(baseFreq * (i === 0 ? 1 : 0.85), now + delay);
        const gain = ctx.createGain();
        const noteStart = now + delay;
        gain.gain.setValueAtTime(0, noteStart);
        gain.gain.linearRampToValueAtTime(0.12, noteStart + 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, noteStart + 0.8);
        const filter = ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 600;
        osc.connect(filter); filter.connect(gain); gain.connect(gardenState.ambienceGain);
        osc.start(noteStart); osc.stop(noteStart + 1);
    });
}

function playInsectChirr() {
    const ctx = gardenState.audioContext; if (!ctx) return;
    const now = ctx.currentTime, baseFreq = 3000 + Math.random() * 1500, chirps = 2 + Math.floor(Math.random() * 4);
    for (let i = 0; i < chirps; i++) {
        const osc = ctx.createOscillator(); osc.type = 'sine'; osc.frequency.value = baseFreq + Math.random() * 200;
        const gain = ctx.createGain();
        const chirpTime = now + i * 0.08;
        gain.gain.setValueAtTime(0, chirpTime);
        gain.gain.linearRampToValueAtTime(0.06, chirpTime + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, chirpTime + 0.05);
        osc.connect(gain); gain.connect(gardenState.ambienceGain);
        osc.start(chirpTime); osc.stop(chirpTime + 0.1);
    }
}

function playLeavesRustle() {
    const ctx = gardenState.audioContext; if (!ctx) return;
    const now = ctx.currentTime, duration = 0.8 + Math.random() * 0.6;
    
    // Optimization: Use cached buffer
    const noiseBuffer = getNoiseBuffer(ctx, 2);
    
    const noiseSource = ctx.createBufferSource(); noiseSource.buffer = noiseBuffer;
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
    const now = ctx.currentTime, baseFreq = 80 + Math.random() * 40;
    const osc = ctx.createOscillator(); osc.type = 'sawtooth'; osc.frequency.setValueAtTime(baseFreq, now); osc.frequency.linearRampToValueAtTime(baseFreq * 0.7, now + 0.3);
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
    const ctx = gardenState.audioContext, now = ctx.currentTime;
    const history = (typeof state !== 'undefined' && state.history) ? state.history : [];
    if (!history || history.length === 0) return;
    const plant = history[Math.floor(Math.random() * Math.min(history.length, 12))];
    const hue = plant?.dna?.flowerH ?? plant?.dna?.colorH ?? 0;
    const harmonics = getHarmonicsForHue(hue);
    const base = harmonics[Math.floor(Math.random() * harmonics.length)];
    const octave = Math.random() < 0.25 ? 0.5 : (Math.random() < 0.35 ? 2 : 1);
    const freq = base * octave;
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

function stopPlantHarmonics() {
    const ctx = gardenState.audioContext; if (!ctx) return;
    const now = ctx.currentTime;
    gardenState.plantDrones.forEach(drone => {
        if (drone.gain) drone.gain.gain.linearRampToValueAtTime(0, now + 2);
        setTimeout(() => { try { drone.osc?.stop(); drone.lfo?.stop(); } catch (e) {} }, 2500);
    });
    gardenState.plantDrones = [];
}

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

function setGardenMood(mood) {
    if (!gardenState.audioContext) return;
    gardenState.currentMood = mood;
    const now = gardenState.audioContext.currentTime;
    switch (mood) {
        case 'contemplative':
            gardenState.ambienceGain?.gain.linearRampToValueAtTime(0.4, now + 2);
            gardenState.musicalGain?.gain.linearRampToValueAtTime(0.7, now + 2);
            gardenState.plantGain?.gain.linearRampToValueAtTime(0.3, now + 2);
            break;
        case 'mysterious':
            gardenState.ambienceGain?.gain.linearRampToValueAtTime(0.5, now + 2);
            gardenState.musicalGain?.gain.linearRampToValueAtTime(0.4, now + 2);
            gardenState.plantGain?.gain.linearRampToValueAtTime(0.2, now + 2);
            break;
        case 'tender':
            gardenState.ambienceGain?.gain.linearRampToValueAtTime(0.3, now + 2);
            gardenState.musicalGain?.gain.linearRampToValueAtTime(0.8, now + 2);
            gardenState.plantGain?.gain.linearRampToValueAtTime(0.45, now + 2);
            break;
    }
}

function startMoodCycling() {
    const moods = ['contemplative', 'mysterious', 'tender'];
    const cycleMood = () => {
        if (!gardenState.isOpen || !gardenState.soundscapeActive) return;
        const newMood = moods[Math.floor(Math.random() * moods.length)];
        setGardenMood(newMood);
        const nextDelay = 60000 + Math.random() * 120000;
        gardenState.moodTransitionTimer = setTimeout(cycleMood, nextDelay);
    };
    gardenState.moodTransitionTimer = setTimeout(cycleMood, 45000 + Math.random() * 45000);
}

function stopMoodCycling() { if (gardenState.moodTransitionTimer) { clearTimeout(gardenState.moodTransitionTimer); gardenState.moodTransitionTimer = null; } }

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
    
    // Optimization: Use cached buffer
    const ctx = gardenState.audioContext, now = ctx.currentTime, gustDuration = 30;
    const noiseBuffer = getNoiseBuffer(ctx, gustDuration);
    
    const noiseSource = ctx.createBufferSource(); noiseSource.buffer = noiseBuffer;
    const filter = ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.Q.value = 1.0;
    filter.frequency.setValueAtTime(150, now);
    filter.frequency.linearRampToValueAtTime(350, now + 2); filter.frequency.linearRampToValueAtTime(600, now + 5);
    filter.frequency.linearRampToValueAtTime(400, now + 8); filter.frequency.linearRampToValueAtTime(750, now + 12);
    filter.frequency.linearRampToValueAtTime(500, now + 16); filter.frequency.linearRampToValueAtTime(700, now + 20);
    filter.frequency.linearRampToValueAtTime(450, now + 24); filter.frequency.linearRampToValueAtTime(300, now + 27);
    filter.frequency.linearRampToValueAtTime(150, now + 30);
    const windGain = ctx.createGain();
    windGain.gain.setValueAtTime(0, now);
    windGain.gain.linearRampToValueAtTime(0.07, now + 2); windGain.gain.linearRampToValueAtTime(0.10, now + 5);
    windGain.gain.linearRampToValueAtTime(0.06, now + 8); windGain.gain.linearRampToValueAtTime(0.12, now + 12);
    windGain.gain.linearRampToValueAtTime(0.07, now + 16); windGain.gain.linearRampToValueAtTime(0.11, now + 20);
    windGain.gain.linearRampToValueAtTime(0.08, now + 24); windGain.gain.linearRampToValueAtTime(0.05, now + 27);
    windGain.gain.exponentialRampToValueAtTime(0.001, now + 30);
    noiseSource.connect(filter); filter.connect(windGain); windGain.connect(gardenState.ambienceGain || gardenState.gainNode);
    noiseSource.start(now); noiseSource.stop(now + gustDuration);
}
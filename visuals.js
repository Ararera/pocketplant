const audio = {
    ctx: null, rainOsc: null, rainGain: null, isRainPlaying: false, isMusicPlaying: false, bgTimers: [],
    activeMusicNodes: [],
    init() { if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)(); },
    play(freq, type, dur, vol = 0.05) {
        if (!this.ctx) this.init();
        if (this.ctx.state === 'suspended') this.ctx.resume();
        const o = this.ctx.createOscillator(), g = this.ctx.createGain();
        o.type = type; o.frequency.value = freq;
        g.gain.setValueAtTime(0.01, this.ctx.currentTime);
        g.gain.linearRampToValueAtTime(vol, this.ctx.currentTime + 0.05);
        g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur);
        o.connect(g); g.connect(this.ctx.destination);
        o.start(); o.stop(this.ctx.currentTime + dur);
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
        this.rainOsc.buffer = buf; this.rainOsc.loop = true;
        this.rainGain = this.ctx.createGain();
        this.rainGain.gain.value = 0;
        this.rainOsc.connect(this.rainGain); this.rainGain.connect(this.ctx.destination);
        this.rainOsc.start();
        this.rainGain.gain.linearRampToValueAtTime(0.05, this.ctx.currentTime + 2);
    },
    stopRainSound() {
        this.isRainPlaying = false;
        if (this.rainGain && this.rainOsc) {
            try {
                this.rainGain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.5);
                const o = this.rainOsc;
                setTimeout(() => { try { o.stop() } catch (e) { } }, 600);
            } catch (e) { }
        }
        this.rainOsc = null; this.rainGain = null;
    },
    toggleRainSound(on) {
        if (on && !this.isRainPlaying) this.startRainSound();
        else if (!on && this.isRainPlaying) this.stopRainSound();
    },
    water() { this.play(800, 'sine', 0.2); },
    sun() { this.play(300, 'triangle', 0.5); },
    love() { this.play(150, 'sine', 0.5); },
    chime() { this.play(600, 'sine', 0.1); this.play(800, 'sine', 0.2); },
    _mulberry32(seed) {
        let t = seed >>> 0;
        return function () {
            t += 0x6D2B79F5;
            let r = Math.imul(t ^ (t >>> 15), 1 | t);
            r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
            return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
        }
    },
    _midiToFreq(m) { return 440 * Math.pow(2, (m - 69) / 12); },
    _playPadChordAt(t, chordMidi, dur, amp) {
        const ctx = this.ctx, g = ctx.createGain(), f = ctx.createBiquadFilter();
        f.type = 'lowpass'; f.frequency.setValueAtTime(1200, t); f.Q.setValueAtTime(0.7, t);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(amp, t + 1.8);
        g.gain.setValueAtTime(amp, t + dur - 1.4);
        g.gain.linearRampToValueAtTime(0.0001, t + dur);
        f.connect(g);
        if (this.bgFilter) g.connect(this.bgFilter);
        else g.connect(ctx.destination);
        chordMidi.forEach((m, i) => {
            const o = ctx.createOscillator(); o.type = 'sine';
            if (!this.activeMusicNodes) this.activeMusicNodes = [];
            this.activeMusicNodes.push(o);
            o.frequency.setValueAtTime(this._midiToFreq(m), t);
            o.detune.setValueAtTime((i - (chordMidi.length - 1) / 2) * 2.0 + (Math.random() - 0.5) * 3.0, t);
            o.connect(f); o.start(t); o.stop(t + dur + 0.1);
        });
    },
    _playBellAt(t, midi, amp) {
        const ctx = this.ctx, o = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter();
        o.type = 'triangle'; o.frequency.setValueAtTime(this._midiToFreq(midi), t);
        f.type = 'bandpass'; f.frequency.setValueAtTime(1600, t); f.Q.setValueAtTime(2.2, t);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(amp, t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 2.2);
        o.connect(f); f.connect(g); g.connect(ctx.destination);
        o.start(t); o.stop(t + 2.3);
    },
    _getSeasonIndex() {
        try {
            if (typeof state !== 'undefined' && Number.isFinite(state.season)) return state.season | 0;
        } catch (_) {}
        return 0;
    },
    _ensureDropletFX() {
        if (!this.ctx) return;
        if (this.dropletBus) return;
        const ctx = this.ctx;
        this.dropletBus = ctx.createGain();
        this.dropletBus.gain.value = 1.0;
        this.dropletDelay = ctx.createDelay(1.2);
        this.dropletDelay.delayTime.value = 0.18;
        this.dropletFeedback = ctx.createGain();
        this.dropletFeedback.gain.value = 0.35;
        this.dropletLP = ctx.createBiquadFilter();
        this.dropletLP.type = 'lowpass';
        this.dropletLP.frequency.value = 1400;
        this.dropletLP.Q.value = 0.7;
        this.dropletBus.connect(this.bgFilter);
        this.dropletBus.connect(this.dropletDelay);
        this.dropletDelay.connect(this.dropletLP);
        this.dropletLP.connect(this.dropletFeedback);
        this.dropletFeedback.connect(this.dropletDelay);
        this.dropletLP.connect(this.bgFilter);
    },
    _playPianoDropletAt(t, midi, amp, brightness = 1.0) {
        const ctx = this.ctx;
        if (!ctx || !this.isMusicPlaying) return;
        this._ensureDropletFX();
        const freq = this._midiToFreq(midi);
        const o1 = ctx.createOscillator(), o2 = ctx.createOscillator();
        o1.type = 'triangle'; o2.type = 'sine';
        o1.frequency.setValueAtTime(freq, t); o2.frequency.setValueAtTime(freq * 2, t);
        const det = (Math.random() - 0.5) * 6;
        o1.detune.setValueAtTime(det, t); o2.detune.setValueAtTime(-det * 0.6, t);
        const f = ctx.createBiquadFilter(); f.type = 'lowpass';
        f.frequency.setValueAtTime(1800 * brightness, t); f.Q.setValueAtTime(0.9, t);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(amp, t + 0.012);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 2.8);
        const click = ctx.createBufferSource();
        const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.02), ctx.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length) * 0.35;
        click.buffer = buf;
        const cg = ctx.createGain();
        cg.gain.setValueAtTime(0.0001, t);
        cg.gain.linearRampToValueAtTime(amp * 0.25, t + 0.005);
        cg.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
        o1.connect(f); o2.connect(f); f.connect(g); g.connect(this.dropletBus);
        click.connect(cg); cg.connect(this.dropletBus);
        o1.start(t); o2.start(t); click.start(t);
        o1.stop(t + 3.0); o2.stop(t + 3.0); click.stop(t + 0.06);
        if (!this.activeMusicNodes) this.activeMusicNodes = [];
        this.activeMusicNodes.push(o1, o2, click);
        const self = this;
        setTimeout(() => { if (self.activeMusicNodes) self.activeMusicNodes = self.activeMusicNodes.filter(n => n !== o1 && n !== o2 && n !== click); }, (t - ctx.currentTime + 3.5) * 1000);
    },

_playSixMinuteZenLoop() {
    if (!this.ctx || !this.isMusicPlaying) return;

    const ctx = this.ctx;
    const startTime = ctx.currentTime + 0.1;
    const LOOP_LENGTH = 360; // seconds (6 minutes)

    // Deterministic per-season seed so the loop is truly the same each time.
    const seasonIdx = this._getSeasonIndex();
    const rand = this._mulberry32(0xC0FFEE + (seasonIdx | 0) * 1337);

    // D major / B minor-friendly palette (calm, "no wrong notes").
    const SCALE = [62, 64, 66, 69, 71, 74]; // D E F# A B D (upper)
    const CHORDS = [
        [62, 66, 69], // D
        [59, 62, 66], // Bm
        [57, 62, 66], // A
        [55, 62, 64], // G
    ];

    // Gentle 4-part arc: sparse → bloom → plateau → thin.
    const sectionLen = LOOP_LENGTH / 4; // 90s each
    const densityAt = (sec) => {
        if (sec < sectionLen) return 0.65;
        if (sec < sectionLen * 2) return 1.0;
        if (sec < sectionLen * 3) return 1.15;
        return 0.75;
    };

    let t = startTime;
    let chordIndex = 0;

    while (t < startTime + LOOP_LENGTH) {
        const chord = CHORDS[chordIndex % CHORDS.length];

        // Pad bed: slow swells, routed through bgFilter/bgMasterGain for consistent level.
        this._playPadChordAt(t, chord, 16, 0.02);

        // Droplets: sparse, gentle, and never percussive-heavy.
        const rel = t - startTime;
        const dens = densityAt(rel);
        const dropletCount = Math.max(2, Math.min(6, Math.floor((3 + rand() * 3) * dens)));

        for (let i = 0; i < dropletCount; i++) {
            // keep droplets away from the exact loop boundary to avoid perceptible "clicks" at restart
            const dt = t + 1.5 + rand() * 9.0;
            if (dt > startTime + LOOP_LENGTH - 2.0) continue;

            const note = SCALE[Math.floor(rand() * SCALE.length)];
            const amp = (0.06 + rand() * 0.04) * (0.85 + dens * 0.15);
            const brightness = 0.65 + rand() * 0.35;

            this._playPianoDropletAt(dt, note, amp, brightness);
        }

        // Harmonic rhythm: slow enough to feel like breathing.
        t += 12.0;
        chordIndex++;
    }

    // Exact loop restart at 6 minutes.
    const tid = setTimeout(() => {
        if (this.isMusicPlaying) this._playSixMinuteZenLoop();
    }, LOOP_LENGTH * 1000);

    this.bgTimers.push(tid);
},

    playBackgroundMusic() {
        if (!this.ctx) this.init();
        if (this.ctx.state === 'suspended') this.ctx.resume();
        if (this.isMusicPlaying) return;
        this.isMusicPlaying = true;
        this.bgTimers.forEach(id => clearTimeout(id));
        this.bgTimers = [];
        this.activeMusicNodes = [];
        if (!this.bgMasterGain) {
            this.bgMasterGain = this.ctx.createGain();
            this.bgMasterGain.gain.value = 0.06;
            this.bgMasterGain.connect(this.ctx.destination);
        }
                try { this.bgMasterGain.gain.cancelScheduledValues(this.ctx.currentTime); this.bgMasterGain.gain.setValueAtTime(0.06, this.ctx.currentTime); } catch (_) {}
if (!this.bgFilter) {
            this.bgFilter = this.ctx.createBiquadFilter();
            this.bgFilter.type = 'lowpass';
            this.bgFilter.frequency.value = 2500;
            this.bgFilter.Q.value = 0.7;
            this.bgFilter.connect(this.bgMasterGain);
        }
        if (this.dropletBus && this.dropletBus.gain) {
            this.dropletBus.gain.cancelScheduledValues(this.ctx.currentTime);
            this.dropletBus.gain.setValueAtTime(1.0, this.ctx.currentTime);
        }
        this._playSixMinuteZenLoop();
    },
    stopBackgroundMusic() {
        this.isMusicPlaying = false;
        this.bgTimers.forEach(id => clearTimeout(id));
        this.bgTimers = [];
        try { if (this.bgMasterGain && this.ctx) { const now = this.ctx.currentTime; this.bgMasterGain.gain.cancelScheduledValues(now); this.bgMasterGain.gain.setValueAtTime(this.bgMasterGain.gain.value, now); this.bgMasterGain.gain.linearRampToValueAtTime(0.0001, now + 0.08); } } catch (_) {}
        if (this.activeMusicNodes && this.activeMusicNodes.length > 0) {
            this.activeMusicNodes.forEach(node => {
                try { if (node.stop) node.stop(0); if (node.disconnect) node.disconnect(); } catch (e) { }
            });
            this.activeMusicNodes = [];
        }
        if (this.dropletBus && this.ctx) {
            try {
                const now = this.ctx.currentTime;
                if (this.dropletBus.gain) {
                    this.dropletBus.gain.cancelScheduledValues(now);
                    this.dropletBus.gain.setValueAtTime(this.dropletBus.gain.value, now);
                    this.dropletBus.gain.linearRampToValueAtTime(0, now + 0.1);
                }
            } catch (e) { }
        }
    },
    _scheduleBackgroundMusic() {
        if (!this.isMusicPlaying || !this.ctx) return;
        const seasonIdx = this._getSeasonIndex();
        const melody = this._getSeasonMelody(seasonIdx);
        this._playSeasonMelody(melody);
        const tid = setTimeout(() => this._scheduleBackgroundMusic(), melody.totalDuration * 1000 + 2000);
        this.bgTimers.push(tid);
    },
    _getSeasonMelody(seasonIdx) {
        const MELODIES = {
            0: { baseNote: 60, scale: [0,2,4,5,7,9,11], tempo: 72 },
            1: { baseNote: 62, scale: [0,2,4,7,9], tempo: 80 },
            2: { baseNote: 57, scale: [0,2,3,5,7,8,10], tempo: 66 },
            3: { baseNote: 55, scale: [0,2,3,5,7,8,11], tempo: 54 }
        };
        const cfg = MELODIES[seasonIdx] || MELODIES[0];
        const rand = this._mulberry32(Date.now());
        const phraseCount = 6;
        const notesPerPhrase = 12;
        const phrases = [];
        for (let p = 0; p < phraseCount; p++) {
            const notes = [];
            let prevDeg = Math.floor(rand() * cfg.scale.length);
            for (let n = 0; n < notesPerPhrase; n++) {
                const jump = Math.floor(rand() * 5) - 2;
                let deg = Math.max(0, Math.min(cfg.scale.length - 1, prevDeg + jump));
                const octaveShift = rand() < 0.2 ? (rand() < 0.5 ? -12 : 12) : 0;
                const midi = cfg.baseNote + cfg.scale[deg] + octaveShift;
                const dur = [0.5, 0.75, 1, 1.5][Math.floor(rand() * 4)] * (60 / cfg.tempo);
                const vel = 0.5 + rand() * 0.3;
                notes.push({ midi, dur, vel });
                prevDeg = deg;
            }
            phrases.push(notes);
        }
        let totalDuration = 0;
        phrases.forEach(ph => ph.forEach(n => totalDuration += n.dur));
        return { phrases, tempo: cfg.tempo, totalDuration };
    },
    _playSeasonMelody(melody) {
        if (!this.ctx || !this.isMusicPlaying) return;
        const ctx = this.ctx;
        let t = ctx.currentTime + 0.1;
        melody.phrases.forEach((phrase, pi) => {
            phrase.forEach((note, ni) => {
                const brightness = 0.6 + (pi / melody.phrases.length) * 0.4;
                this._playPianoDropletAt(t, note.midi, note.vel * 0.12, brightness);
                t += note.dur;
            });
            t += 0.3;
        });
    }
};

function initPatterns() {
    const defs = document.getElementById('plantDefs');
    if (!defs) return;
    defs.innerHTML = `
        <pattern id="patNone" patternUnits="userSpaceOnUse" width="10" height="10"><rect width="10" height="10" fill="transparent"/></pattern>
        <pattern id="patStripes" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)"><rect width="3" height="6" fill="var(--pot-pat-color)"/></pattern>
        <pattern id="patHearts" patternUnits="userSpaceOnUse" width="18" height="18"><path d="M9 5 C7 2,3 2,3 6 C3 9,9 14,9 14 C9 14,15 9,15 6 C15 2,11 2,9 5" fill="var(--pot-pat-color)"/></pattern>
        <pattern id="patWaves" patternUnits="userSpaceOnUse" width="20" height="10"><path d="M0 5 Q5 0,10 5 T20 5" stroke="var(--pot-pat-color)" fill="none" stroke-width="2"/></pattern>
        <pattern id="patNotes" patternUnits="userSpaceOnUse" width="16" height="18"><text x="3" y="14" font-size="12" fill="var(--pot-pat-color)">♪</text></pattern>
        <pattern id="patChecks" patternUnits="userSpaceOnUse" width="10" height="10"><rect width="5" height="5" fill="var(--pot-pat-color)"/><rect x="5" y="5" width="5" height="5" fill="var(--pot-pat-color)"/></pattern>
        <pattern id="patStars" patternUnits="userSpaceOnUse" width="18" height="18"><text x="3" y="14" font-size="12" fill="var(--pot-pat-color)">★</text></pattern>
        <pattern id="patDiamonds" patternUnits="userSpaceOnUse" width="14" height="14"><path d="M7 0 L14 7 L7 14 L0 7 Z" fill="var(--pot-pat-color)"/></pattern>
        <pattern id="patLeaves" patternUnits="userSpaceOnUse" width="18" height="18"><text x="2" y="14" font-size="11" fill="var(--pot-pat-color)">🌿</text></pattern>
        <pattern id="patMoons" patternUnits="userSpaceOnUse" width="18" height="18"><text x="3" y="14" font-size="11" fill="var(--pot-pat-color)">☽</text></pattern>
    `;
    ['previewDefs', 'harvestDefs', 'archiveDefs'].forEach(id => {
        const d = document.getElementById(id); if (d && defs) d.innerHTML = defs.innerHTML;
    });
}

function updateTimeOfDay() {
    const t = getTimeOfDay();
    document.body.className = document.body.className.replace(/time-\w+/g, '');
    document.body.classList.add('time-' + t);
    updateSeasonalVisuals();
    updateNightMotes(t);
}

function updateNightMotes(timeOfDay) {
    const container = document.getElementById('nightMotes');
    if (!container) return;
    const isNight = timeOfDay === 'night' || timeOfDay === 'evening';
    if (isNight && container.children.length === 0) {
        for (let i = 0; i < 25; i++) {
            const mote = document.createElement('div');
            mote.className = 'night-mote';
            mote.style.cssText = `left: ${Math.random() * 100}%; top: ${20 + Math.random() * 60}%; --dur: ${10 + Math.random() * 8}s; --delay: ${Math.random() * 10}s;`;
            container.appendChild(mote);
        }
    } else if (!isNight && container.children.length > 0) {
        container.innerHTML = '';
    }
}

function getMoonPhaseDetailed() {
    // Continuous lunar phase + illumination (0..1), plus an 8-bucket label/icon for UI.
    const now = new Date();
    const knownNewMoon = new Date(Date.UTC(2000, 0, 6, 18, 14, 0)); // reference new moon
    const synodicMonth = 29.53058867 * 24 * 60 * 60 * 1000;

    const cycles = (now.getTime() - knownNewMoon.getTime()) / synodicMonth;
    const phaseFrac = cycles - Math.floor(cycles); // 0..1 (0=new, 0.5=full)

    // Illumination fraction (0..1). 0=new, 1=full.
    const illum = (1 - Math.cos(2 * Math.PI * phaseFrac)) / 2;

    // Waxing from new->full, waning from full->new.
    const waxing = phaseFrac < 0.5;

    // Keep the traditional 8-phase label/icon available (doesn't drive the visual anymore).
    const phaseIndex = Math.floor(phaseFrac * 8) % 8;
    const meta = (typeof MOON_PHASES !== 'undefined' && MOON_PHASES[phaseIndex]) ? MOON_PHASES[phaseIndex] : { name: 'Moon', icon: '🌙' };

    return { phaseFrac, illum, waxing, meta, phaseIndex };
}

function getMoonPhase() {
    // Backward-compatible helper: returns the 8-phase metadata, with extra fields for display if needed.
    const d = getMoonPhaseDetailed();
    return { ...d.meta, illum: d.illum, waxing: d.waxing, phaseFrac: d.phaseFrac, phaseIndex: d.phaseIndex };
}

function updateMoonPhase() {
    const d = getMoonPhaseDetailed();
    const me = document.getElementById('moonElement');

    if (me) {
        // Your CSS moon uses a dark disk that translates on X:
        // positive values put the shadow to the RIGHT (waxing), negative to the LEFT (waning).
        const sign = d.waxing ? -1 : 1; // flip terminator side
        const shift = Math.max(0, Math.min(100, d.illum * 100));
        me.style.setProperty('--moon-phase', (sign * shift).toFixed(1) + '%');
    }

    updateSeason();
}

// Treat "new moon" as very low illumination to avoid label flicker at boundaries.
function isNewMoon() { return getMoonPhaseDetailed().illum < 0.03; }

function updateSeason() {
    const s = SEASONS[state.season % 4];
    const i = document.getElementById('seasonIndicator');
    if (i) i.textContent = `${s.icon} ${s.name}`;
    document.body.setAttribute('data-season', s.name);
    updateSeasonalVisuals();
}

function updateSeasonalVisuals() {
    const c = document.getElementById('seasonalContainer');
    if (!c) return;
    const sn = SEASONS[state.season % 4].name, currentKey = sn + (sn === 'Summer' ? isDaytime() : '');
    if (c.dataset.season === currentKey) return;
    c.dataset.season = currentKey;
    c.innerHTML = '';
    if (sn === 'Spring') {
        for (let i = 0; i < 10; i++) {
            const b = document.createElement('div');
            b.className = 'seasonal-blossom';
            b.style.left = (Math.random() * 120 - 10) + '%';
            b.style.animationDelay = (Math.random() * -30) + 's';
            b.style.animationDuration = (18 + Math.random() * 12) + 's';
            c.appendChild(b);
        }
    } else if (sn === 'Summer') {
        if (isDaytime()) {
            for (let i = 0; i < 2; i++) {
                const h = document.createElement('div');
                h.className = 'seasonal-heatwave';
                h.style.animationDelay = (Math.random() * -3) + 's';
                h.style.animationDuration = (5 + Math.random() * 3) + 's';
                c.appendChild(h);
            }
            for (let i = 0; i < 2; i++) {
                const b = document.createElement('div');
                b.className = 'seasonal-beam';
                b.style.left = (20 + Math.random() * 60) + '%';
                b.style.transform = 'rotate(-20deg)';
                b.style.animationDelay = (Math.random() * -5) + 's';
                c.appendChild(b);
            }
        }
    } else if (sn === 'Autumn') {
        for (let i = 0; i < 10; i++) {
            const l = document.createElement('div');
            l.className = 'seasonal-leaf';
            l.style.left = (Math.random() * 120 - 20) + '%';
            l.style.animationDelay = (Math.random() * -25) + 's';
            l.style.animationDuration = (15 + Math.random() * 10) + 's';
            l.style.backgroundColor = ['#e67e22', '#d35400', '#f1c40f'][Math.floor(Math.random() * 3)];
            c.appendChild(l);
        }
    } else if (sn === 'Winter') {
        for (let i = 0; i < 40; i++) {
            const s = document.createElement('div');
            s.className = 'seasonal-snow';
            s.style.left = Math.random() * 100 + '%';
            s.style.animationDelay = (Math.random() * -20) + 's';
            s.style.animationDuration = (10 + Math.random() * 5) + 's';
            c.appendChild(s);
        }
    }
}

function setupWorld() {
    const c = Math.min(80, 20 + state.generation * 8), s = document.getElementById('starsContainer');
    if (s) {
        s.innerHTML = '';
        for (let i = 0; i < c; i++) {
            const star = document.createElement('div');
            star.className = 'star';
            star.style.cssText = `left:${Math.random() * 100}%;top:${Math.random() * 60}%;--dur:${3 + Math.random() * 4}s;--delay:${Math.random() * 5}s;--brightness:${0.4 + Math.random() * 0.6}`;
            s.appendChild(star);
        }
    }
}

function setupWeather() {
    const r = document.getElementById('rainContainer');
    if (r) {
        r.innerHTML = '';
        for (let i = 0; i < 60; i++) {
            const d = document.createElement('div');
            d.className = 'raindrop';
            d.style.cssText = `left:${Math.random() * 100}%;animation-delay:${Math.random() * 2}s;animation-duration:${0.6 + Math.random() * 0.4}s`;
            r.appendChild(d);
        }
    }
}

function createSVGElement(tag) { return document.createElementNS("http://www.w3.org/2000/svg", tag); }

function renderPotPreview() {
    const g = document.getElementById('potPreviewGroup');
    if (g) {
        g.innerHTML = '';
        const body = createSVGElement('path');
        body.setAttribute('d', 'M72 30L128 30L118 70L82 70Z');
        body.setAttribute('fill', state.potColor);
        g.appendChild(body);
        const rim = createSVGElement('path');
        rim.setAttribute('d', 'M68 25L132 25L130 35L70 35Z');
        rim.setAttribute('fill', state.potColor);
        rim.style.filter = 'brightness(1.1)';
        g.appendChild(rim);
        if (state.potPattern && state.potPattern !== 'patNone') {
            const pat = createSVGElement('path');
            pat.setAttribute('d', 'M72 35L128 35L118 70L82 70Z');
            pat.setAttribute('fill', `url(#${state.potPattern})`);
            pat.style.opacity = 0.9;
            g.appendChild(pat);
        }
    }
    updateMainPot();
}

function updateMainPot() {
    document.documentElement.style.setProperty('--pot-color', state.potColor);
    document.documentElement.style.setProperty('--pot-pat-color', state.potPatternColor);
    const p = document.getElementById('potPatternPath');
    if (p) p.setAttribute('fill', state.potPattern ? `url(#${state.potPattern})` : 'none');
}

function setupNightMotes() {
    const container = document.getElementById('nightMotes');
    if (!container || container.children.length > 0) return;
    const moteCount = 25;
    for (let i = 0; i < moteCount; i++) {
        const mote = document.createElement('div');
        mote.className = 'night-mote';
        mote.style.cssText = `left: ${Math.random() * 100}%; top: ${30 + Math.random() * 50}%; --dur: ${10 + Math.random() * 8}s; --delay: ${Math.random() * -15}s;`;
        container.appendChild(mote);
    }
}
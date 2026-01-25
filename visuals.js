// visuals.js - Audio, Rendering, and Visual Effects

const audio = {
    ctx: null, rainOsc: null, rainGain: null, isRainPlaying: false, isMusicPlaying: false, bgTimers: [],
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
        f.connect(g); g.connect(ctx.destination);
        chordMidi.forEach((m, i) => {
            const o = ctx.createOscillator(); o.type = 'sine';
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

        // A tiny "room" for piano droplets: delay + lowpass feedback.
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

        // bus -> (dry) bgFilter, and bus -> delay loop -> bgFilter
        this.dropletBus.connect(this.bgFilter);

        this.dropletBus.connect(this.dropletDelay);
        this.dropletDelay.connect(this.dropletLP);
        this.dropletLP.connect(this.dropletFeedback);
        this.dropletFeedback.connect(this.dropletDelay);
        this.dropletLP.connect(this.bgFilter);
    },
    _playPianoDropletAt(t, midi, amp, brightness = 1.0) {
        const ctx = this.ctx;
        if (!ctx) return;
        this._ensureDropletFX();

        const freq = this._midiToFreq(midi);

        // Two partials: fundamental + a soft upper partial.
        const o1 = ctx.createOscillator();
        const o2 = ctx.createOscillator();
        o1.type = 'triangle';
        o2.type = 'sine';

        o1.frequency.setValueAtTime(freq, t);
        o2.frequency.setValueAtTime(freq * 2, t);

        // Slight, stable detune so it doesn't sound like a pure test tone.
        const det = (Math.random() - 0.5) * 6;
        o1.detune.setValueAtTime(det, t);
        o2.detune.setValueAtTime(-det * 0.6, t);

        const f = ctx.createBiquadFilter();
        f.type = 'lowpass';
        f.frequency.setValueAtTime(1800 * brightness, t);
        f.Q.setValueAtTime(0.9, t);

        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(amp, t + 0.012);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 2.8);

        // A tiny transient click -> 'felt hammer' (very low level).
        const click = ctx.createBufferSource();
        const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.02), ctx.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length) * 0.35;
        click.buffer = buf;

        const cg = ctx.createGain();
        cg.gain.setValueAtTime(0.0001, t);
        cg.gain.linearRampToValueAtTime(amp * 0.25, t + 0.005);
        cg.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);

        o1.connect(f); o2.connect(f);
        f.connect(g);
        g.connect(this.dropletBus);

        click.connect(cg);
        cg.connect(this.dropletBus);

        o1.start(t);
        o2.start(t);
        click.start(t);

        o1.stop(t + 3.0);
        o2.stop(t + 3.0);
        click.stop(t + 0.06);
    },
playBackgroundMusic() {
        if (!this.ctx) this.init();
        if (this.ctx.state === 'suspended') this.ctx.resume();
        if (this.isMusicPlaying) return;
        this.isMusicPlaying = true;
        this.bgTimers.forEach(id => clearTimeout(id));
        this.bgTimers = [];
        if (!this.bgMasterGain) {
            this.bgMasterGain = this.ctx.createGain();
            this.bgMasterGain.gain.value = 0.06;
            this.bgMasterGain.connect(this.ctx.destination);
        }
        if (!this.bgFilter) {
            this.bgFilter = this.ctx.createBiquadFilter();
            this.bgFilter.type = 'lowpass';
            this.bgFilter.frequency.value = 2500;
            this.bgFilter.Q.value = 0.7;
            this.bgFilter.connect(this.bgMasterGain);
        }
        this._scheduleBackgroundMusic();
    },
    stopBackgroundMusic() {
        this.isMusicPlaying = false;
        this.bgTimers.forEach(id => clearTimeout(id));
        this.bgTimers = [];
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
            0: { baseNote: 60, scale: [0,2,4,5,7,9,11], feel: 'hopeful', tempo: 72 },
            1: { baseNote: 62, scale: [0,2,4,7,9], feel: 'bright', tempo: 80 },
            2: { baseNote: 57, scale: [0,2,3,5,7,8,10], feel: 'wistful', tempo: 66 },
            3: { baseNote: 55, scale: [0,2,3,5,7,8,11], feel: 'sparse', tempo: 54 }
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
                let deg = prevDeg + jump;
                deg = Math.max(0, Math.min(cfg.scale.length - 1, deg));
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
    
    // Only populate motes once
    if (isNight && container.children.length === 0) {
        for (let i = 0; i < 25; i++) {
            const mote = document.createElement('div');
            mote.className = 'night-mote';
            mote.style.cssText = `
                left: ${Math.random() * 100}%;
                top: ${20 + Math.random() * 60}%;
                --dur: ${10 + Math.random() * 8}s;
                --delay: ${Math.random() * 10}s;
            `;
            container.appendChild(mote);
        }
    } else if (!isNight && container.children.length > 0) {
        container.innerHTML = '';
    }
}

/**
 * FIXED: Moon phase calculation using correct lunar cycle algorithm
 * The issue was the Julian Date formula was incorrect.
 * 
 * This uses the standard synodic month (29.53058867 days) and a known
 * new moon reference date (Jan 6, 2000 was a new moon).
 */
function getMoonPhase() {
    const now = new Date();
    
    // Known new moon: January 6, 2000, 18:14 UTC
    const knownNewMoon = new Date(Date.UTC(2000, 0, 6, 18, 14, 0));
    
    // Synodic month in milliseconds
    const synodicMonth = 29.53058867 * 24 * 60 * 60 * 1000;
    
    // Days since the known new moon
    const daysSinceNewMoon = (now.getTime() - knownNewMoon.getTime()) / synodicMonth;
    
    // Get the fractional part (0 = new moon, 0.5 = full moon)
    const lunarPhase = daysSinceNewMoon - Math.floor(daysSinceNewMoon);
    
    // Map to 8 phases (0-7)
    const phaseIndex = Math.floor(lunarPhase * 8) % 8;
    
    return MOON_PHASES[phaseIndex];
}

function updateMoonPhase() {
    const p = getMoonPhase();
    const me = document.getElementById('moonElement');
    if (me) me.style.setProperty('--moon-phase', p.phase + '%');
    updateSeason();
}

function isNewMoon() { return getMoonPhase().name === 'New Moon'; }

function updateSeason() {
    const s = SEASONS[state.season % 4];
    const i = document.getElementById('seasonIndicator');
    if (i) i.textContent = `${s.icon} ${s.name}`;
    // Set data-season attribute for environment scene CSS
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

// Night motes - floating particles for nighttime ambience
function setupNightMotes() {
    const container = document.getElementById('nightMotes');
    if (!container || container.children.length > 0) return;
    
    const moteCount = 15;
    for (let i = 0; i < moteCount; i++) {
        const mote = document.createElement('div');
        mote.className = 'night-mote';
        mote.style.cssText = `
            left: ${Math.random() * 100}%;
            top: ${30 + Math.random() * 50}%;
            --dur: ${10 + Math.random() * 8}s;
            --delay: ${Math.random() * -15}s;
        `;
        container.appendChild(mote);
    }
}

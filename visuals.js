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
        if (!ctx) return;
        this._ensureDropletFX();
        const freq = this._midiToFreq(midi);
        const o1 = ctx.createOscillator();
        const o2 = ctx.createOscillator();
        o1.type = 'triangle';
        o2.type = 'sine';
        o1.frequency.setValueAtTime(freq, t);
        o2.frequency.setValueAtTime(freq * 2, t);
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

    // ============================================
    // EXPANDED ZEN MELODY SYSTEM
    // 6-minute non-repeating contemplative music
    // ============================================

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
            this.bgFilter.frequency.value = 900;
            this.bgFilter.Q.value = 0.5;
            this.bgFilter.connect(this.bgMasterGain);
        }

        const LOOP_SECONDS = 360;
        
        // Expanded chord progression - 24 chords for more harmonic journey
        const CHORDS = [
            [48, 55, 62, 67], [48, 55, 60, 64], [45, 52, 57, 62], [45, 52, 60, 64],
            [43, 50, 55, 59], [43, 50, 57, 62], [41, 48, 55, 60], [41, 48, 53, 57],
            [40, 47, 52, 55], [40, 47, 55, 59], [38, 45, 52, 57], [38, 45, 50, 57],
            [36, 43, 48, 55], [36, 43, 50, 55], [41, 48, 53, 60], [43, 48, 55, 60],
            [45, 50, 57, 62], [45, 52, 57, 60], [43, 50, 55, 62], [43, 50, 57, 60],
            [41, 48, 55, 60], [40, 48, 55, 60], [43, 48, 55, 60], [48, 55, 60, 67]
        ];

        const SEASON_MELODIES = {
            // SPRING: Awakening, hopeful - pentatonic with gentle rises
            0: {
                phrases: [
                    [{ bass: 48, notes: [67] }, { notes: [64] }, null, { notes: [62] }, { bass: 43, notes: [67] }, { notes: [69] }, { notes: [67] }, null, { notes: [64] }, { bass: 45, notes: [62] }, { notes: [64] }, { notes: [67] }],
                    [{ bass: 48, notes: [72] }, { notes: [71] }, { notes: [69] }, null, { bass: 45, notes: [67] }, { notes: [69] }, { notes: [72] }, { notes: [69] }, null, { bass: 43, notes: [67] }, { notes: [64] }, { notes: [67] }],
                    [{ bass: 41, notes: [69] }, { notes: [72] }, { notes: [74] }, null, { notes: [72] }, { bass: 43, notes: [71] }, { notes: [69] }, null, { notes: [67] }, { bass: 48, notes: [64] }, { notes: [67] }, { notes: [64] }],
                    [{ bass: 45, notes: [76] }, { notes: [74] }, null, { notes: [72] }, { bass: 48, notes: [69] }, { notes: [71] }, { notes: [72] }, null, { notes: [69] }, { bass: 43, notes: [67] }, null, { notes: [72] }],
                    [{ bass: 41, notes: [72] }, { notes: [69] }, { notes: [67] }, null, { bass: 45, notes: [64] }, { notes: [67] }, null, { notes: [69] }, { bass: 48, notes: [67] }, { notes: [64] }, null, { notes: [67] }],
                    [{ bass: 43, notes: [67] }, null, { notes: [64] }, { notes: [62] }, { bass: 48, notes: [60] }, null, { notes: [62] }, { notes: [64] }, null, { bass: 48, notes: [67] }, null, null]
                ],
                amp: 0.022, bright: 0.95
            },
            // SUMMER: Warm, expansive - lydian/major, brighter
            1: {
                phrases: [
                    [{ bass: 50, notes: [69] }, { notes: [71] }, { notes: [74] }, null, { bass: 48, notes: [72] }, { notes: [74] }, { notes: [71] }, null, { notes: [69] }, { bass: 45, notes: [72] }, { notes: [69] }, { notes: [71] }],
                    [{ bass: 48, notes: [76] }, { notes: [74] }, null, { notes: [72] }, { bass: 50, notes: [74] }, { notes: [76] }, { notes: [74] }, null, { bass: 45, notes: [72] }, { notes: [74] }, { notes: [72] }, { notes: [69] }],
                    [{ bass: 43, notes: [74] }, { notes: [76] }, null, { notes: [74] }, { notes: [72] }, { bass: 48, notes: [71] }, null, { notes: [72] }, { notes: [74] }, { bass: 50, notes: [71] }, null, { notes: [69] }],
                    [{ bass: 45, notes: [69] }, null, { notes: [72] }, { notes: [74] }, { bass: 48, notes: [76] }, null, { notes: [74] }, null, { bass: 43, notes: [72] }, { notes: [71] }, { notes: [69] }, null],
                    [{ bass: 50, notes: [74] }, { notes: [72] }, null, { notes: [69] }, { bass: 48, notes: [71] }, { notes: [72] }, null, { notes: [69] }, { bass: 45, notes: [67] }, null, { notes: [69] }, { notes: [72] }],
                    [{ bass: 43, notes: [71] }, { notes: [69] }, null, { notes: [67] }, { bass: 48, notes: [69] }, null, { notes: [67] }, { notes: [64] }, { bass: 48, notes: [67] }, null, null, { notes: [64] }]
                ],
                amp: 0.024, bright: 1.05
            },
            // AUTUMN: Reflective, bittersweet - minor modes, descending
            2: {
                phrases: [
                    [{ bass: 45, notes: [64] }, { notes: [67] }, { notes: [69] }, null, { bass: 43, notes: [67] }, { notes: [65] }, null, { notes: [64] }, { bass: 45, notes: [62] }, { notes: [64] }, { notes: [67] }, null],
                    [{ bass: 41, notes: [72] }, { notes: [69] }, { notes: [67] }, null, { notes: [65] }, { bass: 45, notes: [64] }, null, { notes: [67] }, { notes: [65] }, { bass: 40, notes: [64] }, null, { notes: [62] }],
                    [{ bass: 45, notes: [69] }, { notes: [72] }, null, { notes: [71] }, { bass: 43, notes: [69] }, { notes: [67] }, { notes: [65] }, null, { bass: 41, notes: [64] }, { notes: [65] }, null, { notes: [64] }],
                    [{ bass: 38, notes: [65] }, null, { notes: [67] }, { notes: [69] }, { bass: 45, notes: [67] }, null, { notes: [65] }, { notes: [64] }, null, { bass: 40, notes: [62] }, { notes: [64] }, null],
                    [{ bass: 45, notes: [60] }, { notes: [62] }, null, { notes: [64] }, { bass: 41, notes: [65] }, null, { notes: [64] }, { notes: [62] }, { bass: 43, notes: [60] }, null, { notes: [62] }, null],
                    [{ bass: 45, notes: [64] }, null, { notes: [62] }, null, { bass: 40, notes: [60] }, { notes: [62] }, null, null, { bass: 45, notes: [60] }, null, null, null]
                ],
                amp: 0.019, bright: 0.85
            },
            // WINTER: Sparse, crystalline - lots of space, high sparkles
            3: {
                phrases: [
                    [{ bass: 36, notes: [67] }, null, null, { notes: [64] }, null, { bass: 38, notes: [62] }, null, null, { notes: [65] }, null, { notes: [64] }, null],
                    [{ bass: 41, notes: [72] }, null, null, { notes: [71] }, null, null, { bass: 36, notes: [69] }, null, { notes: [67] }, null, null, { notes: [65] }],
                    [{ bass: 33, notes: [76] }, null, null, null, { notes: [74] }, null, { bass: 38, notes: [72] }, null, null, { notes: [69] }, null, null],
                    [{ bass: 36 }, null, null, { notes: [67] }, null, null, null, { bass: 41, notes: [65] }, null, null, { notes: [64] }, null],
                    [{ bass: 38, notes: [74] }, null, { notes: [72] }, null, null, { bass: 36, notes: [71] }, null, null, null, { notes: [67] }, null, null],
                    [{ bass: 41, notes: [65] }, null, null, null, { notes: [64] }, null, { bass: 36, notes: [60] }, null, null, null, null, null]
                ],
                amp: 0.017, bright: 0.75
            }
        };

        const pickSeasonMelody = () => {
            const si = this._getSeasonIndex();
            return SEASON_MELODIES[si] || SEASON_MELODIES[0];
        };

        const makeEvents = (seed) => {
            const rand = this._mulberry32(seed);
            const ev = [];
            const CHORD_INTERVAL = 15;
            const NUM_CHORDS = Math.floor(LOOP_SECONDS / CHORD_INTERVAL);
            const MELODY_SLOT_TIME = 5;
            const melody = pickSeasonMelody();

            for (let i = 0; i < NUM_CHORDS; i++) {
                const tt = i * CHORD_INTERVAL;
                let stack = CHORDS[i % CHORDS.length].slice();
                if (rand() < 0.25) stack = [...stack.slice(1), stack[0] + 12];
                if (rand() < 0.10) stack.push(stack[stack.length - 1] + 7);
                ev.push({ t: tt, type: 'chord', midi: stack });
            }

            let globalSlot = 0;
            for (let phraseIdx = 0; phraseIdx < melody.phrases.length; phraseIdx++) {
                const phrase = melody.phrases[phraseIdx];
                for (let slotIdx = 0; slotIdx < phrase.length; slotIdx++) {
                    const slot = phrase[slotIdx];
                    const tt = globalSlot * MELODY_SLOT_TIME;
                    if (slot) {
                        const baseAmp = melody.amp;
                        const bright = melody.bright;
                        const humanize = (rand() - 0.5) * 0.4;
                        if (Number.isFinite(slot.bass)) {
                            ev.push({ t: tt + 0.3 + humanize, type: 'melody', midi: [slot.bass], amp: baseAmp * 0.5, bright: Math.max(0.55, bright - 0.3) });
                        }
                        const notes = slot.notes || [];
                        if (notes.length > 0) {
                            if (rand() < 0.12) {
                                const grace = notes[0] + (rand() < 0.5 ? 2 : -1);
                                ev.push({ t: tt + 1.8 + humanize - 0.15, type: 'melody', midi: [grace], amp: baseAmp * 0.3, bright: bright * 0.9 });
                            }
                            ev.push({ t: tt + 2.0 + humanize, type: 'melody', midi: [notes[0]], amp: baseAmp, bright: bright });
                            if (notes.length > 1) {
                                ev.push({ t: tt + 3.5 + humanize + rand() * 0.3, type: 'melody', midi: [notes[1]], amp: baseAmp * 0.85, bright: bright });
                            }
                        }
                    }
                    globalSlot++;
                }
            }

            const bellPool = [79, 81, 83, 84, 86, 88];
            let bellTime = 25 + rand() * 20;
            while (bellTime < LOOP_SECONDS - 10) {
                if (rand() < 0.6) {
                    ev.push({ t: bellTime, type: 'bell', midi: [bellPool[Math.floor(rand() * bellPool.length)]] });
                }
                bellTime += 30 + rand() * 35;
            }
            return ev;
        };

        const playAmbientPad = (t, chordMidi) => {
            const ctx = this.ctx, dur = 14;
            chordMidi.forEach((m, i) => {
                const o = ctx.createOscillator(), g = ctx.createGain();
                o.type = 'sine';
                o.frequency.setValueAtTime(this._midiToFreq(m), t);
                o.detune.setValueAtTime((i - (chordMidi.length - 1) / 2) * 3 + (Math.random() - 0.5) * 5, t);
                g.gain.setValueAtTime(0, t);
                g.gain.linearRampToValueAtTime(0.065, t + 3.5);
                g.gain.setValueAtTime(0.065, t + dur - 4.5);
                g.gain.exponentialRampToValueAtTime(0.001, t + dur);
                o.connect(g); g.connect(this.bgFilter);
                o.start(t); o.stop(t + dur + 0.1);
            });
        };

        const playAmbientBell = (t, midi) => {
            const ctx = this.ctx, o = ctx.createOscillator(), g = ctx.createGain();
            o.type = 'sine';
            o.frequency.setValueAtTime(this._midiToFreq(midi), t);
            g.gain.setValueAtTime(0, t);
            g.gain.linearRampToValueAtTime(0.022, t + 0.5);
            g.gain.exponentialRampToValueAtTime(0.001, t + 6);
            o.connect(g); g.connect(this.bgFilter);
            o.start(t); o.stop(t + 6.5);
        };

        const scheduleLoop = () => {
            if (!this.isMusicPlaying) return;
            const events = makeEvents(Date.now() % 10000);
            const startAt = this.ctx.currentTime + 0.1;
            for (const e of events) {
                const when = startAt + e.t;
                const delayMs = Math.max(0, (when - this.ctx.currentTime) * 1000);
                const id = setTimeout(() => {
                    if (!this.isMusicPlaying) return;
                    try {
                        if (e.type === 'chord') playAmbientPad(when, e.midi);
                        else if (e.type === 'melody') this._playPianoDropletAt(when, e.midi[0], e.amp || 0.018, e.bright || 1.0);
                        else if (e.type === 'bell') playAmbientBell(when, e.midi[0]);
                    } catch (_) { }
                }, delayMs);
                this.bgTimers.push(id);
            }
            const loopId = setTimeout(() => {
                this.bgTimers.forEach(id => clearTimeout(id));
                this.bgTimers = [];
                scheduleLoop();
            }, (LOOP_SECONDS + 0.5) * 1000);
            this.bgTimers.push(loopId);
        };
        scheduleLoop();
    },

    stopBackgroundMusic() {
        this.isMusicPlaying = false;
        this.bgTimers.forEach(id => clearTimeout(id));
        this.bgTimers = [];
    }
};

function initPatterns() {
    const defs = document.getElementById('plantDefs');
    if (defs) {
        defs.innerHTML += `<pattern id="patNone" width="10" height="10" patternUnits="userSpaceOnUse"></pattern><pattern id="patStripes" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="4" height="8" fill="var(--pot-pat-color)"/></pattern><pattern id="patHearts" width="16" height="16" patternUnits="userSpaceOnUse"><path d="M8 5C8 3 6 2 4 3 2 4 2 7 4 9L8 13 12 9C14 7 14 4 12 3 10 2 8 3 8 5" fill="var(--pot-pat-color)" transform="scale(0.8)translate(2,2)"/></pattern><pattern id="patWaves" width="20" height="10" patternUnits="userSpaceOnUse"><path d="M0 5Q5 0 10 5T20 5" fill="none" stroke="var(--pot-pat-color)" stroke-width="2"/></pattern><pattern id="patNotes" width="16" height="16" patternUnits="userSpaceOnUse"><circle cx="6" cy="10" r="3" fill="var(--pot-pat-color)"/><path d="M9 10V3H14" fill="none" stroke="var(--pot-pat-color)" stroke-width="1.5"/></pattern><pattern id="patChecks" width="12" height="12" patternUnits="userSpaceOnUse"><rect width="6" height="6" fill="var(--pot-pat-color)"/><rect x="6" y="6" width="6" height="6" fill="var(--pot-pat-color)"/></pattern><pattern id="patStars" width="20" height="20" patternUnits="userSpaceOnUse"><polygon points="10,2 12,8 18,8 13,12 15,18 10,14 5,18 7,12 2,8 8,8" fill="var(--pot-pat-color)" transform="scale(0.7)translate(4,4)"/></pattern><pattern id="patDiamonds" width="14" height="14" patternUnits="userSpaceOnUse"><polygon points="7,1 13,7 7,13 1,7" fill="var(--pot-pat-color)" transform="scale(0.7)translate(3,3)"/></pattern><pattern id="patLeaves" width="14" height="14" patternUnits="userSpaceOnUse"><path d="M7 2Q10 5 7 11 4 5 7 2" fill="var(--pot-pat-color)"/></pattern><pattern id="patMoons" width="16" height="16" patternUnits="userSpaceOnUse"><path d="M10 3A5 5 0 1 1 10 13A4 4 0 1 0 10 3" fill="var(--pot-pat-color)"/></pattern>`;
    }
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
            mote.style.cssText = `left:${Math.random()*100}%;top:${20+Math.random()*60}%;--dur:${10+Math.random()*8}s;--delay:${Math.random()*10}s;`;
            container.appendChild(mote);
        }
    } else if (!isNight && container.children.length > 0) {
        container.innerHTML = '';
    }
}

function getMoonPhase() {
    const n = new Date(), jd = Math.floor(365.25 * n.getFullYear()) + Math.floor(30.6 * (n.getMonth() + 1)) + n.getDate() - 694039.09, p = jd / 29.53058867;
    return MOON_PHASES[Math.floor((p - Math.floor(p)) * 8) % 8];
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
    const fragment = document.createDocumentFragment();
    const isLowPower = CONFIG.performance?.lowPowerMode;
    
    if (sn === 'Spring') {
        const count = isLowPower ? 5 : 10;
        for (let i = 0; i < count; i++) {
            const b = document.createElement('div');
            b.className = 'seasonal-blossom';
            b.style.left = (Math.random() * 120 - 10) + '%';
            b.style.animationDelay = (Math.random() * -30) + 's';
            b.style.animationDuration = (18 + Math.random() * 12) + 's';
            fragment.appendChild(b);
        }
    } else if (sn === 'Summer') {
        if (isDaytime()) {
            const h = document.createElement('div');
            h.className = 'seasonal-heatwave';
            h.style.animationDelay = (Math.random() * -3) + 's';
            h.style.animationDuration = (5 + Math.random() * 3) + 's';
            fragment.appendChild(h);
            const beamCount = isLowPower ? 1 : 2;
            for (let i = 0; i < beamCount; i++) {
                const b = document.createElement('div');
                b.className = 'seasonal-beam';
                b.style.left = (20 + Math.random() * 60) + '%';
                b.style.transform = 'rotate(-20deg)';
                b.style.animationDelay = (Math.random() * -5) + 's';
                fragment.appendChild(b);
            }
        }
    } else if (sn === 'Autumn') {
        const count = isLowPower ? 5 : 10;
        for (let i = 0; i < count; i++) {
            const l = document.createElement('div');
            l.className = 'seasonal-leaf';
            l.style.left = (Math.random() * 120 - 20) + '%';
            l.style.animationDelay = (Math.random() * -25) + 's';
            l.style.animationDuration = (15 + Math.random() * 10) + 's';
            l.style.backgroundColor = ['#e67e22', '#d35400', '#f1c40f'][Math.floor(Math.random() * 3)];
            fragment.appendChild(l);
        }
    } else if (sn === 'Winter') {
        const count = isLowPower ? 20 : 40;
        for (let i = 0; i < count; i++) {
            const s = document.createElement('div');
            s.className = 'seasonal-snow';
            s.style.left = Math.random() * 100 + '%';
            s.style.animationDelay = (Math.random() * -20) + 's';
            s.style.animationDuration = (10 + Math.random() * 5) + 's';
            fragment.appendChild(s);
        }
    }
    c.appendChild(fragment);
}

function setupWorld() {
    const c = Math.min(80, 20 + state.generation * 8), s = document.getElementById('starsContainer');
    if (s) {
        s.innerHTML = '';
        const fragment = document.createDocumentFragment();
        const starCount = CONFIG.performance?.lowPowerMode ? Math.floor(c * 0.6) : c;
        for (let i = 0; i < starCount; i++) {
            const star = document.createElement('div');
            star.className = 'star';
            star.style.cssText = `left:${Math.random()*100}%;top:${Math.random()*60}%;--dur:${3+Math.random()*4}s;--delay:${Math.random()*5}s;--brightness:${0.4+Math.random()*0.6}`;
            fragment.appendChild(star);
        }
        s.appendChild(fragment);
    }
}

function setupWeather() {
    const r = document.getElementById('rainContainer');
    if (r) {
        r.innerHTML = '';
        const fragment = document.createDocumentFragment();
        const dropCount = CONFIG.performance?.lowPowerMode ? 30 : 60;
        for (let i = 0; i < dropCount; i++) {
            const d = document.createElement('div');
            d.className = 'raindrop';
            d.style.cssText = `left:${Math.random()*100}%;animation-delay:${Math.random()*2}s;animation-duration:${0.6+Math.random()*0.4}s`;
            fragment.appendChild(d);
        }
        r.appendChild(fragment);
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
    const moteCount = 15;
    for (let i = 0; i < moteCount; i++) {
        const mote = document.createElement('div');
        mote.className = 'night-mote';
        mote.style.cssText = `left:${Math.random()*100}%;top:${30+Math.random()*50}%;--dur:${10+Math.random()*8}s;--delay:${Math.random()*-15}s;`;
        container.appendChild(mote);
    }
}

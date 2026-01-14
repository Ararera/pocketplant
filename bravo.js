function renderPlant(containerId, dna, stage, scarsOverride = null) {
    const g = document.getElementById(containerId);
    if (!g || !dna) return;
    g.innerHTML = '';
    const scars = scarsOverride || state.scars || [];
    const hasWilt = scars.includes('wilt'),
        hasBend = scars.includes('bend'),
        hasPale = scars.includes('pale');
    let cH = dna.colorH,
        cS = dna.colorS,
        cL = dna.colorL;
    if (hasPale) {
        cS = Math.max(20, cS - 30);
        cL = Math.min(70, cL + 15)
    }
    const stemColor = `hsl(${cH},${cS}%,${cL}%)`,
        leafColor = `hsl(${cH},${cS}%,${cL+10}%)`,
        flowerColor = dna.flowerColor;
    const lean = dna.leanDirection || 1,
        bendOff = hasBend ? lean * 15 : 0,
        wiltAng = hasWilt ? 20 : 0;

    const baseY = 189;
    const stemH = dna.stemHeight * (0.3 + stage * 0.175);
    const curve = (dna.stemCurve || 0) + bendOff;

    const stemStartX = 100,
        stemStartY = baseY;
    const stemCtrlX = 100 + curve,
        stemCtrlY = baseY - stemH / 2;
    const stemEndX = 100 + curve / 2,
        stemEndY = baseY - stemH;

    function getPointOnStem(t) {
        const x = (1 - t) * (1 - t) * stemStartX + 2 * (1 - t) * t * stemCtrlX + t * t * stemEndX;
        const y = (1 - t) * (1 - t) * stemStartY + 2 * (1 - t) * t * stemCtrlY + t * t * stemEndY;
        return {
            x,
            y
        }
    }

    if (stage >= 1) {
        const stem = createSVGElement('path');
        stem.setAttribute('d', `M${stemStartX} ${stemStartY} Q${stemCtrlX} ${stemCtrlY} ${stemEndX} ${stemEndY}`);
        stem.setAttribute('stroke', stemColor);
        stem.setAttribute('stroke-width', 3 + stage * 0.5);
        stem.setAttribute('fill', 'none');
        stem.setAttribute('stroke-linecap', 'round');
        g.appendChild(stem)
    }

    if (stage >= 2) {
        const lc = Math.min(dna.leafCount || 3, stage);
        for (let i = 0; i < lc; i++) {
            const t = 0.25 + (i / lc) * 0.5;
            const pt = getPointOnStem(t);
            const side = i % 2 === 0 ? -1 : 1;
            const ang = (dna.leafAngle || 45) * side + (hasWilt ? wiltAng * side : 0);
            renderLeaf(g, pt.x, pt.y, ang, dna.leafSize || 1, leafColor, dna.leafShape || 'round')
        }
    }

    if (stage === 3) {
        const bud = createSVGElement('ellipse');
        bud.setAttribute('cx', stemEndX);
        bud.setAttribute('cy', stemEndY);
        bud.setAttribute('rx', 6);
        bud.setAttribute('ry', 8);
        bud.setAttribute('fill', `hsl(${dna.flowerH},${dna.flowerS*0.5}%,${dna.flowerL-10}%)`);
        g.appendChild(bud)
    }

    if (stage >= 4) {
        const flowerScale = stage >= 5 ? 1.5 : 1.2;
        renderFlower(g, stemEndX, stemEndY - 5, dna.petalCount || 5, dna.petalShape || 'round', flowerColor, flowerScale);

        if (dna.flowerCount >= 2 && stage >= 5) {
            const branchPt1 = getPointOnStem(0.55);
            const branch1EndX = branchPt1.x + lean * -30;
            const branch1EndY = branchPt1.y - 25;
            const branch1 = createSVGElement('path');
            branch1.setAttribute('d', `M${branchPt1.x} ${branchPt1.y} Q${branchPt1.x+lean*-15} ${branchPt1.y-12} ${branch1EndX} ${branch1EndY}`);
            branch1.setAttribute('stroke', stemColor);
            branch1.setAttribute('stroke-width', 2);
            branch1.setAttribute('fill', 'none');
            branch1.setAttribute('stroke-linecap', 'round');
            g.appendChild(branch1);
            renderFlower(g, branch1EndX, branch1EndY - 3, dna.petalCount || 5, dna.petalShape || 'round', flowerColor, 0.9)
        }
        if (dna.flowerCount >= 3 && stage >= 5) {
            const branchPt2 = getPointOnStem(0.70);
            const branch2EndX = branchPt2.x + lean * 25;
            const branch2EndY = branchPt2.y - 18;
            const branch2 = createSVGElement('path');
            branch2.setAttribute('d', `M${branchPt2.x} ${branchPt2.y} Q${branchPt2.x+lean*12} ${branchPt2.y-9} ${branch2EndX} ${branch2EndY}`);
            branch2.setAttribute('stroke', stemColor);
            branch2.setAttribute('stroke-width', 2);
            branch2.setAttribute('fill', 'none');
            branch2.setAttribute('stroke-linecap', 'round');
            g.appendChild(branch2);
            renderFlower(g, branch2EndX, branch2EndY - 3, dna.petalCount || 5, dna.petalShape || 'round', flowerColor, 0.8)
        }
    }
}

function renderLeaf(g, x, y, angle, scale, color, shape) {
    const leaf = createSVGElement('path'),
        sz = scale * 15;
    const paths = {
        pointed: `M0,0 Q${-sz*0.5},${-sz} 0,${-sz*1.5} Q${sz*0.5},${-sz} 0,0`,
        heart: `M0,0 C${-sz*0.8},${-sz*0.3} ${-sz*0.8},${-sz} 0,${-sz*1.2} C${sz*0.8},${-sz} ${sz*0.8},${-sz*0.3} 0,0`,
        oak: `M0,0 Q${-sz*0.3},${-sz*0.4} ${-sz*0.5},${-sz*0.5} Q${-sz*0.3},${-sz*0.8} 0,${-sz*1.2} Q${sz*0.3},${-sz*0.8} ${sz*0.5},${-sz*0.5} Q${sz*0.3},${-sz*0.4} 0,0`,
        round: `M0,0 Q${-sz*0.7},${-sz*0.7} 0,${-sz*1.3} Q${sz*0.7},${-sz*0.7} 0,0`
    };
    leaf.setAttribute('d', paths[shape] || paths.round);
    leaf.setAttribute('fill', color);
    leaf.setAttribute('transform', `translate(${x},${y}) rotate(${angle})`);
    g.appendChild(leaf)
}

function renderFlower(g, x, y, count, shape, color, scale) {
    const fg = createSVGElement('g');
    fg.setAttribute('transform', `translate(${x},${y})`);
    const sz = 12 * scale;
    const paths = {
        pointed: `M0,0 Q${sz*0.3},${-sz*0.7} 0,${-sz} Q${-sz*0.3},${-sz*0.7} 0,0`,
        wavy: `M0,0 C${sz*0.4},${-sz*0.3} ${sz*0.2},${-sz*0.7} 0,${-sz} C${-sz*0.2},${-sz*0.7} ${-sz*0.4},${-sz*0.3} 0,0`,
        round: `M0,0 Q${sz*0.5},${-sz*0.5} 0,${-sz} Q${-sz*0.5},${-sz*0.5} 0,0`
    };
    for (let i = 0; i < count; i++) {
        const p = createSVGElement('path');
        p.setAttribute('d', paths[shape] || paths.round);
        p.setAttribute('fill', color);
        p.setAttribute('transform', `rotate(${(360/count)*i})`);
        p.style.opacity = '0.9';
        fg.appendChild(p)
    }
    const c = createSVGElement('circle');
    c.setAttribute('r', 4 * scale);
    c.setAttribute('fill', '#fbbf24');
    fg.appendChild(c);
    g.appendChild(fg)
}

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
            g.appendChild(pat)
        }
    }
    updateMainPot()
}

function updateMainPot() {
    document.documentElement.style.setProperty('--pot-color', state.potColor);
    document.documentElement.style.setProperty('--pot-pat-color', state.potPatternColor);
    const p = document.getElementById('potPatternPath');
    if (p) p.setAttribute('fill', state.potPattern ? `url(#${state.potPattern})` : 'none');

    // --- Soil Contamination Visuals ---
    const dirtEls = document.querySelectorAll('.dirt, .dirt-top');
    const contamination = state.soilContamination || 0;
    // As contamination goes up, dirt gets grey and slightly darker/washed out
    dirtEls.forEach(el => {
        el.style.transition = "filter 1s ease";
        el.style.filter = `grayscale(${contamination}%) brightness(${100 - (contamination * 0.15)}%)`;
    });

    // When soil contamination hits 100%, the plant turns grayscale
    const pg = document.getElementById('plantGroup');
    if (pg) {
        if ((state.soilContamination || 0) >= 100 && !state.isDead) {
            pg.style.transition = "filter 1s ease";
            pg.style.filter = "grayscale(100%)";
        } else {
            // Clear only our contamination filter; other states (dead/dormant) are handled via classes elsewhere
            pg.style.filter = "";
        }
    }
}

function initPatterns() {
    const defs = document.getElementById('plantDefs');
    if (defs) {
        defs.innerHTML += `<pattern id="patNone" width="10" height="10" patternUnits="userSpaceOnUse"></pattern><pattern id="patStripes" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="4" height="8" fill="var(--pot-pat-color)"/></pattern><pattern id="patHearts" width="16" height="16" patternUnits="userSpaceOnUse"><path d="M8 5C8 3 6 2 4 3 2 4 2 7 4 9L8 13 12 9C14 7 14 4 12 3 10 2 8 3 8 5" fill="var(--pot-pat-color)" transform="scale(0.8)translate(2,2)"/></pattern><pattern id="patWaves" width="20" height="10" patternUnits="userSpaceOnUse"><path d="M0 5Q5 0 10 5T20 5" fill="none" stroke="var(--pot-pat-color)" stroke-width="2"/></pattern><pattern id="patNotes" width="16" height="16" patternUnits="userSpaceOnUse"><circle cx="6" cy="10" r="3" fill="var(--pot-pat-color)"/><path d="M9 10V3H14" fill="none" stroke="var(--pot-pat-color)" stroke-width="1.5"/></pattern><pattern id="patChecks" width="12" height="12" patternUnits="userSpaceOnUse"><rect width="6" height="6" fill="var(--pot-pat-color)"/><rect x="6" y="6" width="6" height="6" fill="var(--pot-pat-color)"/></pattern><pattern id="patStars" width="20" height="20" patternUnits="userSpaceOnUse"><polygon points="10,2 12,8 18,8 13,12 15,18 10,14 5,18 7,12 2,8 8,8" fill="var(--pot-pat-color)" transform="scale(0.7)translate(4,4)"/></pattern><pattern id="patDiamonds" width="14" height="14" patternUnits="userSpaceOnUse"><polygon points="7,1 13,7 7,13 1,7" fill="var(--pot-pat-color)" transform="scale(0.7)translate(3,3)"/></pattern><pattern id="patLeaves" width="14" height="14" patternUnits="userSpaceOnUse"><path d="M7 2Q10 5 7 11 4 5 7 2" fill="var(--pot-pat-color)"/></pattern><pattern id="patMoons" width="16" height="16" patternUnits="userSpaceOnUse"><path d="M10 3A5 5 0 1 1 10 13A4 4 0 1 0 10 3" fill="var(--pot-pat-color)"/></pattern>`;
    }
    ['previewDefs', 'harvestDefs', 'archiveDefs'].forEach(id => {
        const d = document.getElementById(id);
        if (d && defs) d.innerHTML = defs.innerHTML
    });
}

function getTimeOfDay() {
    const h = new Date().getHours();
    if (h >= 5 && h < 7) return 'dawn';
    if (h >= 7 && h < 10) return 'morning';
    if (h >= 10 && h < 16) return 'day';
    if (h >= 16 && h < 18) return 'afternoon';
    if (h >= 18 && h < 20) return 'dusk';
    if (h >= 20 && h < 22) return 'evening';
    return 'night'
}

function isDaytime() {
    return ['dawn', 'morning', 'day', 'afternoon', 'dusk'].includes(getTimeOfDay())
}

function updateTimeOfDay() {
    const t = getTimeOfDay();
    document.body.className = document.body.className.replace(/time-\w+/g, '');
    document.body.classList.add('time-' + t);
    updateSeasonalVisuals()
}

function getMoonPhase() {
    const n = new Date(),
        jd = Math.floor(365.25 * n.getFullYear()) + Math.floor(30.6 * (n.getMonth() + 1)) + n.getDate() - 694039.09,
        p = jd / 29.53058867;
    return MOON_PHASES[Math.floor((p - Math.floor(p)) * 8) % 8]
}

function updateMoonPhase() {
    const p = getMoonPhase();
    const me = document.getElementById('moonElement');
    if (me) me.style.setProperty('--moon-phase', p.phase + '%');
    updateSeason()
}

function isNewMoon() {
    return getMoonPhase().name === 'New Moon'
}

function updateSeason() {
    const s = SEASONS[state.season % 4];
    const i = document.getElementById('seasonIndicator');
    if (i) i.textContent = `${s.icon} ${s.name}`;
    updateSeasonalVisuals()
}

function updateSeasonalVisuals() {
    const c = document.getElementById('seasonalContainer');
    if (!c) return;
    const sn = SEASONS[state.season % 4].name;
    const currentKey = sn + (sn === 'Summer' ? isDaytime() : '');
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
            c.appendChild(b)
        }
    } else if (sn === 'Summer') {
        if (isDaytime()) {
            for (let i = 0; i < 3; i++) {
                const b = document.createElement('div');
                b.className = 'seasonal-beam';
                b.style.left = (20 + Math.random() * 60) + '%';
                b.style.animationDelay = (Math.random() * -5) + 's';
                c.appendChild(b)
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
            c.appendChild(l)
        }
    } else if (sn === 'Winter') {
        for (let i = 0; i < 40; i++) {
            const s = document.createElement('div');
            s.className = 'seasonal-snow';
            s.style.left = Math.random() * 100 + '%';
            s.style.animationDelay = (Math.random() * -20) + 's';
            s.style.animationDuration = (10 + Math.random() * 5) + 's';
            c.appendChild(s)
        }
    }
}

function setupWorld() {
    const c = Math.min(80, 20 + state.generation * 8),
        s = document.getElementById('starsContainer');
    if (s) {
        s.innerHTML = '';
        for (let i = 0; i < c; i++) {
            const star = document.createElement('div');
            star.className = 'star';
            star.style.cssText = `left:${Math.random()*100}%;top:${Math.random()*60}%;--dur:${3+Math.random()*4}s;--delay:${5*Math.random()}s;--brightness:${0.4+Math.random()*0.6}`;
            s.appendChild(star)
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
            d.style.cssText = `left:${Math.random()*100}%;animation-delay:${Math.random()*2}s;animation-duration:${0.6+Math.random()*0.4}s`;
            r.appendChild(d)
        }
    }
}

let lastTickTime = Date.now(),
    saveDebounceTimer = null;

function startGameLoop() {
    setInterval(gameTick, CONFIG.tickRate)
}

function gameTick() {
    if (state.isDead || document.visibilityState !== 'visible') return;
    lastTickTime = Date.now();
    decay();
    checkDeath();
    grow();
    processBuffs();
    processGuardians();
    attemptSpawnFirefly();
    if (!saveDebounceTimer) {
        saveDebounceTimer = setTimeout(() => {
            saveState();
            saveDebounceTimer = null
        }, 5000)
    }
    render()
}

function decay() {
    const res = state.dna?.resilience || 1,
        slow = state.buffs.find(b => b.type === 'slow') ? 0.5 : 1;
    
    const hasGlassSkin = state.inheritedTraits.includes('glassSkin');
    const hasStormBorn = state.inheritedTraits.includes('stormBorn');

    if (state.isRainOn) {
        state.water = Math.min(100, state.water + 0.2);
        if (state.water >= 95 && !hasStormBorn && Math.random() > 0.95) spawnFloatingText("Too Wet!", "#ff6b6b")
    } else {
        let waterDecay = CONFIG.decayRate.water;
        if (hasGlassSkin) waterDecay *= 0.7;
        state.water = Math.max(0, state.water - (waterDecay / res) * slow)
    }
    
    if (state.isSunLampOn) {
        if (isDaytime()) state.sun = Math.min(100, state.sun + 0.5);
        else if (!isNewMoon()) state.sun = Math.min(100, state.sun + 0.2);
        if (state.sun > 90) {
            state.water = Math.max(0, state.water - 0.2);
            if (hasGlassSkin && Math.random() > 0.95) spawnFloatingText("Fragile!", "orange");
            else if (Math.random() > 0.97) spawnFloatingText("Scorching!", "orange");
        }
    } else {
        state.sun = Math.max(0, state.sun - (CONFIG.decayRate.sun / res) * slow)
    }
    state.love = Math.max(0, state.love - (CONFIG.decayRate.love / res) * slow * 0.5);

    // Soil Contamination Build-up
    state.soilContamination = Math.min(100, (state.soilContamination || 0) + CONFIG.contaminationRate);
}

function checkDeath() {
    const crisis = state.water <= 10 && state.sun <= 10 && state.love <= 10;
    if (crisis) {
        state.timeAtZero += CONFIG.tickRate;
        const hrs = state.timeAtZero / (1000 * 60 * 60);
        if (hrs >= 1 && !state.scars.includes('wilt')) {
            state.scars.push('wilt');
            spawnFloatingText("Leaves wilting...", "#f87171");
            renderPlant('plantGroup', state.dna, state.stage)
        }
        if (hrs >= 3 && !state.scars.includes('bend')) {
            state.scars.push('bend');
            spawnFloatingText("Stem bending...", "#f87171");
            renderPlant('plantGroup', state.dna, state.stage)
        }
        if (hrs >= 6 && !state.scars.includes('pale')) {
            state.scars.push('pale');
            spawnFloatingText("Colors fading...", "#f87171");
            renderPlant('plantGroup', state.dna, state.stage)
        }
        if (hrs >= 9 && !state.scars.includes('dormant')) {
            state.scars.push('dormant');
            els.plantHero.classList.add('dormant-plant');
            spawnFloatingText("Entering dormancy...", "#f87171")
        }
        if (state.timeAtZero >= CONFIG.deathTimeLimit) triggerDeath()
    } else {
        if (state.timeAtZero > 0) state.timeAtZero = Math.max(0, state.timeAtZero - CONFIG.tickRate * 0.5);
        if (state.scars.includes('dormant') && getAverageVitality() > 50) els.plantHero.classList.remove('dormant-plant')
    }
}

function triggerDeath() {
    state.isDead = true;
    els.plantHero.classList.add('dead-plant');
    els.deathOverlay.classList.add('open');
    saveState()
}

function grow() {
    const happy = state.water > CONFIG.threshold && state.sun > CONFIG.threshold && state.love > CONFIG.threshold;
    const seasonG = SEASONS[state.season % 4].growth,
        bloom = state.dna?.bloomSpeed || 1,
        dormPen = state.scars.includes('dormant') ? 0.5 : 1;
        
    let multiplier = 1;
    if (state.inheritedTraits.includes('moonBloom') && !isDaytime()) multiplier = 1.5;

    // Growth penalty based on soil health
    const soilPenalty = 1 - ((state.soilContamination || 0) / 200);

    if (happy) state.growth += CONFIG.growthRate * state.growthMultiplier * seasonG * bloom * dormPen * multiplier * soilPenalty;
    let next = 1;
    for (let i = 1; i < STAGE_THRESHOLDS.length; i++)
        if (state.growth >= STAGE_THRESHOLDS[i]) next = i + 1;
    if (next > state.stage) {
        state.stage = next;
        els.plantHero.classList.add('evolving');
        setTimeout(() => els.plantHero.classList.remove('evolving'), 2000);
        renderPlant('plantGroup', state.dna, state.stage);
        spawnFloatingText("✨ EVOLVED!", "white");
        audio.chime()
    }
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
            state.love = Math.min(100, state.love + b.strength * 0.3)
        }
        return b.remaining > 0
    })
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
            state.love = Math.min(100, state.love + 0.01)
        }
    })
}

function getMood() {
    const avg = getAverageVitality();
    for (const [k, m] of Object.entries(MOODS))
        if (avg >= m.threshold) return m;
    return MOODS.dormant
}

function getPlantState() {
    const avg = getAverageVitality();
    if (avg >= 80) return PLANT_STATES.thriving;
    if (avg >= 60) return PLANT_STATES.content;
    if (avg >= 40) return PLANT_STATES.restless;
    if (avg >= 20) return PLANT_STATES.strained;
    return PLANT_STATES.dormant
}

function getAverageVitality() {
    return (state.water + state.sun + state.love) / 3
}
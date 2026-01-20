// rendering.js - SVG Generation and Main UI Updates

function renderPlant(containerId, dna, stage, scarsOverride = null) {
    const g = document.getElementById(containerId);
    if (!g || !dna) return;
    g.innerHTML = '';
    const scars = scarsOverride || state.scars || [];
    const hasWilt = scars.includes('wilt'), hasBend = scars.includes('bend'), hasPale = scars.includes('pale');
    let cH = dna.colorH, cS = dna.colorS, cL = dna.colorL;
    if (hasPale) { cS = Math.max(20, cS - 30); cL = Math.min(70, cL + 15); }
    const stemColor = `hsl(${cH},${cS}%,${cL}%)`, leafColor = `hsl(${cH},${cS}%,${cL + 10}%)`, flowerColor = dna.flowerColor;
    const stemsG = createSVGElement('g'), leavesG = createSVGElement('g'), flowersG = createSVGElement('g');
    g.appendChild(stemsG); g.appendChild(leavesG); g.appendChild(flowersG);
    const lean = dna.leanDirection || 1, bendOff = hasBend ? lean * 15 : 0, wiltAng = hasWilt ? 20 : 0, baseY = 189;
    const stemH = dna.stemHeight * (0.3 + stage * 0.175), curve = (dna.stemCurve || 0) + bendOff;
    const stemStartX = 100, stemStartY = baseY, stemCtrlX = 100 + curve, stemCtrlY = baseY - stemH / 2, stemEndX = 100 + curve / 2, stemEndY = baseY - stemH;
    const seed = (dna.seed || 0) + stage * 101;
    const rand = (function () {
        let a = (seed >>> 0) || 1;
        return function () {
            a |= 0; a = (a + 0x6D2B79F5) | 0;
            let t = Math.imul(a ^ (a >>> 15), 1 | a);
            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        }
    })();

    function getPointOnStem(t) {
        return {
            x: (1 - t) * (1 - t) * stemStartX + 2 * (1 - t) * t * stemCtrlX + t * t * stemEndX,
            y: (1 - t) * (1 - t) * stemStartY + 2 * (1 - t) * t * stemCtrlY + t * t * stemEndY
        };
    }

    if (stage >= 1) {
        const stem = createSVGElement('path');
        stem.setAttribute('d', `M${stemStartX} ${stemStartY} Q${stemCtrlX} ${stemCtrlY} ${stemEndX} ${stemEndY}`);
        stem.setAttribute('stroke', stemColor); stem.setAttribute('stroke-width', 3 + stage * 0.5);
        stem.setAttribute('fill', 'none'); stem.setAttribute('stroke-linecap', 'round');
        stemsG.appendChild(stem);
    }
    if (stage >= 2) {
        const lc = Math.min(dna.leafCount || 3, stage);
        const shapes = (dna.leafShapes && dna.leafShapes.length ? dna.leafShapes : [dna.leafShape || 'round']);
        const baseSize = dna.leafSize || 1, varAmt = dna.leafSizeVar || 0.2;
        for (let i = 0; i < lc; i++) {
            const t = 0.25 + (i / lc) * 0.5, pt = getPointOnStem(t), side = i % 2 === 0 ? -1 : 1;
            const ang = (dna.leafAngle || 45) * side + (hasWilt ? wiltAng * side : 0);
            const sz = baseSize * (1 + (rand() * 2 - 1) * varAmt), shape = shapes[Math.floor(rand() * shapes.length)] || 'round';
            renderLeaf(leavesG, pt.x, pt.y, ang, sz, leafColor, shape);
        }
    }
    if (stage === 3) {
        const bud = createSVGElement('ellipse');
        bud.setAttribute('cx', stemEndX); bud.setAttribute('cy', stemEndY);
        bud.setAttribute('rx', 6); bud.setAttribute('ry', 8);
        bud.setAttribute('fill', `hsl(${dna.flowerH},${dna.flowerS * 0.5}%,${dna.flowerL - 10}%)`);
        flowersG.appendChild(bud);
    }
    if (stage >= 4) {
        const flowerScale = stage >= 5 ? 1.3 : 1;
        renderFlower(flowersG, stemEndX, stemEndY - 5, dna.petalCount || 5, dna.petalShape || 'round', flowerColor, flowerScale);
        const shapes = (dna.leafShapes && dna.leafShapes.length ? dna.leafShapes : [dna.leafShape || 'round']);
        const baseSize = dna.leafSize || 1, varAmt = dna.leafSizeVar || 0.2;
        const makeBranch = (t, dx, dy, flowerScale2) => {
            const pt = getPointOnStem(t), endX = pt.x + dx, endY = pt.y + dy, br = createSVGElement('path');
            br.setAttribute('d', `M${pt.x} ${pt.y} Q${pt.x + dx * 0.5} ${pt.y + dy * 0.5} ${endX} ${endY}`);
            br.setAttribute('stroke', stemColor); br.setAttribute('stroke-width', 2);
            br.setAttribute('fill', 'none'); br.setAttribute('stroke-linecap', 'round');
            stemsG.appendChild(br);
            const leafN = 1 + (rand() > 0.55 ? 1 : 0);
            for (let i = 0; i < leafN; i++) {
                const side = (i % 2 === 0 ? -1 : 1), ang = (30 + rand() * 35) * side + (hasWilt ? wiltAng * side : 0);
                const sz = baseSize * (0.75 + rand() * 0.45) * (1 + (rand() * 2 - 1) * varAmt);
                const shape = shapes[Math.floor(rand() * shapes.length)] || 'round';
                renderLeaf(leavesG, endX, endY, ang, sz, leafColor, shape);
            }
            renderFlower(flowersG, endX, endY - 3, dna.petalCount || 5, dna.petalShape || 'round', flowerColor, flowerScale2);
        };
        if (dna.flowerCount >= 2 && stage >= 5) makeBranch(0.55, lean * -30, -25, 0.75);
        if (dna.flowerCount >= 3 && stage >= 5) makeBranch(0.70, lean * 25, -18, 0.65);
    }
}

function renderLeaf(g, x, y, angle, scale, color, shape) {
    const leaf = createSVGElement('path'), sz = scale * 15;
    const paths = {
        pointed: `M0,0 Q${-sz * 0.5},${-sz} 0,${-sz * 1.5} Q${sz * 0.5},${-sz} 0,0`,
        heart: `M0,0 C${-sz * 0.8},${-sz * 0.3} ${-sz * 0.8},${-sz} 0,${-sz * 1.2} C${sz * 0.8},${-sz} ${sz * 0.8},${-sz * 0.3} 0,0`,
        oak: `M0,0 Q${-sz * 0.3},${-sz * 0.4} ${-sz * 0.5},${-sz * 0.5} Q${-sz * 0.3},${-sz * 0.8} 0,${-sz * 1.2} Q${sz * 0.3},${-sz * 0.8} ${sz * 0.5},${-sz * 0.5} Q${sz * 0.3},${-sz * 0.4} 0,0`,
        round: `M0,0 Q${-sz * 0.7},${-sz * 0.7} 0,${-sz * 1.3} Q${sz * 0.7},${-sz * 0.7} 0,0`,
        teardrop: `M0,0 Q${-sz * 0.5},${-sz * 0.4} 0,${-sz * 1.5} Q${sz * 0.5},${-sz * 0.4} 0,0`,
        maple: `M0,0 Q${-sz * 0.2},${-sz * 0.2} ${-sz * 0.45},${-sz * 0.55} Q${-sz * 0.15},${-sz * 0.6} 0,${-sz * 1.2} Q${sz * 0.15},${-sz * 0.6} ${sz * 0.45},${-sz * 0.55} Q${sz * 0.2},${-sz * 0.2} 0,0`,
        fern: `M0,0 Q${-sz * 0.25},${-sz * 0.35} ${-sz * 0.15},${-sz * 0.6} Q${-sz * 0.35},${-sz * 0.8} 0,${-sz * 1.35} Q${sz * 0.35},${-sz * 0.8} ${sz * 0.15},${-sz * 0.6} Q${sz * 0.25},${-sz * 0.35} 0,0`,
        needle: `M0,0 Q${-sz * 0.15},${-sz * 0.6} 0,${-sz * 1.6} Q${sz * 0.15},${-sz * 0.6} 0,0`
    };
    leaf.setAttribute('d', paths[shape] || paths.round);
    leaf.setAttribute('fill', color);
    leaf.setAttribute('transform', `translate(${x},${y}) rotate(${angle})`);
    g.appendChild(leaf);
}

function renderFlower(g, x, y, count, shape, color, scale) {
    const fg = createSVGElement('g'); fg.setAttribute('transform', `translate(${x},${y})`);
    const sz = 12 * scale;
    const paths = {
        pointed: `M0,0 Q${sz * 0.3},${-sz * 0.7} 0,${-sz} Q${-sz * 0.3},${-sz * 0.7} 0,0`,
        wavy: `M0,0 C${sz * 0.4},${-sz * 0.3} ${sz * 0.2},${-sz * 0.7} 0,${-sz} C${-sz * 0.2},${-sz * 0.7} ${-sz * 0.4},${-sz * 0.3} 0,0`,
        round: `M0,0 Q${sz * 0.5},${-sz * 0.5} 0,${-sz} Q${-sz * 0.5},${-sz * 0.5} 0,0`
    };
    for (let i = 0; i < count; i++) {
        const p = createSVGElement('path');
        p.setAttribute('d', paths[shape] || paths.round);
        p.setAttribute('fill', color);
        p.setAttribute('transform', `rotate(${(360 / count) * i})`);
        p.style.opacity = '0.9';
        fg.appendChild(p);
    }
    const c = createSVGElement('circle');
    c.setAttribute('r', 4 * scale); c.setAttribute('fill', '#fbbf24');
    fg.appendChild(c);
    g.appendChild(fg);
}

function render() {
    if (els.ringWater) els.ringWater.style.strokeDashoffset = 283 * (1 - state.water / 100);
    if (els.ringSun) els.ringSun.style.strokeDashoffset = 264 * (1 - state.sun / 100);
    if (els.ringLove) els.ringLove.style.strokeDashoffset = 245 * (1 - state.love / 100);
    if (els.genBadge) els.genBadge.textContent = `CYCLE ${state.generation}`;
    if (els.plantNameDisplay) els.plantNameDisplay.textContent = state.name;
    const mood = getMood();
    if (els.plantMoodDisplay) { els.plantMoodDisplay.textContent = mood.text; els.plantMoodDisplay.style.color = mood.color; }
    if (els.btnSun) els.btnSun.classList.toggle('sun-active', state.isSunLampOn);
    if (els.btnRain) els.btnRain.classList.toggle('rain-active', state.isRainOn);
    if (els.evolutionBar) {
        if (state.stage < 6) {
            const prev = STAGE_THRESHOLDS[state.stage - 1] || 0, next = STAGE_THRESHOLDS[state.stage];
            els.evolutionBar.style.width = Math.min(100, ((state.growth - prev) / (next - prev)) * 100) + '%';
        } else els.evolutionBar.style.width = '100%';
    }
    const scale = Math.min(1.4, 1 + (state.growth / 6000));
    if (els.plantGraphics) els.plantGraphics.style.transform = `scale(${scale})`;
    if (els.menuOverlay && els.menuOverlay.classList.contains('open')) updateMenuStats();
    updateSeason();
}

function getMood() {
    const avg = getAverageVitality();
    for (const [k, m] of Object.entries(MOODS)) if (avg >= m.threshold) return m;
    return MOODS.dormant;
}

function getPlantState() {
    const avg = getAverageVitality();
    if (avg >= 80) return PLANT_STATES.thriving;
    if (avg >= 60) return PLANT_STATES.content;
    if (avg >= 40) return PLANT_STATES.restless;
    if (avg >= 20) return PLANT_STATES.strained;
    return PLANT_STATES.dormant;
}

function getAverageVitality() { return (state.water + state.sun + state.love) / 3; }
function updateUI() { render(); updateMenuStats(); }
function createSVGElement(tag) {
    return document.createElementNS('http://www.w3.org/2000/svg', tag);
}

function renderPlant(containerId, dna, stage, scarsOverride = null) {
    const g = document.getElementById(containerId);
    if (!g || !dna) return;
    g.innerHTML = '';
    
    const scars = scarsOverride || state.scars || [];
    const hasWilt = scars.includes('wilt'), hasBend = scars.includes('bend'), hasPale = scars.includes('pale');
    
    let cH = dna.colorH, cS = dna.colorS, cL = dna.colorL;
    if (hasPale) { cS = Math.max(20, cS - 30); cL = Math.min(70, cL + 15); }
    
    const stemHue = ((cH + (dna.stemHueOffset || 0)) % 360 + 360) % 360;
    const stemColor = `hsl(${stemHue},${cS}%,${cL}%)`;
    
    const lh = ((cH + (dna.leafHueOffset || 0)) % 360 + 360) % 360;
    const ls = Math.max(15, Math.min(90, cS + (dna.leafSatOffset || 0)));
    const ll = Math.max(10, Math.min(90, (cL + 10) + (dna.leafLightOffset || 0)));
    const leafBaseColor = `hsl(${lh},${ls}%,${ll}%)`;
    
    const flowerColor = dna.flowerColor;
    
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
        const sw = Math.max(2.6, (dna.stemWidth || 3.5) + stage * 0.25);
        const stemPathD = `M${stemStartX} ${stemStartY} Q${stemCtrlX} ${stemCtrlY} ${stemEndX} ${stemEndY}`;

        const stem = createSVGElement('path');
        stem.setAttribute('d', stemPathD);
        stem.setAttribute('stroke', stemColor);
        stem.setAttribute('stroke-width', sw);
        stem.setAttribute('fill', 'none');
        stem.setAttribute('stroke-linecap', 'round');
        stemsG.appendChild(stem);

        const tex = dna.stemTexture || 'smooth';
        if (tex === 'ridged' || tex === 'striped') {
            const hl = createSVGElement('path');
            hl.setAttribute('d', stemPathD);
            hl.setAttribute('stroke', `rgba(255,255,255,${tex === 'ridged' ? 0.14 : 0.10})`);
            hl.setAttribute('stroke-width', Math.max(1.2, sw * 0.35));
            hl.setAttribute('fill', 'none');
            hl.setAttribute('stroke-linecap', 'round');
            hl.style.filter = 'blur(0.2px)';
            if (tex === 'striped') {
                hl.setAttribute('stroke-dasharray', `${6 + rand() * 6} ${6 + rand() * 6}`);
                hl.setAttribute('stroke-dashoffset', `${rand() * 10}`);
            }
            stemsG.appendChild(hl);
        }

        const sp = dna.stemSpeckleStrength || 0;
        if (sp > 0 && stage >= 2) {
            const n = Math.floor(3 + sp * 18);
            for (let i = 0; i < n; i++) {
                const t = 0.15 + rand() * 0.75;
                const pt = getPointOnStem(t);
                const c = createSVGElement('circle');
                c.setAttribute('cx', pt.x + (rand() * 6 - 3));
                c.setAttribute('cy', pt.y + (rand() * 6 - 3));
                c.setAttribute('r', 0.6 + rand() * 1.4);
                c.setAttribute('fill', `rgba(255,255,255,${0.06 + sp * 0.10})`);
                stemsG.appendChild(c);
            }
        }

        const surf = dna.stemSurface || 'none';
        if (surf === 'nodes' && stage >= 3) {
            const n = 2 + Math.floor(rand() * 2);
            for (let i = 0; i < n; i++) {
                const t = 0.25 + (i / n) * 0.5 + (rand() * 0.08 - 0.04);
                const pt = getPointOnStem(t);
                const node = createSVGElement('circle');
                node.setAttribute('cx', pt.x);
                node.setAttribute('cy', pt.y);
                node.setAttribute('r', 1.4 + rand() * 1.2);
                node.setAttribute('fill', `rgba(0,0,0,0.10)`);
                stemsG.appendChild(node);
            }
        } else if (surf === 'thorns' && stage >= 4) {
            const n = 2 + Math.floor(rand() * 3);
            for (let i = 0; i < n; i++) {
                const t = 0.28 + rand() * 0.55;
                const pt = getPointOnStem(t);
                const side = rand() > 0.5 ? 1 : -1;
                const thorn = createSVGElement('path');
                const len = 6 + rand() * 6;
                const w = 2.2 + rand() * 1.6;
                thorn.setAttribute('d', `M${pt.x} ${pt.y} L${pt.x + side * len} ${pt.y - w} L${pt.x + side * len} ${pt.y + w} Z`);
                thorn.setAttribute('fill', `rgba(0,0,0,0.10)`);
                stemsG.appendChild(thorn);
            }
        } else if (surf === 'hairs' && stage >= 2) {
            const n = 6 + Math.floor(rand() * 8);
            for (let i = 0; i < n; i++) {
                const t = 0.18 + rand() * 0.75;
                const pt = getPointOnStem(t);
                const side = rand() > 0.5 ? 1 : -1;
                const hair = createSVGElement('path');
                hair.setAttribute('d', `M${pt.x} ${pt.y} Q${pt.x + side * (4 + rand() * 4)} ${pt.y - (3 + rand() * 6)} ${pt.x + side * (7 + rand() * 6)} ${pt.y - (2 + rand() * 5)}`);
                hair.setAttribute('stroke', `rgba(255,255,255,0.18)`);
                hair.setAttribute('stroke-width', 0.7);
                hair.setAttribute('fill', 'none');
                hair.setAttribute('stroke-linecap', 'round');
                stemsG.appendChild(hair);
            }
        }
    }
    
    if (stage >= 2) {
        const lc = Math.min(dna.leafCount || 3, stage);
        const shapes = (dna.leafShapes && dna.leafShapes.length ? dna.leafShapes : [dna.leafShape || 'round']);
        const baseSize = dna.leafSize || 1, varAmt = dna.leafSizeVar || 0.2;
        for (let i = 0; i < lc; i++) {
            const t = 0.25 + (i / lc) * 0.5, pt = getPointOnStem(t), side = i % 2 === 0 ? -1 : 1;
            const ang = (dna.leafAngle || 45) * side + (hasWilt ? wiltAng * side : 0);
            const sz = baseSize * (1 + (rand() * 2 - 1) * varAmt), shape = shapes[Math.floor(rand() * shapes.length)] || 'round';
            renderLeaf(leavesG, pt.x, pt.y, ang, sz, leafBaseColor, shape, { dna, rand });
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
        renderFlower(flowersG, stemEndX, stemEndY - 5, dna.petalCount || 5, dna.petalShape || 'round', flowerColor, flowerScale, dna, rand);
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
                renderLeaf(leavesG, endX, endY, ang, sz, leafBaseColor, shape, { dna, rand });
            }
            renderFlower(flowersG, endX, endY - 3, dna.petalCount || 5, dna.petalShape || 'round', flowerColor, flowerScale2, dna, rand);
        };
        if (dna.flowerCount >= 2 && stage >= 5) makeBranch(0.55, lean * -30, -25, 0.75);
        if (dna.flowerCount >= 3 && stage >= 5) makeBranch(0.70, lean * 25, -18, 0.65);
    }
}

function renderLeaf(g, x, y, angle, scale, color, shape, opts = null) {
    const dna = opts?.dna || {};
    const rand = opts?.rand || Math.random;
    const sz = scale * 15;

    const edge = dna.leafEdge || 'smooth';

    const paths = {
        pointed: `M0,0 Q${-sz * 0.55},${-sz} 0,${-sz * 1.6} Q${sz * 0.55},${-sz} 0,0`,
        oval: `M0,0 Q${-sz * 0.65},${-sz * 0.75} 0,${-sz * 1.55} Q${sz * 0.65},${-sz * 0.75} 0,0`,
        lanceolate: `M0,0 Q${-sz * 0.40},${-sz * 0.55} 0,${-sz * 1.85} Q${sz * 0.40},${-sz * 0.55} 0,0`,
        banana: `M0,0 Q${-sz * 0.35},${-sz * 0.35} ${-sz * 0.25},${-sz * 0.9} Q0,${-sz * 1.9} ${sz * 0.25},${-sz * 0.9} Q${sz * 0.35},${-sz * 0.35} 0,0`,
        eucalyptus: `M0,0 Q${-sz * 0.45},${-sz * 0.75} 0,${-sz * 1.8} Q${sz * 0.45},${-sz * 0.75} 0,0`,
        heart: `M0,0 C${-sz * 0.9},${-sz * 0.25} ${-sz * 0.85},${-sz * 1.0} 0,${-sz * 1.25} C${sz * 0.85},${-sz * 1.0} ${sz * 0.9},${-sz * 0.25} 0,0`,
        spade: `M0,0 C${-sz * 0.65},${-sz * 0.2} ${-sz * 0.55},${-sz * 0.9} 0,${-sz * 1.45} C${sz * 0.55},${-sz * 0.9} ${sz * 0.65},${-sz * 0.2} 0,0`,
        teardrop: `M0,0 Q${-sz * 0.55},${-sz * 0.45} 0,${-sz * 1.65} Q${sz * 0.55},${-sz * 0.45} 0,0`,
        round: `M0,0 Q${-sz * 0.8},${-sz * 0.75} 0,${-sz * 1.35} Q${sz * 0.8},${-sz * 0.75} 0,0`,
        oak: `M0,0 Q${-sz * 0.35},${-sz * 0.45} ${-sz * 0.60},${-sz * 0.55} Q${-sz * 0.30},${-sz * 0.90} 0,${-sz * 1.25} Q${sz * 0.30},${-sz * 0.90} ${sz * 0.60},${-sz * 0.55} Q${sz * 0.35},${-sz * 0.45} 0,0`,
        lobed: `M0,0 Q${-sz * 0.25},${-sz * 0.25} ${-sz * 0.55},${-sz * 0.65} Q${-sz * 0.15},${-sz * 0.8} 0,${-sz * 1.25} Q${sz * 0.15},${-sz * 0.8} ${sz * 0.55},${-sz * 0.65} Q${sz * 0.25},${-sz * 0.25} 0,0`,
        maple: `M0,0 Q${-sz * 0.2},${-sz * 0.2} ${-sz * 0.50},${-sz * 0.60} Q${-sz * 0.15},${-sz * 0.7} 0,${-sz * 1.25} Q${sz * 0.15},${-sz * 0.7} ${sz * 0.50},${-sz * 0.60} Q${sz * 0.2},${-sz * 0.2} 0,0`,
        fern: `M0,0 Q${-sz * 0.25},${-sz * 0.35} ${-sz * 0.15},${-sz * 0.6} Q${-sz * 0.38},${-sz * 0.85} 0,${-sz * 1.45} Q${sz * 0.38},${-sz * 0.85} ${sz * 0.15},${-sz * 0.6} Q${sz * 0.25},${-sz * 0.35} 0,0`,
        needle: `M0,0 Q${-sz * 0.18},${-sz * 0.7} 0,${-sz * 1.9} Q${sz * 0.18},${-sz * 0.7} 0,0`
    };

    const serrate = (baseD) => {
        if (edge !== 'serrated') return baseD;
        const allow = ['oval', 'lanceolate', 'pointed', 'teardrop', 'eucalyptus'];
        if (!allow.includes(shape)) return baseD;
        const t = 0.10 + rand() * 0.10;
        return `M0,0 
            Q${-sz * (0.45 + t)},${-sz * 0.45} ${-sz * (0.55 + t)},${-sz * 0.65}
            Q${-sz * (0.35 + t)},${-sz * 0.85} ${-sz * (0.48 + t)},${-sz * 1.05}
            Q${-sz * (0.22 + t)},${-sz * 1.25} 0,${-sz * 1.65}
            Q${sz * (0.22 + t)},${-sz * 1.25} ${sz * (0.48 + t)},${-sz * 1.05}
            Q${sz * (0.35 + t)},${-sz * 0.85} ${sz * (0.55 + t)},${-sz * 0.65}
            Q${sz * (0.45 + t)},${-sz * 0.45} 0,0`;
    };

    const d0 = paths[shape] || paths.round;
    const d = serrate(d0);

    const grp = createSVGElement('g');
    grp.setAttribute('transform', `translate(${x},${y}) rotate(${angle})`);
    g.appendChild(grp);

    const hueJ = (dna.leafHueOffset || 0) + (rand() * 6 - 3);
    const satJ = (dna.leafSatOffset || 0) + (rand() * 8 - 4);
    const litJ = (dna.leafLightOffset || 0) + (rand() * 8 - 4);

    const baseFill = (typeof color === 'string' ? color : '#5aa469');
    const main = createSVGElement('path');
    main.setAttribute('d', d);
    main.setAttribute('fill', baseFill);
    main.style.filter = `hue-rotate(${hueJ}deg) saturate(${1 + satJ / 60}) brightness(${1 + litJ / 80})`;
    grp.appendChild(main);

    const varg = dna.leafVariegation || 0;
    if (varg > 0 && (dna.leafTexture === 'variegated' || rand() < 0.45)) {
        const patch = createSVGElement('path');
        patch.setAttribute('d', d);
        patch.setAttribute('fill', 'rgba(255,255,255,0.18)');
        patch.setAttribute('transform', `scale(${0.78 + rand() * 0.10}) translate(${(rand() * 2 - 1) * 2},${-(6 + rand() * 6)})`);
        patch.style.filter = `blur(${0.2 + rand() * 0.6}px)`;
        patch.style.opacity = String(Math.min(0.55, varg + 0.08));
        grp.appendChild(patch);
    }

    const veinStrength = dna.leafVeinStrength || 0;
    if ((dna.leafTexture === 'veined' || veinStrength > 0.18) && shape !== 'needle') {
        const veinOpacity = Math.min(0.22, 0.08 + veinStrength * 0.35);
        const mid = createSVGElement('path');
        mid.setAttribute('d', `M0,0 Q0,${-sz * 0.65} 0,${-sz * 1.35}`);
        mid.setAttribute('stroke', `rgba(255,255,255,${veinOpacity})`);
        mid.setAttribute('stroke-width', 1);
        mid.setAttribute('fill', 'none');
        mid.setAttribute('stroke-linecap', 'round');
        grp.appendChild(mid);

        const svN = 2 + Math.floor(rand() * 2);
        for (let i = 0; i < svN; i++) {
            const t = 0.35 + i * 0.22 + (rand() * 0.06 - 0.03);
            const yv = -sz * (0.25 + t);
            const dx = (sz * (0.25 + rand() * 0.18));
            const side = i % 2 === 0 ? -1 : 1;
            const sv = createSVGElement('path');
            sv.setAttribute('d', `M0,${yv} Q${side * dx * 0.55},${yv - sz * 0.10} ${side * dx},${yv - sz * 0.22}`);
            sv.setAttribute('stroke', `rgba(255,255,255,${veinOpacity * 0.8})`);
            sv.setAttribute('stroke-width', 0.8);
            sv.setAttribute('fill', 'none');
            sv.setAttribute('stroke-linecap', 'round');
            grp.appendChild(sv);
        }
    }

    const sp = dna.leafSpeckleStrength || 0;
    if (dna.leafTexture === 'speckled' || (sp > 0 && rand() < 0.75)) {
        const n = Math.floor(3 + sp * 14);
        for (let i = 0; i < n; i++) {
            const c = createSVGElement('circle');
            c.setAttribute('cx', (rand() * 10 - 5));
            c.setAttribute('cy', -(rand() * sz * 1.35));
            c.setAttribute('r', 0.6 + rand() * 1.2);
            c.setAttribute('fill', `rgba(255,255,255,${0.05 + sp * 0.12})`);
            grp.appendChild(c);
        }
    }
}

function renderFlower(g, x, y, count, shape, color, scale, dna = null, randFn = null) {
    const rand = randFn || Math.random;
    const fg = createSVGElement('g');
    fg.setAttribute('transform', `translate(${x},${y})`);

    const type = (dna && dna.flowerType) ? dna.flowerType : 'simple';
    const centerColor = (dna && dna.flowerCenterColor) ? dna.flowerCenterColor : '#fbbf24';

    const sz = 12 * scale;

    const petalPaths = {
        pointed: `M0,0 Q${sz * 0.3},${-sz * 0.75} 0,${-sz * 1.05} Q${-sz * 0.3},${-sz * 0.75} 0,0`,
        wavy: `M0,0 C${sz * 0.45},${-sz * 0.35} ${sz * 0.2},${-sz * 0.8} 0,${-sz * 1.05} C${-sz * 0.2},${-sz * 0.8} ${-sz * 0.45},${-sz * 0.35} 0,0`,
        round: `M0,0 Q${sz * 0.55},${-sz * 0.55} 0,${-sz * 1.05} Q${-sz * 0.55},${-sz * 0.55} 0,0`
    };

    const makePetal = (rotDeg, d, op = 0.9, sc = 1) => {
        const p = createSVGElement('path');
        p.setAttribute('d', d);
        p.setAttribute('fill', color);
        p.setAttribute('transform', `rotate(${rotDeg}) scale(${sc})`);
        p.style.opacity = String(op);
        fg.appendChild(p);
    };

    if (type === 'daisy') {
        const rays = Math.max(10, Math.min(28, count));
        const d = `M0,0 Q${sz * 0.18},${-sz * 0.55} 0,${-sz * 1.25} Q${-sz * 0.18},${-sz * 0.55} 0,0`;
        for (let i = 0; i < rays; i++) makePetal((360 / rays) * i, d, 0.82, 0.95 + rand() * 0.12);

        const c = createSVGElement('circle');
        c.setAttribute('r', 4.8 * scale);
        c.setAttribute('fill', centerColor);
        c.style.opacity = '0.95';
        fg.appendChild(c);
    } else if (type === 'tulip') {
        const petals = 6;
        const d = `M0,0 C${sz * 0.35},${-sz * 0.25} ${sz * 0.25},${-sz * 0.95} 0,${-sz * 1.25} C${-sz * 0.25},${-sz * 0.95} ${-sz * 0.35},${-sz * 0.25} 0,0`;
        for (let i = 0; i < petals; i++) makePetal((360 / petals) * i, d, 0.85, 1.05);

        const c = createSVGElement('circle');
        c.setAttribute('r', 3.2 * scale);
        c.setAttribute('fill', centerColor);
        c.style.opacity = '0.9';
        fg.appendChild(c);
    } else if (type === 'bell') {
        fg.setAttribute('transform', `translate(${x},${y}) rotate(${(rand() * 10 - 5)})`);
        const bell = createSVGElement('path');
        bell.setAttribute('d', `M0,0 C${sz * 0.75},${-sz * 0.35} ${sz * 0.55},${-sz * 1.35} 0,${-sz * 1.45} C${-sz * 0.55},${-sz * 1.35} ${-sz * 0.75},${-sz * 0.35} 0,0`);
        bell.setAttribute('fill', color);
        bell.style.opacity = '0.9';
        fg.appendChild(bell);

        const lip = createSVGElement('ellipse');
        lip.setAttribute('cx', '0');
        lip.setAttribute('cy', String(-sz * 0.05));
        lip.setAttribute('rx', String(sz * 0.55));
        lip.setAttribute('ry', String(sz * 0.18));
        lip.setAttribute('fill', `rgba(255,255,255,0.10)`);
        fg.appendChild(lip);

        const c = createSVGElement('circle');
        c.setAttribute('r', 2.8 * scale);
        c.setAttribute('fill', centerColor);
        c.setAttribute('cy', String(-sz * 0.75));
        c.style.opacity = '0.8';
        fg.appendChild(c);
    } else if (type === 'rose') {
        const layers = 3;
        for (let l = 0; l < layers; l++) {
            const n = 6 + l * 3;
            const sc = 1.05 - l * 0.18;
            const op = 0.88 - l * 0.10;
            const d = `M0,0 C${sz * 0.55},${-sz * 0.20} ${sz * 0.35},${-sz * 0.85} 0,${-sz * 0.95} C${-sz * 0.35},${-sz * 0.85} ${-sz * 0.55},${-sz * 0.20} 0,0`;
            for (let i = 0; i < n; i++) makePetal((360 / n) * i + (l * 12), d, op, sc);
        }
        const c = createSVGElement('circle');
        c.setAttribute('r', 3.5 * scale);
        c.setAttribute('fill', `rgba(0,0,0,0.08)`);
        fg.appendChild(c);
    } else if (type === 'orchid') {
        const base = petalPaths[shape] || petalPaths.round;
        for (let i = 0; i < 5; i++) {
            const sc = (i === 2) ? 1.25 : (0.95 + rand() * 0.12);
            const op = (i === 2) ? 0.92 : 0.85;
            makePetal((360 / 5) * i, base, op, sc);
        }
        const c = createSVGElement('circle');
        c.setAttribute('r', 3.6 * scale);
        c.setAttribute('fill', centerColor);
        c.style.opacity = '0.9';
        fg.appendChild(c);
    } else {
        const d = petalPaths[shape] || petalPaths.round;
        for (let i = 0; i < count; i++) {
            makePetal((360 / count) * i, d, 0.9, 1);
        }
        const c = createSVGElement('circle');
        c.setAttribute('r', 4 * scale);
        c.setAttribute('fill', centerColor);
        fg.appendChild(c);
    }

    g.appendChild(fg);
}

function render() {
    if (els.ringWater) els.ringWater.style.strokeDashoffset = 283 * (1 - state.water / 100);
    if (els.ringSun) els.ringSun.style.strokeDashoffset = 264 * (1 - state.sun / 100);
    if (els.ringLove) els.ringLove.style.strokeDashoffset = 245 * (1 - state.love / 100);
    
    // Gen badge - new format
    if (els.genBadge) els.genBadge.textContent = `Gen ${state.generation}`;
    
    // Plant name
    if (els.plantNameDisplay) els.plantNameDisplay.textContent = state.name;
    
        // Mood (tap to expand if truncated)
    const mood = getMood();
    if (els.plantMoodDisplay) {
        const moodText = String(mood.text || '');
        // No ticker; show a single-line label that can be tapped to view fully
        els.plantMoodDisplay.classList.remove('short-text');
        els.plantMoodDisplay.textContent = moodText;
        els.plantMoodDisplay.dataset.fullText = moodText;
        els.plantMoodDisplay.setAttribute('aria-label', moodText);
        els.plantMoodDisplay.style.color = mood.color;
    }

    // Day name display (new Stardew-style)
    const dayNameEl = document.getElementById('dayNameDisplay');
    if (dayNameEl && typeof window.daySystem !== 'undefined') {
        const dayInfo = window.daySystem.getDayInfo();
        const dayAbbrevs = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const abbrev = dayAbbrevs[window.daySystem.getCurrentDay()];
        dayNameEl.textContent = `${abbrev}. ${state.day}`;
    } else if (dayNameEl) {
        dayNameEl.textContent = `Day ${state.day}`;
    }
    
    // Season icon (new)
    const seasonIconEl = document.getElementById('seasonIcon');
    if (seasonIconEl) {
        const season = SEASONS[state.season % 4];
        seasonIconEl.textContent = season ? season.icon : '🌸';
        seasonIconEl.title = season ? season.name : 'Spring';
    }
    
    // Weather icon (shows rain/sun state)
    const weatherIconEl = document.getElementById('weatherIcon');
    if (weatherIconEl) {
        if (state.isRainOn) {
            weatherIconEl.textContent = '🌧️';
        } else if (state.isSunLampOn) {
            weatherIconEl.textContent = '☀️';
        } else {
            // Show time-of-day weather
            const tod = typeof getTimeOfDay === 'function' ? getTimeOfDay() : 'day';
            if (tod === 'night' || tod === 'evening') {
                weatherIconEl.textContent = '🌙';
            } else if (tod === 'dawn' || tod === 'dusk') {
                weatherIconEl.textContent = '🌅';
            } else {
                weatherIconEl.textContent = '⛅';
            }
        }
    }
    
    // Stage badge (new)
    const stageBadgeEl = document.getElementById('stageBadge');
    if (stageBadgeEl) {
        stageBadgeEl.textContent = STAGES[state.stage - 1] || 'Seed';
    }
    
    // Action buttons
    if (els.btnSun) els.btnSun.classList.toggle('sun-active', state.isSunLampOn);
    if (els.btnRain) els.btnRain.classList.toggle('rain-active', state.isRainOn);
    
    // Growth bar - now uses growth-bar-fill and growth-percent
    const growthBarFill = document.getElementById('evolutionBar');
    const growthPercentEl = document.getElementById('growthPercent');
    
    if (growthBarFill) {
        let percent = 0;
        if (state.stage < 6) {
            const prev = STAGE_THRESHOLDS[state.stage - 1] || 0;
            const next = STAGE_THRESHOLDS[state.stage];
            percent = Math.min(100, ((state.growth - prev) / (next - prev)) * 100);
        } else {
            percent = 100;
        }
        growthBarFill.style.width = percent + '%';
        
        if (growthPercentEl) {
            growthPercentEl.textContent = Math.floor(percent) + '%';
        }
    }
    
    // Legacy evolutionBar support
    if (els.evolutionBar && els.evolutionBar !== growthBarFill) {
        if (state.stage < 6) {
            const prev = STAGE_THRESHOLDS[state.stage - 1] || 0, next = STAGE_THRESHOLDS[state.stage];
            els.evolutionBar.style.width = Math.min(100, ((state.growth - prev) / (next - prev)) * 100) + '%';
        } else els.evolutionBar.style.width = '100%';
    }
    
    const scale = Math.min(1.4, 1 + (state.growth / 6000));
    if (els.plantGraphics) els.plantGraphics.style.transform = `scale(${scale})`;
    if (els.menuOverlay && els.menuOverlay.classList.contains('open')) updateMenuStats();
    updateSeason();
    if (typeof checkRestCooldowns === 'function') checkRestCooldowns();
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
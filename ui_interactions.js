// ui_interactions.js - Menus, Dialogs, and Game Interaction

function updateMenuStats() {
    if (els.nameInput && document.activeElement !== els.nameInput) els.nameInput.value = (state.name && state.name.toLowerCase() !== 'sprout') ? state.name : getNameSuggestion();
    if (els.menuGen) els.menuGen.textContent = state.generation;
    if (els.menuAge) els.menuAge.textContent = state.day + " Days";
    if (els.menuStage) els.menuStage.textContent = STAGES[state.stage - 1] || 'Seed';
    const ps = getPlantState();
    if (els.menuHealth) { els.menuHealth.textContent = ps.label; els.menuHealth.style.color = ps.color; }
    if (els.menuProgressBar) {
        if (state.stage < 6) {
            const prev = STAGE_THRESHOLDS[state.stage - 1] || 0, next = STAGE_THRESHOLDS[state.stage];
            els.menuProgressBar.style.width = Math.min(100, ((state.growth - prev) / (next - prev)) * 100) + '%';
        } else els.menuProgressBar.style.width = '100%';
    }
    if (els.menuScars && els.menuScarList) {
        if (state.scars.length > 0) {
            els.menuScars.style.display = 'flex';
            els.menuScarList.textContent = state.scars.map(s => ({ wilt: 'Wilted', bend: 'Bent', pale: 'Faded', dormant: 'Dormant' }[s] || s)).join(', ');
        } else els.menuScars.style.display = 'none';
    }
    if (els.menuInherited && els.menuInheritedList) {
        if (state.inheritedTraits.length > 0) {
            els.menuInherited.style.display = 'flex';
            els.menuInheritedList.textContent = state.inheritedTraits.map(id => { const t = INHERITABLE_TRAITS.find(x => x.id === id); return t ? t.name : id; }).join(', ');
        } else els.menuInherited.style.display = 'none';
    }
    if (els.btnHarvest) els.btnHarvest.classList.toggle('visible', state.stage >= 5);
    if (els.greenhouseList) {
        els.greenhouseList.innerHTML = '';
        [...state.history].reverse().forEach((h, i) => {
            const item = document.createElement('div');
            item.className = 'greenhouse-item';
            const col = h.dna?.flowerColor || `hsl(${h.dna?.flowerH || 0},50%,50%)`;
            item.innerHTML = `<span><span class="gh-dot" style="background:${col}"></span>${h.name}</span><span style="opacity:0.5">Cycle ${h.gen}</span>`;
            item.onclick = () => viewArchive(state.history.length - 1 - i);
            els.greenhouseList.appendChild(item);
        });
    }
}

function interact(type, e) {
    if (state.isDead) return;
    if (e) e.stopPropagation();
    if (type === 'rain') {
        // Check if rain is on cooldown (can always turn OFF, but not ON)
        if (!state.isRainOn && Date.now() < state.rainRestUntil) {
            const remaining = Math.ceil((state.rainRestUntil - Date.now()) / 1000);
            const mins = Math.floor(remaining / 60);
            const secs = remaining % 60;
            spawnFloatingText(`Plant resting... ${mins}:${secs.toString().padStart(2, '0')}`, "var(--accent-water)", "warn");
            return;
        }
        state.isRainOn = !state.isRainOn;
        if (state.isRainOn && typeof unlockDiscovery === 'function') unlockDiscovery('first_water');
        spawnFloatingText(state.isRainOn ? "☁️ Rain ON" : "☁️ Rain OFF", "var(--accent-water)");
        applyTheme();
    } else if (type === 'sun') {
        // Check if sun is on cooldown (can always turn OFF, but not ON)
        if (!state.isSunLampOn && Date.now() < state.sunRestUntil) {
            const remaining = Math.ceil((state.sunRestUntil - Date.now()) / 1000);
            const mins = Math.floor(remaining / 60);
            const secs = remaining % 60;
            spawnFloatingText(`Plant resting... ${mins}:${secs.toString().padStart(2, '0')}`, "var(--accent-sun)", "warn");
            return;
        }
        if (isDaytime()) {
            state.isSunLampOn = !state.isSunLampOn;
            if (state.isSunLampOn && typeof unlockDiscovery === 'function') unlockDiscovery('first_sun');
            spawnFloatingText(state.isSunLampOn ? "☀️ ON" : "🌑 OFF", "var(--accent-sun)");
        } else {
            if (isNewMoon()) { spawnFloatingText("New Moon - No light", "#888"); return; }
            state.isSunLampOn = !state.isSunLampOn;
            if (state.isSunLampOn && typeof unlockDiscovery === 'function') unlockDiscovery('first_sun');
            spawnFloatingText(state.isSunLampOn ? "🌙 Moonlight ON" : "🌙 OFF", "#fef9c3");
            const beam = document.getElementById('moonlightBeam');
            if (beam) beam.classList.toggle('active', state.isSunLampOn);
        }
        audio.sun(); applyTheme();
        if (state.isRainOn && state.isSunLampOn && typeof unlockDiscovery === 'function') unlockDiscovery('made_rainbow');
    } else if (type === 'love') {
        // Check if love is on cooldown
        if (Date.now() < state.loveRestUntil) {
            const remaining = Math.ceil((state.loveRestUntil - Date.now()) / 1000);
            const mins = Math.floor(remaining / 60);
            const secs = remaining % 60;
            spawnFloatingText(`Plant resting... ${mins}:${secs.toString().padStart(2, '0')}`, "var(--accent-love)", "warn");
            return;
        }
        if (state.love >= 100) { spawnFloatingText("Fully Loved!", "var(--accent-love)"); return; }
        const loveWasBelow100 = state.love < 100;
        const gained = applyHeal('love', 15);
        spawnFloatingText('❤', 'var(--accent-love)', gained < 8 ? 'warn' : 'good');
        audio.love();
        els.plantHero.classList.remove('plant-bloop');
        void els.plantHero.offsetWidth;
        els.plantHero.classList.add('plant-bloop');
        setTimeout(() => els.plantHero.classList.remove('plant-bloop'), 500);
        // Check if love just hit 100
        if (loveWasBelow100 && state.love >= 100) {
            state.loveRestUntil = Date.now() + CONFIG.loveRestCooldown;
            spawnFloatingText("💕 Fully loved! Resting...", "var(--accent-love)", "good");
        }
    }
    render();
}

function applyTheme() {
    const rc = document.getElementById('rainContainer'); if (rc) rc.classList.toggle('active', state.isRainOn);
    const rb = document.getElementById('rainbowContainer'); if (rb) rb.classList.toggle('visible', state.isSunLampOn && state.isRainOn);
    audio.toggleRainSound(state.isRainOn);
    const beam = document.getElementById('moonlightBeam'); if (beam && !isDaytime()) beam.classList.toggle('active', state.isSunLampOn);
    
    // Toggle rain clouds and environment raining state
    const envScene = document.getElementById('environmentScene');
    const rainClouds = document.getElementById('rainClouds');
    if (envScene) envScene.classList.toggle('raining', state.isRainOn);
    if (rainClouds) rainClouds.classList.toggle('active', state.isRainOn);
    
    // Toggle sun rays when sun lamp is on during daytime
    updateSunRays();
}

function updateSunRays() {
    // Robust, repeatable toggle: cancel any pending removal when turning back on.
    let container = document.getElementById('sunRaysContainer');
    const shouldShow = !!(state.isSunLampOn && isDaytime());

    // If a previous fade-out scheduled a removal, cancel it when we want to show rays again.
    if (shouldShow && container && container._sunRemoveTimer) {
        try { clearTimeout(container._sunRemoveTimer); } catch (_) {}
        container._sunRemoveTimer = null;
    }

    // Hide path: fade out, then remove (but don't let old timers kill a newly-reactivated container).
    if (!shouldShow) {
        if (container) {
            // Cancel any prior timer and schedule a fresh one.
            if (container._sunRemoveTimer) {
                try { clearTimeout(container._sunRemoveTimer); } catch (_) {}
                container._sunRemoveTimer = null;
            }
            container.classList.remove('active');

            // Remove only if it's still the same node we scheduled against.
            const scheduledNode = container;
            scheduledNode._sunRemoveTimer = setTimeout(() => {
                try {
                    // If it was re-activated, don't remove.
                    if (scheduledNode.classList.contains('active')) return;
                    if (scheduledNode.parentNode) scheduledNode.remove();
                } catch (_) {}
                try { scheduledNode._sunRemoveTimer = null; } catch (_) {}
            }, 1400);
        }
        return;
    }

    // Show path: create if missing, then activate.
    if (!container) {
        container = document.createElement('div');
        container.id = 'sunRaysContainer';
        container.className = 'sun-rays-container';

        // Create multiple sun rays with small variations so it doesn't look like six identical bars.
        for (let i = 0; i < 6; i++) {
            const ray = document.createElement('div');
            ray.className = 'sun-ray';

            const left = 8 + i * 16 + (Math.random() * 6 - 3); // +/- 3%
            ray.style.left = left + '%';

            ray.style.animationDelay = ((i * 0.9) + (Math.random() * 1.2)) + 's';

            const rot = (-10 + i * 4) + (Math.random() * 6 - 3); // +/- 3deg
            ray.style.setProperty('--ray-rot', rot + 'deg');

            container.appendChild(ray);
        }

        // Insert after seasonal container if possible, else append to body.
        const seasonalContainer = document.getElementById('seasonalContainer');
        if (seasonalContainer && seasonalContainer.parentNode) {
            seasonalContainer.parentNode.insertBefore(container, seasonalContainer.nextSibling);
        } else {
            document.body.appendChild(container);
        }

        // Force a clean transition: start inactive, then flip active next frame.
        container.classList.remove('active');
        requestAnimationFrame(() => {
            // It might have been removed before the frame fires.
            const c = document.getElementById('sunRaysContainer');
            if (c) c.classList.add('active');
        });
    } else {
        container.classList.add('active');
    }
}


function animateJiggle() {
    els.plantHero.classList.remove('plant-jiggle');
    void els.plantHero.offsetWidth;
    els.plantHero.classList.add('plant-jiggle');
}

let pressTimer = null, isPressed = false;
function handlePress(down) {
    if (state.isDead) return;
    if (down) { isPressed = true; pressTimer = setTimeout(() => { els.vitals.classList.add('active'); }, 300); }
    else {
        if (!isPressed) return;
        isPressed = false; clearTimeout(pressTimer);
        if (els.vitals.classList.contains('active')) els.vitals.classList.remove('active');
        else interact('love');
    }
}

function getFireflyColor(i) { const f = FIREFLY_FAMILIES[i]; return `hsl(${f.hue},${f.sat || 70}%,60%)`; }
function hasGuardian(familyIndex) { return ((state.fireflies && (state.fireflies[familyIndex] || state.fireflies[String(familyIndex)])) || 0) >= GUARDIAN_THRESHOLD; }

function attemptSpawnFirefly() {
    if (els.menuOverlay && els.menuOverlay.classList.contains('open')) return;
    if (Math.random() < (state.dna?.fireflyChance || 0.05)) spawnVisualFirefly(Math.floor(Math.random() * 8), false);
    FIREFLY_FAMILIES.forEach((_, i) => {
        if (hasGuardian(i) && !activeBigFireflies.includes(i) && Math.random() < 0.008) spawnVisualFirefly(i, true);
    });
}

function spawnVisualFirefly(fam, isGuardian) {
    const col = getFireflyColor(fam), ff = document.createElement('div');
    ff.className = 'firefly' + (isGuardian ? ' guardian' : '');
    ff.dataset.family = fam;
    ff.style.setProperty('--firefly-color', col);
    ff.style.background = col;
    ff.style.left = (10 + Math.random() * 80) + '%';
    ff.style.top = (15 + Math.random() * 50) + '%';
    
    const handleTap = (e) => {
        e.preventDefault(); e.stopPropagation();
        if (isGuardian) activateGuardian(fam, ff); else collectFirefly(fam, ff);
    };
    ff.addEventListener('click', handleTap); 
    ff.addEventListener('touchend', handleTap, { passive: false });
    document.body.appendChild(ff);
    
    // Fade-in: Wait for next frame to apply visible class (ensures transition triggers)
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            ff.classList.add('visible');
        });
    });
    
    const life = 11000;
    setTimeout(() => {
        if (ff.parentNode && !ff.classList.contains('guardian-active')) {
            // Remove visible, add fadeout for smooth transition
            ff.classList.remove('visible');
            ff.classList.add('fadeout');
            setTimeout(() => { if (ff.parentNode) ff.remove(); }, 1200);
        }
    }, life);
}

let _potDesignerSnapshot = null;

function openPotDesigner() {
    _potDesignerSnapshot = { potColor: state.potColor, potPattern: state.potPattern, potPatternColor: state.potPatternColor };
    els.menuOverlay.classList.remove('open');
    els.potOverlay.classList.add('open');
    renderPotDesigner();
}
function closePotDesigner() {
    els.potOverlay.classList.remove('open');
    els.menuOverlay.classList.add('open');
    try {
        if (_potDesignerSnapshot) {
            const changed = (_potDesignerSnapshot.potColor !== state.potColor) || (_potDesignerSnapshot.potPattern !== state.potPattern) || (_potDesignerSnapshot.potPatternColor !== state.potPatternColor);
            if (changed && typeof unlockDiscovery === 'function') unlockDiscovery('pot_customized');
        }
    } catch (_) {}
    saveState();
}

function renderPotDesigner() {
    const cg = document.getElementById('potColorGrid');
    if (cg) {
        cg.innerHTML = '';
        POT_COLORS.forEach(c => {
            const d = document.createElement('div');
            d.className = 'color-dot' + (state.potColor === c ? ' selected' : '');
            d.style.background = c;
            d.onclick = () => { state.potColor = c; renderPotDesigner(); renderPotPreview(); };
            cg.appendChild(d);
        });
    }
    const pg = document.getElementById('potPatternGrid');
    if (pg) {
        pg.innerHTML = '';
        PATTERNS.forEach(p => {
            const unlocked = state.totalFireflies >= p.unlockAt;
            const btn = document.createElement('button');
            btn.className = 'pattern-btn' + (state.potPattern === p.id ? ' selected' : '') + (!unlocked ? ' locked' : '');
            btn.textContent = unlocked ? p.name : `🔒 ${p.unlockAt}`;
            btn.disabled = !unlocked;
            btn.onclick = () => { if (unlocked) { state.potPattern = p.id; renderPotDesigner(); renderPotPreview(); } };
            pg.appendChild(btn);
        });
    }
    const pcg = document.getElementById('patternColorGrid');
    if (pcg) {
        pcg.innerHTML = '';
        PATTERN_COLORS.forEach(c => {
            const d = document.createElement('div');
            d.className = 'color-dot' + (state.potPatternColor === c ? ' selected' : '');
            d.style.background = c;
            d.onclick = () => { state.potPatternColor = c; renderPotDesigner(); renderPotPreview(); };
            pcg.appendChild(d);
        });
    }
}

function openHelp() { els.menuOverlay.classList.remove('open'); els.helpOverlay.classList.add('open'); }
function closeHelp() { els.helpOverlay.classList.remove('open'); els.menuOverlay.classList.add('open'); }
function openCareLog() { if (els.menuOverlay && els.menuOverlay.classList.contains('open')) toggleMenu(); renderCareLog(); els.logOverlay.classList.add('open'); pushHistoryState(); }
function closeCareLog() { els.logOverlay.classList.remove('open'); }

function renderCareLog() {
    const list = els.logList || document.getElementById('logList'), sub = els.logSub || document.getElementById('logSub');
    if (!list || !sub) return;
    const count = Array.isArray(state.noticeLog) ? state.noticeLog.length : 0;
    sub.textContent = count ? ('Recent messages: ' + count) : 'No messages yet.';
    list.innerHTML = '';
    (state.noticeLog || []).slice(0, 80).forEach(it => {
        const row = document.createElement('div'); row.className = 'log-item ' + (it.kind || 'info');
        const t = new Date(it.t || Date.now());
        row.innerHTML = `<div class="log-time">${t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div><div class="log-text"></div>`;
        row.querySelector('.log-text').textContent = it.text || '';
        list.appendChild(row);
    });
}

function openSeasonInfo() { if (els.menuOverlay && els.menuOverlay.classList.contains('open')) toggleMenu(); renderSeasonInfo(); els.seasonOverlay.classList.add('open'); pushHistoryState(); }
function closeSeasonInfo() { els.seasonOverlay.classList.remove('open'); }
function renderSeasonInfo() {
    const h = els.seasonNow || document.getElementById('seasonNow'), b = els.seasonNowBody || document.getElementById('seasonNowBody');
    if (!h || !b) return;
    const season = SEASONS[state.season] || SEASONS[0];
    h.textContent = 'Current Season: ' + season.name + ' ' + (season.icon || '');
    b.textContent = season.description || '';
}

function openTraitGlossary() { els.menuOverlay.classList.remove('open'); renderTraitGlossary(); els.traitOverlay.classList.add('open'); }
function closeTraitGlossary() { els.traitOverlay.classList.remove('open'); els.menuOverlay.classList.add('open'); }
function renderTraitGlossary() {
    const list = els.traitGlossaryList; if (!list) return;
    const explain = { resilience: 'Slows vital decay and makes neglect timers accumulate more slowly.', bloomSpeed: 'Boosts growth especially in moderate/high care.', leafiness: 'Adds extra leaf nodes and leaf count.', colorVibrancy: 'Increases saturation; plant appears richer.', flowerPower: 'Increases number of flowers in later stages.', fireflyAffinity: 'Slightly increases firefly spawn chance.' };
    list.innerHTML = '';
    INHERITABLE_TRAITS.forEach(t => {
        const item = document.createElement('div'); item.className = 'trait-item';
        item.innerHTML = `<div class="trait-row"><div class="trait-name">${t.name}</div><div class="trait-tag">${t.id}</div></div><div class="trait-desc">${explain[t.id] || t.desc || ''}</div>`;
        list.appendChild(item);
    });
}

function harvestPlant() {
    if (state.stage < 5) return;
    els.menuOverlay.classList.remove('open'); els.harvestOverlay.classList.add('open');
    renderPlant('harvestPlantGroup', state.dna, state.stage);
    const trait = INHERITABLE_TRAITS[Math.floor(Math.random() * INHERITABLE_TRAITS.length)];
    document.getElementById('inheritedTraitDisplay').textContent = `${trait.name}: ${trait.desc}`;
    document.getElementById('inheritedTraitDisplay').dataset.traitId = trait.id;
}
function closeHarvestModal() { els.harvestOverlay.classList.remove('open'); els.menuOverlay.classList.add('open'); }

function confirmHarvest() {
    const _wasWinter = (state.season === 3);

    state.history.push({ name: state.name, gen: state.generation, days: state.day, dna: { ...state.dna }, stage: state.stage, scars: [...state.scars], potColor: state.potColor, potPattern: state.potPattern });
    const tid = document.getElementById('inheritedTraitDisplay').dataset.traitId;
    if (!state.inheritedTraits.includes(tid)) state.inheritedTraits.push(tid);
    const oldName = state.name;
    state.generation++; state.day = 1;
    if (typeof unlockDiscovery === 'function') {
        unlockDiscovery('first_ascension');
        if (_wasWinter) unlockDiscovery('survived_winter');
        if (state.generation >= 5) unlockDiscovery('five_generations');
    } state.dayProgress = 0; state.stage = 1; state.growth = 0;
    state.water = 50; state.sun = 50; state.love = 50; state.scars = []; state.timeAtZero = 0;
    state.neglect = { waterLowMs: 0, sunLowMs: 0, loveLowMs: 0, crisisMs: 0, partialDormant: false };
    state.name = 'Sprout'; state.nameSuggestion = ''; state.season = (state.season + 1) % 4; state.dna = generateDNA(state.dna);
    els.harvestOverlay.classList.remove('open');
    spawnFloatingText(`A seed from ${oldName} takes root...`, 'var(--accent-growth)');
    setupWorld(); renderPlant('plantGroup', state.dna, state.stage); updateSeason(); updateUI(); saveState();
}

function viewArchive(i) {
    if (i < 0 || i >= state.history.length) return;
    const a = state.history[i];
    els.menuOverlay.classList.remove('open'); els.archiveOverlay.classList.add('open');
    document.getElementById('archiveTitle').textContent = a.name;
    renderPlant('archivePlantGroup', a.dna, a.stage, a.scars || []);
    document.getElementById('archiveStats').innerHTML = `<div class="archive-stat"><span>Generation</span><span>${a.gen}</span></div><div class="archive-stat"><span>Days Lived</span><span>${a.days}</span></div><div class="archive-stat"><span>Stage</span><span>${STAGES[a.stage - 1] || 'Unknown'}</span></div>${a.scars?.length ? `<div class="archive-stat"><span>Scars</span><span>${a.scars.join(', ')}</span></div>` : ''}`;
}
function closeArchive() { els.archiveOverlay.classList.remove('open'); els.menuOverlay.classList.add('open'); }
function openResetConfirm() { els.menuOverlay.classList.remove('open'); els.resetOverlay.classList.add('open'); }
function closeResetOverlay() { els.resetOverlay.classList.remove('open'); els.menuOverlay.classList.add('open'); }
function finalizeReset() { resetGame(false); els.resetOverlay.classList.remove('open'); }

function makeFlowerName() {
    const dna = state.dna || {}, h = ((dna.flowerH ?? dna.colorH ?? 0) % 360 + 360) % 360;
    const colors = h < 25 ? 'Coral' : h < 55 ? 'Gold' : h < 115 ? 'Mint' : h < 165 ? 'Teal' : h < 215 ? 'Sky' : h < 265 ? 'Indigo' : h < 315 ? 'Violet' : 'Rose';
    const flowers = ['Lily', 'Iris', 'Poppy', 'Aster', 'Daisy', 'Lotus', 'Tulip', 'Clover'];
    let seed = ((dna.seed ?? 0) >>> 0) || ((Date.now() / 1000) >>> 0);
    seed = (seed + 0x6D2B79F5) >>> 0; seed = Math.imul(seed ^ (seed >>> 15), 1 | seed) >>> 0;
    const flower = flowers[seed % flowers.length];
    let n = colors + ' ' + flower; if (n.length > 16) n = colors + flower; if (n.length > 16) n = flower;
    return n;
}

function getNameSuggestion() {
    let sug = state.nameSuggestion;
    const bad = !sug || typeof sug !== 'string' || sug.trim() === '' || sug.toLowerCase() === 'sprout';
    if (bad) { sug = makeFlowerName(); state.nameSuggestion = sug; }
    return sug;
}

function ensureNamePrompt(force) {
    if (!els.nameInput) return;
    const need = !state.name || state.name.toLowerCase() === 'sprout';
    if (need) {
        const sug = getNameSuggestion();
        if (document.activeElement !== els.nameInput) els.nameInput.value = sug;
        if (force) { spawnFloatingText('Tap the menu to name your plant!', null, 'warn'); }
    }
}
function updateName(n) { const t = (n || '').trim(); if (!t || t.toLowerCase() === 'sprout') state.name = getNameSuggestion(); else state.name = t;
    if (state.name && state.name.toLowerCase() !== 'sprout' && typeof unlockDiscovery === 'function') unlockDiscovery('named_plant');
    updateUI(); saveState(); }

function singToPlant() {
    if (Date.now() < state.singCooldownUntil) return;
    state.singCooldownUntil = Date.now() + CONFIG.singCooldown;
    if (typeof unlockDiscovery === 'function') unlockDiscovery('sang_to_plant'); checkSingCooldown();
    toggleMenu(); spawnFloatingText("🎵 Singing...", "#748ffc");
    let needed = STAGE_THRESHOLDS[state.stage] || 1000;
    if (state.stage < 4) needed = STAGE_THRESHOLDS[state.stage + 1] - STAGE_THRESHOLDS[state.stage];
    const boost = needed * 0.1;
    state.growth += boost; setTimeout(() => spawnFloatingText(`+${Math.floor(boost)} Growth!`, "#4ade80"), 500);
    els.plantHero.classList.add('sing-glow'); setTimeout(() => els.plantHero.classList.remove('sing-glow'), 3000);
    let i = 0; const notes = [261, 329, 392, 523], iv = setInterval(() => { if (i >= notes.length) { clearInterval(iv); return; } audio.play(notes[i], 'triangle', 0.3); i++; }, 300);
}

function fertilizePlant() {
    if (Date.now() < state.fertilizeCooldownUntil) return;
    state.fertilizeCooldownUntil = Date.now() + CONFIG.fertilizeCooldown;
    if (typeof unlockDiscovery === 'function') unlockDiscovery('first_fertilize'); checkFertilizeCooldown();
    toggleMenu(); spawnFloatingText("🌿 Fertilized!", "#795548");
    state.growthMultiplier = 2; setTimeout(() => { state.growthMultiplier = 1; }, 60000); state.growth += 50;
}

function checkSingCooldown() {
    const r = state.singCooldownUntil - Date.now();
    if (els.btnSing) {
        if (r > 0) { els.btnSing.disabled = true; els.btnSing.textContent = `🎵 Sing (${Math.ceil(r / 60000)}m)`; }
        else { els.btnSing.disabled = false; els.btnSing.textContent = '🎵 Sing to Plant'; }
    }
}

function checkFertilizeCooldown() {
    const r = state.fertilizeCooldownUntil - Date.now();
    if (els.btnFertilize) {
        if (r > 0) { els.btnFertilize.disabled = true; els.btnFertilize.textContent = `🌿 Fertilize (${Math.ceil(r / 60000)}m)`; }
        else { els.btnFertilize.disabled = false; els.btnFertilize.textContent = '🌿 Fertilize'; }
    }
}

function checkRestCooldowns() {
    const rainCooldown = document.getElementById('rainCooldown');
    const sunCooldown = document.getElementById('sunCooldown');
    const btnRain = document.getElementById('btnRain');
    const btnSun = document.getElementById('btnSun');
    const now = Date.now();
    
    // Rain cooldown
    if (rainCooldown && btnRain) {
        const rainRemaining = state.rainRestUntil - now;
        if (rainRemaining > 0) {
            const mins = Math.floor(rainRemaining / 60000);
            const secs = Math.floor((rainRemaining % 60000) / 1000);
            rainCooldown.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
            rainCooldown.classList.add('active');
            btnRain.classList.add('on-cooldown');
        } else {
            rainCooldown.classList.remove('active');
            btnRain.classList.remove('on-cooldown');
            if (state.rainRestUntil > 0) state.rainRestUntil = 0;
        }
    }
    
    // Sun cooldown
    if (sunCooldown && btnSun) {
        const sunRemaining = state.sunRestUntil - now;
        if (sunRemaining > 0) {
            const mins = Math.floor(sunRemaining / 60000);
            const secs = Math.floor((sunRemaining % 60000) / 1000);
            sunCooldown.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
            sunCooldown.classList.add('active');
            btnSun.classList.add('on-cooldown');
        } else {
            sunCooldown.classList.remove('active');
            btnSun.classList.remove('on-cooldown');
            if (state.sunRestUntil > 0) state.sunRestUntil = 0;
        }
    }
    
    // Love cooldown (no visual indicator, just clear when expired)
    if (state.loveRestUntil > 0 && now >= state.loveRestUntil) {
        state.loveRestUntil = 0;
    }
}

function toggleBackgroundMusic() {
    state.isMusicPlaying = !state.isMusicPlaying;
    if (state.isMusicPlaying) { audio.playBackgroundMusic(); els.btnMusic.classList.add('active'); els.btnMusic.textContent = '🎶 Music ON'; }
    else { audio.stopBackgroundMusic(); els.btnMusic.classList.remove('active'); els.btnMusic.textContent = '🎶 Background Music'; }
}

function toggleMenu() {
    const o = els.menuOverlay; const was = o.classList.contains('open');
    if (was) {
        ensureNamePrompt(false);
        const n = (state.name || '').trim().toLowerCase();
        if (n === 'sprout') {
            const v = (els.nameInput ? els.nameInput.value : '').trim();
            updateName(v);
            if ((state.name || '').trim().toLowerCase() === 'sprout') { spawnFloatingText('Name your plant.', null, 'warn'); return; }
        }
        o.classList.remove('open');
    } else { o.classList.add('open'); updateMenuStats(); ensureNamePrompt(false); }
    pushHistoryState();
}

function openFireflyLog() { els.menuOverlay.classList.remove('open'); els.fireflyOverlay.classList.add('open'); selectedFamily = null; renderFireflyLog(); pushHistoryState(); }
function closeFireflyLog() { els.fireflyOverlay.classList.remove('open'); els.menuOverlay.classList.add('open'); updateMenuStats(); pushHistoryState(); }

function renderFireflyLog() {
    const grid = els.fireflyFamilyGrid; if (!grid) return;
    grid.innerHTML = '';
    FIREFLY_FAMILIES.forEach((f, i) => {
        const cnt = state.fireflies[i] || 0; const col = getFireflyColor(i);
        const card = document.createElement('div');
        card.className = 'family-card' + (selectedFamily === i ? ' selected' : '');
        card.style.setProperty('--family-color', col);
        card.innerHTML = '<div class="family-orb" style="background:' + col + '"></div><div class="family-name">' + f.name + '</div><div class="family-count">' + cnt + '</div><div class="family-power">' + (hasGuardian(i) ? '👑' : f.power) + '</div>';
        card.onclick = () => { selectedFamily = i; renderFireflyLog(); };
        grid.appendChild(card);
    });
    const det = els.familyDetailPanel;
    if (selectedFamily !== null && det) {
        det.style.display = 'block'; const f = FIREFLY_FAMILIES[selectedFamily]; const cnt = state.fireflies[selectedFamily] || 0; const col = getFireflyColor(selectedFamily);
        det.style.setProperty('--family-color', col);
        els.detailOrb.style.cssText = 'background:' + col + ';box-shadow:0 0 20px ' + col;
        els.detailFamilyName.textContent = f.name + ' Family'; els.detailFamilyPower.textContent = f.desc;
        els.detailFireflyCount.textContent = 'You have ' + cnt + ' fireflies';
        const btn = els.releaseBtn; btn.disabled = cnt < 1; btn.textContent = cnt >= 1 ? 'Release One' : 'No fireflies';
        const gt = els.guardianProgressText;
        const unlocked = hasGuardian(i);
        gt.textContent = unlocked ? `Guardian unlocked. Tap a Guardian in the sky to invoke it (costs ${GUARDIAN_INVOKE_COST} fireflies).` : `Collect ${Math.max(0, GUARDIAN_THRESHOLD - cnt)} more for a Guardian.`;
    } else if (det) det.style.display = 'none';
}

function releaseFirefly() {
    if (selectedFamily === null) return;
    const i = selectedFamily; const cnt = state.fireflies[i] || 0;
    if (cnt < 1) { spawnFloatingText('No fireflies to release.', null, 'warn'); return; }
    state.fireflies[i] = cnt - 1; state.totalFireflies = Math.max(0, (state.totalFireflies || 0) - 1);
    const f = FIREFLY_FAMILIES[i]; const col = getFireflyColor(i);
    
    // Store the firefly color for visual feedback
    const buffDuration = (f.effect === 'slow' || f.effect === 'luck') ? 30 : 15;
    
    if (f.effect === 'water') state.buffs.push({ type: 'water', strength: 2, remaining: 15, color: col, familyIndex: i });
    else if (f.effect === 'sun') state.buffs.push({ type: 'sun', strength: 2, remaining: 15, color: col, familyIndex: i });
    else if (f.effect === 'love') state.buffs.push({ type: 'love', strength: 2, remaining: 15, color: col, familyIndex: i });
    else if (f.effect === 'growth') state.buffs.push({ type: 'growth', strength: 5, remaining: 15, color: col, familyIndex: i });
    else if (f.effect === 'health') state.buffs.push({ type: 'health', strength: 3, remaining: 15, color: col, familyIndex: i });
    else if (f.effect === 'slow') state.buffs.push({ type: 'slow', strength: 1, remaining: 30, color: col, familyIndex: i });
    else if (f.effect === 'luck') state.buffs.push({ type: 'luck', strength: 1, remaining: 30, color: col, familyIndex: i });
    else if (f.effect === 'random') { const types = ['water', 'sun', 'love', 'growth', 'health']; const rt = types[Math.floor(Math.random() * types.length)]; state.buffs.push({ type: rt, strength: 3, remaining: 20, color: col, familyIndex: i }); }
    
    // Apply visual feedback immediately
    applyBuffVisualFeedback(col);
    
    spawnFloatingText(f.name + ' released! ' + f.desc, col, 'good'); renderFireflyLog(); saveState();
}

function applyBuffVisualFeedback(color) {
    const plantHero = document.getElementById('plantHero');
    if (!plantHero) return;
    
    // Parse the HSL color and create a semi-transparent version
    plantHero.style.setProperty('--buff-color', color.replace(')', ', 0.35)').replace('hsl(', 'hsla('));
    plantHero.classList.add('buff-active');
}

function collectFirefly(fam, el) {
    el.style.transition = 'opacity 0.25s'; el.style.opacity = '0'; setTimeout(() => el.remove(), 260); audio.chime();
    if (!state.fireflies[fam]) state.fireflies[fam] = 0;
    const _hadGuardian = (typeof hasGuardian === 'function') ? hasGuardian(fam) : (state.fireflies[fam] >= GUARDIAN_THRESHOLD);
    if (state.fireflies[fam] < CONFIG.maxFireflyPerFamily) {
        state.fireflies[fam]++; state.totalFireflies++;
        if (typeof unlockDiscovery === 'function') unlockDiscovery('first_firefly');
        // One of each family?
        try {
            const families = FIREFLY_FAMILIES.length || 0;
            let haveAll = families > 0;
            for (let i = 0; i < families; i++) {
                const k = String(i);
                if (!state.fireflies || !state.fireflies[k] || state.fireflies[k] <= 0) { haveAll = false; break; }
            }
            if (haveAll) unlockDiscovery('all_families');
        } catch (_) {}
 spawnFloatingText('+' + FIREFLY_FAMILIES[fam].name + '!', getFireflyColor(fam), 'good');
        if (((typeof hasGuardian === 'function') ? hasGuardian(fam) : (state.fireflies[fam] >= GUARDIAN_THRESHOLD)) && !_hadGuardian && typeof unlockDiscovery === 'function') unlockDiscovery('first_guardian');
        if (state.fireflies[fam] % GUARDIAN_THRESHOLD === 0) spawnFloatingText('🏆 Guardian ready.', getFireflyColor(fam), 'good');
    } else spawnFloatingText('Max collected.', null, 'warn');
    state.growth += 2; saveState();
}

function activateGuardian(fam, el) {
    if (activeBigFireflies.includes(fam)) return;
    const have = (state.fireflies && state.fireflies[fam]) ? state.fireflies[fam] : 0;
    if (have < (typeof GUARDIAN_INVOKE_COST !== 'undefined' ? GUARDIAN_INVOKE_COST : 25)) {
        const need = (typeof GUARDIAN_INVOKE_COST !== 'undefined' ? GUARDIAN_INVOKE_COST : 25);
        spawnFloatingText(`Need ${need} fireflies to invoke a Guardian.`, getFireflyColor(fam), 'warn');
        return;
    }
    const cost = (typeof GUARDIAN_INVOKE_COST !== 'undefined' ? GUARDIAN_INVOKE_COST : 25);
    state.fireflies[fam] = have - cost;
    state.totalFireflies = Math.max(0, (state.totalFireflies || 0) - cost);
    activeBigFireflies.push(fam); if (!state.activeGuardians.includes(fam)) state.activeGuardians.push(fam);
    const col = getFireflyColor(fam); spawnFloatingText(FIREFLY_FAMILIES[fam].name + ' Guardian active.', col, 'good');
    if (typeof audio !== 'undefined' && audio.ctx) {
        const ctx = audio.ctx; if (ctx.state === 'suspended') ctx.resume(); const now = ctx.currentTime; const baseFreq = 220;
        [1, 1.25, 1.5, 2, 2.5].forEach((mult, i) => {
            const osc = ctx.createOscillator(), gain = ctx.createGain(), filter = ctx.createBiquadFilter();
            osc.type = 'sine'; osc.frequency.value = baseFreq * mult;
            filter.type = 'lowpass'; filter.frequency.value = 1200;
            gain.gain.setValueAtTime(0, now + i * 0.08); gain.gain.linearRampToValueAtTime(0.12 - i * 0.015, now + i * 0.08 + 0.1); gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 2.5);
            osc.connect(filter); filter.connect(gain); gain.connect(ctx.destination);
            osc.start(now + i * 0.08); osc.stop(now + i * 0.08 + 3);
        });
    }
    const rect = el.getBoundingClientRect(); el.style.animation = 'none'; el.style.left = rect.left + 'px'; el.style.top = rect.top + 'px'; el.style.transform = 'none'; el.offsetHeight; el.classList.add('guardian-tapped'); el.style.pointerEvents = 'none';
    setTimeout(() => { el.classList.remove('guardian-tapped'); el.classList.add('guardian-active'); }, 600);
    setTimeout(() => { el.remove(); activeBigFireflies = activeBigFireflies.filter(x => x !== fam); state.activeGuardians = state.activeGuardians.filter(x => x !== fam); saveState(); }, 59000);
}
window.forceStopAllAudio = function() {
    const mediaElements = document.querySelectorAll('audio, video');
    mediaElements.forEach(el => {
        try {
            el.pause();
            el.muted = true;
            el.autoplay = false;
            el.loop = false;
            el.src = "";
            el.load();
            if (el.parentNode) el.remove();
        } catch (e) {
            console.warn("Error killing audio tag:", e);
        }
    });

    try {
        const potentialAudioNames = ['bgm', 'music', 'backgroundMusic', 'audio', 'player', 'sound', 'bgAudio'];
        potentialAudioNames.forEach(name => {
            const obj = window[name];
            if (obj && typeof obj.pause === 'function') {
                obj.pause();
                if (typeof obj.muted !== 'undefined') obj.muted = true;
            }
        });
    } catch (e) {}

    if (typeof window.Howler !== 'undefined' && window.Howler.unload) {
        window.Howler.unload();
    }
};

function processOfflineProgress() {
    const now = Date.now(), diffSec = (now - state.lastSave) / 1000;
    if (diffSec < 60) return;
    const w0 = state.water, s0 = state.sun, l0 = state.love, scars0 = [...state.scars], chunkSize = CONFIG.offlineChunkSize;
    let totalGrowth = 0, allScars = [];
    for (let elapsed = 0; elapsed < diffSec && !state.isDead; elapsed += chunkSize) {
        const dt = Math.min(chunkSize, diffSec - elapsed), result = simulateStep(dt, 'offline');
        totalGrowth += result.growth;
        if (result.scarsAdded) allScars.push(...result.scarsAdded);
    }
    const hrs = diffSec / 3600; let nested = null;
    if (hrs >= 2 && Math.random() < 0.4) {
        const fi = Math.floor(Math.random() * FIREFLY_FAMILIES.length); state.fireflies[fi] = (state.fireflies[fi] || 0) + 1; state.totalFireflies++; nested = FIREFLY_FAMILIES[fi];
    }
    let dream = null;
    if (hrs >= 1) {
        const di = Math.floor(Math.random() * DREAMS.length);
        if (di !== state.lastDream) { dream = DREAMS[di]; state.lastDream = di; }
    }
    if (diffSec > 600 && els.toastBody) {
        let tc = '';
        if (dream) tc += `<div style="font-style:italic;margin-bottom:10px;opacity:0.9;">While away, your plant ${dream}</div>`;
        const hrsDisplay = hrs >= 1 ? `${Math.floor(hrs)}h ${Math.floor((diffSec % 3600) / 60)}m` : `${Math.floor(diffSec / 60)}m`;
        tc += `<div style="font-size:0.85rem;opacity:0.8;margin-bottom:8px;">You were away for <b>${hrsDisplay}</b></div>`;
        tc += `<div style="font-size:0.8rem;margin-bottom:4px;">💧 Water: ${w0.toFixed(0)} → <b>${state.water.toFixed(0)}</b> (${(state.water - w0) >= 0 ? '+' : ''}${(state.water - w0).toFixed(0)})</div>`;
        tc += `<div style="font-size:0.8rem;margin-bottom:4px;">☀️ Sun: ${s0.toFixed(0)} → <b>${state.sun.toFixed(0)}</b> (${(state.sun - s0) >= 0 ? '+' : ''}${(state.sun - s0).toFixed(0)})</div>`;
        tc += `<div style="font-size:0.8rem;margin-bottom:4px;">❤️ Love: ${l0.toFixed(0)} → <b>${state.love.toFixed(0)}</b> (${(state.love - l0) >= 0 ? '+' : ''}${(state.love - l0).toFixed(0)})</div>`;
        tc += `<div style="font-size:0.8rem;margin-bottom:8px;">🌱 Growth: +<b>${Math.floor(totalGrowth)}</b></div>`;
        const newScars = [...new Set(allScars)].filter(s => !scars0.includes(s));
        if (newScars.length > 0) tc += `<div style="color:#fb923c;font-size:0.85rem;">🩹 New scars: ${newScars.map(s => ({ wilt: 'Wilted', bend: 'Bent', pale: 'Faded', dormant: 'Dormant' }[s] || s)).join(', ')}</div>`;
        const ps = getPlantState();
        tc += `<div style="margin-top:8px;">Your plant is <span style="color:${ps.color};font-weight:bold;">${ps.label}</span></div>`;
        if (nested) tc += `<div style="color:${getFireflyColor(FIREFLY_FAMILIES.indexOf(nested))};margin-top:5px;">🦋 A ${nested.name} firefly nested nearby!</div>`;
        els.toastBody.innerHTML = tc; els.welcomeToast.classList.add('visible');
    }
    state.lastSave = now; saveState(); renderPlant('plantGroup', state.dna, state.stage); updateUI();
}

function closeToast() { els.welcomeToast.classList.remove('visible'); }

function showHintBubble(htmlOrText) {
    const bubble = els.hintBubble || document.getElementById('hintBubble');
    const content = els.hintContent || document.getElementById('hintContent');
    if (!bubble || !content) {
        // Fallback: last resort, but always show the full message
        alert(String(htmlOrText || ''));
        return;
    }
    content.textContent = String(htmlOrText || '');
    bubble.classList.add('visible');
}
function handleVisibility() {
    if (document.visibilityState === 'visible') {
        processOfflineProgress(); saveState(); lastTickTime = Date.now();
        
        if (typeof audio !== 'undefined' && audio.ctx && audio.ctx.state === 'suspended') {
            audio.ctx.resume().then(() => {
                restoreAudioState();
            });
        } else {
            restoreAudioState();
        }
    } else {
        if (typeof saveDebounceTimer !== 'undefined' && saveDebounceTimer) { try { clearTimeout(saveDebounceTimer); } catch (e) { } saveDebounceTimer = null; }
        stopAudioForBackground();
        saveState(); 
    }
}

function restoreAudioState() {
    if (state.isRainOn && typeof audio !== 'undefined') audio.startRainSound(); 
    if (state.isMusicPlaying && typeof audio !== 'undefined') audio.playBackgroundMusic();
}

function stopAudioForBackground() {
    if (typeof audio !== 'undefined') {
        audio.stopRainSound();
        audio.stopBackgroundMusic();
        if (audio.ctx && audio.ctx.state === 'running') {
            audio.ctx.suspend();
        }
    }
    if (typeof window.forceStopAllAudio === 'function') {
        window.forceStopAllAudio();
    }
}

function saveState() { state.lastSave = Date.now(); try { localStorage.setItem('pocketSprout', JSON.stringify(state)); } catch (e) { } }
function ensureStateDefaults() {
    if (!state.neglect) state.neglect = { waterLowMs: 0, sunLowMs: 0, loveLowMs: 0, crisisMs: 0, partialDormant: false };
    if (typeof state.lastWhisperAt !== 'number') state.lastWhisperAt = 0;
    if (typeof state.dayProgress !== 'number') state.dayProgress = 0;
    if (!Array.isArray(state.noticeLog)) state.noticeLog = [];
    if (typeof state.nameSuggestion !== 'string') state.nameSuggestion = '';
    if (typeof state.lastWhisperText !== 'string') state.lastWhisperText = '';
}
function loadState() { try { const s = localStorage.getItem('pocketSprout'); if (s) state = { ...state, ...JSON.parse(s) }; ensureStateDefaults(); } catch (e) { } }

function resetGame(preserveHistory = true) {
    if (preserveHistory && state.name !== 'Sprout' && !state.isDead) {
        state.history.push({
            name: state.name,
            gen: state.generation,
            days: state.day,
            dna: { ...state.dna },
            stage: state.stage,
            scars: [...state.scars],
            potColor: state.potColor,
            potPattern: state.potPattern
        });
    }
    const hist = preserveHistory ? state.history : [];
    const tf = preserveHistory ? state.totalFireflies : 0;
    const ff = preserveHistory ? state.fireflies : {};
    const it = preserveHistory ? state.inheritedTraits : [];
    const gen = preserveHistory ? state.generation + 1 : 1;
    
    if (!preserveHistory) state.inheritedTraits = [];

    state = {
        water: 50, sun: 50, love: 50, growth: 0, stage: 1, isSunLampOn: false, isRainOn: false, day: 1, dayProgress: 0, generation: gen, name: "Sprout", nameSuggestion: '', season: state.season || 0, dna: generateDNA(), potColor: POT_COLORS[0], potPattern: 'patNone', potPatternColor: 'rgba(255,255,255,0.5)', timeAtZero: 0, isDead: false, history: hist, lastSave: Date.now(), growthMultiplier: 1, singCooldownUntil: 0, fertilizeCooldownUntil: 0, fireflies: ff, totalFireflies: tf, activeGuardians: [], buffs: [], scars: [], crisisCount: 0, inheritedTraits: it, lastDream: null, isMusicPlaying: false, neglect: { waterLowMs: 0, sunLowMs: 0, loveLowMs: 0, crisisMs: 0, partialDormant: false }, lastWhisperAt: 0, noticeLog: preserveHistory ? state.noticeLog : [], lastWhisperText: ''
    };
    els.deathOverlay.classList.remove('open'); els.plantHero.classList.remove('dead-plant', 'dormant-plant');
    audio.stopRainSound(); setupWorld(); renderPlant('plantGroup', state.dna, state.stage); renderPotPreview(); updateUI(); saveState();
}

function handleBackButton(e) {
    if (!e.state || !e.state.pocketSprout) { history.pushState({ pocketSprout: true, depth: 1 }, ''); return; }
    const overlays = [{ el: els.fireflyOverlay, close: closeFireflyLog }, { el: els.potOverlay, close: closePotDesigner }, { el: els.harvestOverlay, close: closeHarvestModal }, { el: els.archiveOverlay, close: closeArchive }, { el: els.traitOverlay, close: closeTraitGlossary }, { el: els.helpOverlay, close: closeHelp }, { el: els.logOverlay, close: closeCareLog }, { el: els.seasonOverlay, close: closeSeasonInfo }, { el: els.resetOverlay, close: closeResetOverlay }, { el: els.menuOverlay, close: toggleMenu }];
    for (const o of overlays) if (o.el && o.el.classList.contains('open')) { o.close(); break; }
    pushHistoryState();
}

function spawnFloatingText(text, color = null, kind = 'info') {
    const now = Date.now();
    if (!Array.isArray(state.noticeLog)) state.noticeLog = [];
    if (typeof state.nameSuggestion !== 'string') state.nameSuggestion = '';
    state.noticeLog.unshift({ t: now, text: String(text || ''), kind: kind || 'info' });
    if (state.noticeLog.length > 120) state.noticeLog.length = 120;
    const stack = els.whisperStack || document.getElementById('whisperStack'); if (!stack) return;
    const txt = String(text || '');
    if (now - state.lastWhisperAt < 320 && txt === state.lastWhisperText) return;
    state.lastWhisperAt = now; state.lastWhisperText = txt;
    const msg = document.createElement('div'); msg.className = `whisper ${kind}`;
    if (color) msg.style.setProperty('--whisper-color', color);
    const dot = document.createElement('div'); dot.className = 'whisper-dot';
    const body = document.createElement('div'); body.className = 'whisper-text'; body.textContent = txt;
    msg.appendChild(dot); msg.appendChild(body); stack.prepend(msg);
    while (stack.children.length > 2) stack.lastElementChild?.remove();
    const life = 3600; setTimeout(() => msg.classList.add('fade'), Math.max(0, life - 520)); setTimeout(() => msg.remove(), life);
    if (els.logOverlay && els.logOverlay.classList.contains('open')) renderCareLog();
}

let debugTapCount = 0, debugTapTimer = null;
function handleDebugTap() {
    debugTapCount++; clearTimeout(debugTapTimer); debugTapTimer = setTimeout(() => debugTapCount = 0, 3000);
    if (debugTapCount >= CONFIG.debugTapThreshold) { toggleDebug(); debugTapCount = 0; }
}

function toggleDebug() { els.debugPanel.classList.toggle('open'); if (els.debugPanel.classList.contains('open')) updateDebugState(); }
function debugLog(m) { const l = document.getElementById('debugLog'); if (l) l.innerHTML = `[${new Date().toLocaleTimeString()}] ${m}<br>` + l.innerHTML; }
function updateDebugState() { const s = document.getElementById('debugState'); if (s) s.textContent = JSON.stringify(state, null, 2); }
function debugMaxStats() { state.water = 100; state.sun = 100; state.love = 100; render(); debugLog('Max stats'); }
function debugGrow() { state.growth += 1000; render(); debugLog('+1000 growth'); }
function debugEvolve() { if (state.stage < 5) { state.stage++; renderPlant('plantGroup', state.dna, state.stage); debugLog(`Stage ${state.stage}`); } else debugLog('Max stage'); }
function debugKill() { triggerDeath(); debugLog('Killed'); }
function debugUnlockFireflies() { FIREFLY_FAMILIES.forEach((_, i) => { state.fireflies[i] = CONFIG.maxFireflyPerFamily; }); state.totalFireflies = FIREFLY_FAMILIES.length * CONFIG.maxFireflyPerFamily; debugLog('All fireflies'); }
function debugAddFirefly() { const i = Math.floor(Math.random() * FIREFLY_FAMILIES.length); if (!state.fireflies[i]) state.fireflies[i] = 0; state.fireflies[i]++; state.totalFireflies++; debugLog(`+${FIREFLY_FAMILIES[i].name}`); }
function debugCycleTime() {
    const ts = ['night', 'dawn', 'morning', 'day', 'afternoon', 'dusk', 'evening'], c = ts.findIndex(t => document.body.classList.contains('time-' + t)), n = (c + 1) % ts.length;
    document.body.className = document.body.className.replace(/time-\w+/g, ''); document.body.classList.add('time-' + ts[n]); debugLog('Time: ' + ts[n]);
}
function debugCycleSeason() { state.season = (state.season + 1) % 4; updateSeason(); debugLog('Season: ' + SEASONS[state.season].name); }
function debugCycleMoon() {
    const m = document.getElementById('moonElement');
    if (m) {
        const ps = [0, 25, 50, 75, 100, -75, -50, -25], c = ps.indexOf(parseInt(m.style.getPropertyValue('--moon-phase')) || 0), n = (c + 1) % ps.length;
        m.style.setProperty('--moon-phase', ps[n] + '%'); debugLog('Moon cycled');
    }
}
function debugAddScar() {
    const st = ['wilt', 'bend', 'pale', 'dormant'], av = st.filter(s => !state.scars.includes(s));
    if (av.length > 0) { const s = av[Math.floor(Math.random() * av.length)]; state.scars.push(s); renderPlant('plantGroup', state.dna, state.stage); updateUI(); debugLog('Scar: ' + s); } else debugLog('All scars');
}
function debugResetGame() { localStorage.removeItem('pocketSprout'); location.reload(); }
function debugSim6hHappy() { state.water = 80; state.sun = 80; state.love = 80; state.lastSave = Date.now() - 6 * 3600 * 1000; processOfflineProgress(); debugLog('Sim 6h Happy'); }
function debugSim6hThirst() { state.water = 15; state.sun = 60; state.love = 50; state.lastSave = Date.now() - 6 * 3600 * 1000; processOfflineProgress(); debugLog('Sim 6h Thirst'); }
function debugSim16hCrisis() { state.water = 5; state.sun = 5; state.love = 5; state.lastSave = Date.now() - 16 * 3600 * 1000; processOfflineProgress(); debugLog('Sim 16h Crisis'); }

function init() {
    if (typeof window.forceStopAllAudio === 'function') window.forceStopAllAudio();
    
    const ghostCheck = setInterval(() => {
        if (!state.isMusicPlaying && typeof window.forceStopAllAudio === 'function') window.forceStopAllAudio();
    }, 800);
    setTimeout(() => clearInterval(ghostCheck), 8000);

    cacheElements(); loadState();
    if (!state.dna) state.dna = generateDNA();
    initPatterns(); setupWorld(); setupWeather();
    if (typeof setupNightMotes === 'function') setupNightMotes();
    renderPlant('plantGroup', state.dna, state.stage); renderPotPreview();
    updateTimeOfDay(); updateMoonPhase(); updateSeason(); updateUI();
    if (state.isRainOn) applyTheme();
    processOfflineProgress(); startGameLoop(); setupEventListeners();
    setInterval(() => { updateTimeOfDay(); updateMoonPhase(); }, 60000);
    audio.init(); ensureNamePrompt(true);
    if (document.visibilityState === 'visible') { if (state.isRainOn) audio.startRainSound(); if (state.isMusicPlaying) audio.playBackgroundMusic(); }
}

function cacheElements() {
    ['skyLayer', 'starsContainer', 'moonElement', 'moonlightBeam', 'seasonalContainer', 'rainContainer', 'rainbowContainer', 'statusArea', 'genBadge', 'plantNameDisplay', 'plantMoodDisplay', 'seasonIndicator', 'evolutionBar', 'menuOverlay', 'fireflyOverlay', 'potOverlay', 'helpOverlay', 'traitOverlay', 'harvestOverlay', 'deathOverlay', 'archiveOverlay', 'resetOverlay', 'welcomeToast', 'toastBody', 'hintBubble', 'hintContent', 'traitGlossaryList', 'plantHero', 'plantGraphics', 'potGroup', 'plantGroup', 'vitals', 'ringWater', 'ringSun', 'ringLove', 'nameInput', 'menuGen', 'menuAge', 'menuStage', 'menuHealth', 'menuProgressBar', 'menuScars', 'menuScarList', 'menuInherited', 'menuInheritedList', 'greenhouseList', 'btnHarvest', 'btnSing', 'btnFertilize', 'btnMusic', 'btnReset', 'btnRain', 'btnSun', 'btnMenu', 'fireflyFamilyGrid', 'familyDetailPanel', 'detailOrb', 'detailFamilyName', 'detailFamilyPower', 'detailFireflyCount', 'releaseBtn', 'guardianProgressText', 'potColorGrid', 'potPatternGrid', 'patternColorGrid', 'potPreviewGroup', 'harvestPlantGroup', 'inheritedTraitDisplay', 'archivePlantGroup', 'archivePotGroup', 'archiveTitle', 'archiveStats', 'debugPanel', 'debugLog', 'debugState', 'whisperStack', 'logOverlay', 'logSub', 'logList', 'seasonOverlay', 'seasonNow', 'seasonNowBody', 'dayNameDisplay', 'seasonIcon', 'weatherIcon', 'stageBadge', 'growthPercent', 'urgencyWarning', 'urgencyText'].forEach(id => els[id] = document.getElementById(id));
}

function setupEventListeners() {
    document.addEventListener("visibilitychange", handleVisibility);
    
    window.addEventListener("blur", stopAudioForBackground);
    window.addEventListener("pagehide", () => { stopAudioForBackground(); saveState(); }); 
    window.addEventListener("beforeunload", () => { stopAudioForBackground(); saveState(); });
    
    const pot = document.getElementById('potGroup');
    if (pot) {
        pot.addEventListener('mousedown', () => handlePress(true)); pot.addEventListener('mouseup', () => handlePress(false)); pot.addEventListener('mouseleave', () => handlePress(false));
        pot.addEventListener('touchstart', e => { e.preventDefault(); handlePress(true); }, { passive: false }); pot.addEventListener('touchend', e => { e.preventDefault(); handlePress(false); });
    }
    // Tap the status mood message to see it in full (no ticker, no reset)
    if (els.plantMoodDisplay) {
        const openFullMood = (e) => {
            if (e) { try { e.stopPropagation(); } catch (_) {} }
            const txt = els.plantMoodDisplay.dataset.fullText || els.plantMoodDisplay.textContent || '';
            if (!txt) return;
            showHintBubble(txt);
        };
        els.plantMoodDisplay.addEventListener('click', openFullMood);
        els.plantMoodDisplay.addEventListener('touchend', openFullMood, { passive: true });
    }
    setInterval(() => { checkSingCooldown(); checkFertilizeCooldown(); }, 1000);
    checkSingCooldown(); checkFertilizeCooldown();
    window.addEventListener('popstate', handleBackButton);
    if (!history.state || !history.state.pocketSprout) history.replaceState({ pocketSprout: true, depth: 0 }, '');
    pushHistoryState();
    requestAnimationFrame(() => requestAnimationFrame(positionMoonbeam));
    window.addEventListener('resize', () => requestAnimationFrame(positionMoonbeam));
}

function pushHistoryState() { history.pushState({ pocketSprout: true, depth: (history.state?.depth || 0) + 1 }, ''); }

function positionMoonbeam() {
    const moon = document.getElementById('moonElement'), beam = document.getElementById('moonlightBeam'), potGroup = document.getElementById('potGroup');
    if (!moon || !beam || !potGroup) return;
    const moonRect = moon.getBoundingClientRect(), potRect = potGroup.getBoundingClientRect();
    const moonCX = moonRect.left + moonRect.width / 2, moonCY = moonRect.top + moonRect.height / 2, potCX = potRect.left + potRect.width / 2, potCY = potRect.top + potRect.height / 2;
    const dx = potCX - moonCX, dy = potCY - moonCY, dist = Math.sqrt(dx * dx + dy * dy), ang = Math.atan2(dx, dy) * (180 / Math.PI);
    beam.style.left = (moonCX - 90) + 'px'; beam.style.top = moonCY + 'px'; beam.style.height = (dist + 80) + 'px'; beam.style.transform = `rotate(${-ang}deg)`;
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
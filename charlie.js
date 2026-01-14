function init() {
    cacheElements();
    loadState();
    if (!state.dna) state.dna = generateDNA();
    initPatterns();
    setupWorld();
    setupWeather();
    renderPlant('plantGroup', state.dna, state.stage);
    renderPotPreview();
    updateTimeOfDay();
    updateMoonPhase();
    updateSeason();
    updateUI();
    if (state.isRainOn) applyTheme();
    processOfflineProgress();
    startGameLoop();
    setupEventListeners();
    setInterval(() => {
        updateTimeOfDay();
        updateMoonPhase()
    }, 60000);
    audio.init();
    syncAmbientAudioUI();

    // If the browser blocked audio autoplay on reload/navigation, retry on first interaction.
    document.addEventListener('pointerdown', function _resumeAudioOnce(){
        syncAmbientAudioUI();
        document.removeEventListener('pointerdown', _resumeAudioOnce);
    }, { once: true });
// Add Fade Out Logic for links
    document.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', e => {
            e.preventDefault();
            const target = link.href;
            document.body.classList.add('fade-out');
            setTimeout(() => {
                window.location.href = target;
            }, 500); // Matches .5s CSS transition
        });
    });
}

function cacheElements() {
    ['skyLayer', 'starsContainer', 'moonElement', 'moonlightBeam', 'seasonalContainer', 'rainContainer', 'rainbowContainer', 'statusArea', 'genBadge', 'plantNameDisplay', 'plantMoodDisplay', 'seasonIndicator', 'evolutionBar','contaminationBar', 'menuOverlay', 'fireflyOverlay', 'potOverlay', 'helpOverlay', 'harvestOverlay', 'deathOverlay', 'archiveOverlay', 'resetOverlay', 'welcomeToast', 'toastBody', 'plantHero', 'plantGraphics', 'potGroup', 'plantGroup', 'vitals', 'ringWater', 'ringSun', 'ringLove', 'nameInput', 'menuGen', 'menuAge', 'menuStage', 'menuHealth', 'menuProgressBar', 'menuScars', 'menuScarList', 'menuInherited', 'menuInheritedList', 'greenhouseList', 'btnHarvest', 'btnSing', 'btnFertilize', 'btnMusic', 'btnReset', 'btnRain', 'btnSun', 'btnMenu', 'fireflyFamilyGrid', 'familyDetailPanel', 'detailOrb', 'detailFamilyName', 'detailFamilyPower', 'detailFireflyCount', 'releaseBtn', 'guardianProgressText', 'potColorGrid', 'potPatternGrid', 'patternColorGrid', 'potPreviewGroup', 'harvestPlantGroup', 'inheritedTraitDisplay', 'archivePlantGroup', 'archivePotGroup', 'archiveTitle', 'archiveStats', 'debugPanel', 'debugLog', 'debugState'].forEach(id => els[id] = document.getElementById(id));
}

function setupEventListeners() {
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("pagehide", saveState);
    window.addEventListener("beforeunload", () => saveState());
    const pot = document.getElementById('potGroup');
    if (pot) {
        pot.addEventListener('mousedown', () => handlePress(true));
        pot.addEventListener('mouseup', () => handlePress(false));
        pot.addEventListener('mouseleave', () => handlePress(false));
        pot.addEventListener('touchstart', e => {
            e.preventDefault();
            handlePress(true)
        }, {
            passive: false
        });
        pot.addEventListener('touchend', e => {
            e.preventDefault();
            handlePress(false)
        });
    }
    setInterval(() => {
        checkSingCooldown();
        checkFertilizeCooldown()
    }, 1000);
    checkSingCooldown();
    checkFertilizeCooldown();
    window.addEventListener('popstate', handleBackButton);
    if (!history.state || !history.state.pocketSprout) {
        history.replaceState({
            pocketSprout: true,
            depth: 0
        }, '')
    }
    pushHistoryState();
    requestAnimationFrame(() => {
        requestAnimationFrame(positionMoonbeam);
    });
    window.addEventListener('resize', () => requestAnimationFrame(positionMoonbeam));
}

function pushHistoryState() {
    const depth = (history.state?.depth || 0) + 1;
    history.pushState({
        pocketSprout: true,
        depth: depth
    }, '')
}

function positionMoonbeam() {
    const moon = document.getElementById('moonElement');
    const beam = document.getElementById('moonlightBeam');
    const potGroup = document.getElementById('potGroup');
    if (!moon || !beam || !potGroup) return;

    const moonRect = moon.getBoundingClientRect();
    const moonCenterX = moonRect.left + moonRect.width / 2;
    const moonCenterY = moonRect.top + moonRect.height / 2;

    const potRect = potGroup.getBoundingClientRect();
    const potCenterX = potRect.left + potRect.width / 2;
    const potCenterY = potRect.top + potRect.height / 2;

    const dx = potCenterX - moonCenterX;
    const dy = potCenterY - moonCenterY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    const angleRad = Math.atan2(dx, dy);
    const angleDeg = angleRad * (180 / Math.PI);

    const beamWidth = 180;

    beam.style.left = (moonCenterX - beamWidth / 2) + 'px';
    beam.style.top = moonCenterY + 'px';
    beam.style.height = (distance + 80) + 'px';
    beam.style.transform = `rotate(${-angleDeg}deg)`;
}

function render() {
    if (els.ringWater) els.ringWater.style.strokeDashoffset = 283 * (1 - state.water / 100);
    if (els.ringSun) els.ringSun.style.strokeDashoffset = 264 * (1 - state.sun / 100);
    if (els.ringLove) els.ringLove.style.strokeDashoffset = 245 * (1 - state.love / 100);
    if (els.genBadge) els.genBadge.textContent = `CYCLE ${state.generation}`;
    if (els.plantNameDisplay) els.plantNameDisplay.textContent = state.name;
    
    // Update Pollution Counter
    const pollCount = document.getElementById('mainPollutionCount');
    if (pollCount) pollCount.textContent = state.pollution || 0;

    const mood = getMood();
    if (els.plantMoodDisplay) {
        els.plantMoodDisplay.textContent = mood.text;
        els.plantMoodDisplay.style.color = mood.color
    }
    if (els.btnSun) els.btnSun.classList.toggle('sun-active', state.isSunLampOn);
    if (els.btnRain) els.btnRain.classList.toggle('rain-active', state.isRainOn);
    if (els.evolutionBar) {
        if (state.stage < 6) {
            const prev = STAGE_THRESHOLDS[state.stage - 1] || 0,
                next = STAGE_THRESHOLDS[state.stage];
            els.evolutionBar.style.width = Math.min(100, ((state.growth - prev) / (next - prev)) * 100) + '%'
        } else {
            els.evolutionBar.style.width = '100%'
        }
    }

    if (els.contaminationBar) {
        const c = Math.max(0, Math.min(100, (state.soilContamination || 0)));
        els.contaminationBar.style.width = c + '%';
    }

    const scale = Math.min(1.4, 1 + (state.growth / 6000));
    if (els.plantGraphics) els.plantGraphics.style.transform = `scale(${scale})`;
    if (els.menuOverlay && els.menuOverlay.classList.contains('open')) updateMenuStats();
    updateSeason()
}

function updateUI() {
    render();
    updateMenuStats()
}

function updateMenuStats() {
    if (els.nameInput && document.activeElement !== els.nameInput) els.nameInput.value = state.name;
    if (els.menuGen) els.menuGen.textContent = state.generation;
    if (els.menuAge) els.menuAge.textContent = state.day + " Days";
    if (els.menuStage) els.menuStage.textContent = STAGES[state.stage - 1] || 'Seed';
    const ps = getPlantState();
    if (els.menuHealth) {
        els.menuHealth.textContent = ps.label;
        els.menuHealth.style.color = ps.color
    }
    if (els.menuProgressBar) {
        if (state.stage < 6) {
            const prev = STAGE_THRESHOLDS[state.stage - 1] || 0,
                next = STAGE_THRESHOLDS[state.stage];
            els.menuProgressBar.style.width = Math.min(100, ((state.growth - prev) / (next - prev)) * 100) + '%'
        } else {
            els.menuProgressBar.style.width = '100%'
        }
    }

    // --- Soil Health UI ---
    const soilHealthDisplay = document.getElementById('menuSoilHealth');
    if (soilHealthDisplay) {
        const health = 100 - (state.soilContamination || 0);
        soilHealthDisplay.textContent = Math.ceil(health) + "%";
        soilHealthDisplay.style.color = health > 70 ? '#4ade80' : (health > 30 ? '#facc15' : '#f87171');
    }

    const btnCleanSoil = document.getElementById('btnCleanSoil');
    if (btnCleanSoil) {
        const canAfford = (state.pollution || 0) >= 50;
        btnCleanSoil.disabled = !canAfford;
        btnCleanSoil.innerHTML = `✨ Purify Soil (50 Essence)`;
    }

    if (els.menuScars && els.menuScarList) {
        if (state.scars.length > 0) {
            els.menuScars.style.display = 'flex';
            els.menuScarList.textContent = state.scars.map(s => ({
                wilt: 'Wilted',
                bend: 'Bent',
                pale: 'Faded',
                dormant: 'Dormant'
            } [s] || s)).join(', ')
        } else {
            els.menuScars.style.display = 'none'
        }
    }
    if (els.menuInherited && els.menuInheritedList) {
        if (state.inheritedTraits.length > 0) {
            els.menuInherited.style.display = 'flex';
            els.menuInheritedList.textContent = state.inheritedTraits.map(id => {
                const t = INHERITABLE_TRAITS.find(x => x.id === id);
                return t ? t.name : id
            }).join(', ')
        } else {
            els.menuInherited.style.display = 'none'
        }
    }
    if (els.btnHarvest) els.btnHarvest.classList.toggle('visible', state.stage >= 5);
    if (els.greenhouseList) {
        els.greenhouseList.innerHTML = '';
        [...state.history].reverse().forEach((h, i) => {
            const item = document.createElement('div');
            item.className = 'greenhouse-item';
            const col = h.dna?.flowerColor || `hsl(${h.dna?.flowerH||0},50%,50%)`;
            item.innerHTML = `<span><span class="gh-dot" style="background:${col}"></span>${h.name}</span><span style="opacity:0.5">Cycle ${h.gen}</span>`;
            item.onclick = () => viewArchive(state.history.length - 1 - i);
            els.greenhouseList.appendChild(item)
        })
    }
}

function cleanSoil() {
    const cost = 50;
    if ((state.pollution || 0) < cost) {
        spawnFloatingText("Not enough essence...", "#888");
        return;
    }

    state.pollution -= cost;
    state.soilContamination = 0;
    
    audio.chime();
    spawnFloatingText("✨ Soil Purified!", "var(--accent-growth)");
    
    // Immediate visual update to the dirt
    if (typeof updateMainPot === 'function') updateMainPot();
    
    updateUI();
    saveState();
}

function interact(type, e) {
    if (state.isDead) return;
    if (e) e.stopPropagation();
    if (type === 'rain') {
        state.isRainOn = !state.isRainOn;
        spawnFloatingText(state.isRainOn ? "☁️ Rain ON" : "☁️ Rain OFF", "var(--accent-water)");
        applyTheme()
    } else if (type === 'sun') {
        if (isDaytime()) {
            state.isSunLampOn = !state.isSunLampOn;
            spawnFloatingText(state.isSunLampOn ? "☀️ ON" : "🌑 OFF", "var(--accent-sun)")
        } else {
            if (isNewMoon()) {
                spawnFloatingText("New Moon - No light", "#888");
                return
            }
            state.isSunLampOn = !state.isSunLampOn;
            spawnFloatingText(state.isSunLampOn ? "🌙 Moonlight ON" : "🌙 OFF", "#fef9c3");
            const beam = document.getElementById('moonlightBeam');
            if (beam) beam.classList.toggle('active', state.isSunLampOn)
        }
        audio.sun();
        applyTheme()
    } else if (type === 'love') {
        if (state.love >= 100) {
            spawnFloatingText("Fully Loved!", "var(--accent-love)");
            return
        }
        state.love = Math.min(100, state.love + 15);
        spawnFloatingText("❤️", "var(--accent-love)");
        audio.love();
        els.plantHero.classList.remove('plant-bloop');
        void els.plantHero.offsetWidth;
        els.plantHero.classList.add('plant-bloop');
        setTimeout(() => els.plantHero.classList.remove('plant-bloop'), 500)
    }
    render()
}

function applyTheme() {
    document.body.classList.toggle('sun-mode', state.isSunLampOn && isDaytime());
    const rc = document.getElementById('rainContainer');
    if (rc) rc.classList.toggle('active', state.isRainOn);
    const rb = document.getElementById('rainbowContainer');
    if (rb) rb.classList.toggle('visible', state.isSunLampOn && state.isRainOn);
    audio.toggleRainSound(state.isRainOn);
    const beam = document.getElementById('moonlightBeam');
    if (beam && !isDaytime()) beam.classList.toggle('active', state.isSunLampOn)
}

function animateJiggle() {
    els.plantHero.classList.remove('plant-jiggle');
    void els.plantHero.offsetWidth;
    els.plantHero.classList.add('plant-jiggle')
}

let pressTimer = null,
    isPressed = false;

function handlePress(down) {
    if (state.isDead) return;
    if (down) {
        isPressed = true;
        pressTimer = setTimeout(() => {
            els.vitals.classList.add('active')
        }, 300)
    } else {
        if (!isPressed) return;
        isPressed = false;
        clearTimeout(pressTimer);
        if (els.vitals.classList.contains('active')) els.vitals.classList.remove('active');
        else interact('love')
    }
}

function getFireflyColor(i) {
    const f = FIREFLY_FAMILIES[i];
    return `hsl(${f.hue},${f.sat||70}%,60%)`
}

function attemptSpawnFirefly() {
    if (els.menuOverlay && els.menuOverlay.classList.contains('open')) return;
    if (Math.random() < (state.dna?.fireflyChance || 0.05)) {
        spawnVisualFirefly(Math.floor(Math.random() * 8), false)
    }
    FIREFLY_FAMILIES.forEach((_, i) => {
        if (hasGuardian(i) && !activeBigFireflies.includes(i) && Math.random() < 0.008) {
            spawnVisualFirefly(i, true)
        }
    })
}

function spawnVisualFirefly(fam, isGuardian) {
    const col = getFireflyColor(fam);
    const wrapper = document.createElement('div');
    wrapper.className = 'firefly-wrapper' + (isGuardian ? ' guardian-wrapper' : '');
    // Position near the plant so fireflies feel like they orbit it
    const plantEl = document.getElementById('plantGroup') || document.getElementById('potGroup');
    if (plantEl) {
        const r = plantEl.getBoundingClientRect();
        const pad = 90; // how far around the plant they can appear
        const x = r.left + (Math.random() * (r.width + pad * 2) - pad);
        const y = r.top + (Math.random() * (r.height + pad * 2) - pad);
        wrapper.style.left = x + 'px';
        wrapper.style.top = y + 'px';
    } else {
        // Fallback: center-ish
        wrapper.style.left = (10 + Math.random() * 80) + '%';
        wrapper.style.top = (15 + Math.random() * 50) + '%';
    }

    // Soft drifting path (movement is on the wrapper so taps still work reliably)
    const amp = isGuardian ? 50 : 85;
    const rand = (a) => (Math.random() * 2 - 1) * a;
    wrapper.style.setProperty('--fx1', rand(amp) + 'px');
    wrapper.style.setProperty('--fy1', rand(amp) + 'px');
    wrapper.style.setProperty('--fx2', rand(amp) + 'px');
    wrapper.style.setProperty('--fy2', rand(amp) + 'px');
    wrapper.style.setProperty('--fx3', rand(amp) + 'px');
    wrapper.style.setProperty('--fy3', rand(amp) + 'px');

    const driftDur = (isGuardian ? 18 : 12) + Math.random() * (isGuardian ? 8 : 6);
    wrapper.style.animation = `fireflyDrift ${driftDur.toFixed(2)}s ease-in-out infinite`;
    const ff = document.createElement('div');
    ff.className = 'firefly' + (isGuardian ? ' guardian' : '');
    ff.dataset.family = fam;
    ff.style.setProperty('--firefly-color', col);
    ff.style.background = col;
    ff.style.boxShadow = `0 0 ${isGuardian?20:8}px ${col}`;
    ff.style.opacity = '0';
    ff.style.transform = 'scale(0.5) translate(-50%, -50%)';
    // Fade in/out while it drifts
    const flickerDur = (isGuardian ? 5.5 : 3.5) + Math.random() * (isGuardian ? 2.5 : 2.0);
    ff.style.animation = `fireflyFlicker ${flickerDur.toFixed(2)}s ease-in-out infinite`;
    wrapper.appendChild(ff);
    requestAnimationFrame(() => {
        ff.style.transition = 'opacity 0.8s ease-out, transform 0.8s ease-out';
        ff.style.opacity = '1';
        ff.style.transform = 'scale(1) translate(-50%, -50%)'
    });
    const handleTap = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (isGuardian) {
            activateGuardian(fam, ff, wrapper)
        } else {
            collectFirefly(fam, ff, wrapper)
        }
    };
    wrapper.addEventListener('click', handleTap);
    wrapper.addEventListener('touchend', handleTap, {
        passive: false
    });
    document.body.appendChild(wrapper);
    
    setTimeout(() => {
        if (wrapper.parentNode) {
            ff.style.transition = 'opacity 1s ease-out, transform 1s ease-out';
            ff.style.opacity = '0';
            ff.style.transform = 'scale(0.3) translate(-50%, -50%)';
            setTimeout(() => wrapper.remove(), 1000)
        }
    }, 11000)
}

function collectFirefly(fam, el, wrapper) {
    el.style.transition = 'opacity 0.3s, transform 0.3s';
    el.style.opacity = '0';
    el.style.transform = 'scale(1.5) translate(-50%, -50%)';
    setTimeout(() => wrapper.remove(), 300);
    audio.chime();
    if (!state.fireflies[fam]) state.fireflies[fam] = 0;
    if (state.fireflies[fam] < CONFIG.maxFireflyPerFamily) {
        state.fireflies[fam]++;
        state.totalFireflies++;
        spawnFloatingText(`+${FIREFLY_FAMILIES[fam].name}!`, getFireflyColor(fam));
        if (state.fireflies[fam] === GUARDIAN_THRESHOLD) {
            spawnFloatingText(`🏆 ${FIREFLY_FAMILIES[fam].name} Guardian!`, getFireflyColor(fam))
        }
    } else {
        spawnFloatingText("Max collected!", "#fff")
    }
    state.growth += 2
}

function hasGuardian(i) {
    return (state.fireflies[i] || 0) >= GUARDIAN_THRESHOLD
}

function activateGuardian(fam, el, wrapper) {
    if (activeBigFireflies.includes(fam)) return;
    activeBigFireflies.push(fam);
    if (!state.activeGuardians.includes(fam)) {
        state.activeGuardians.push(fam)
    }
    spawnFloatingText(`${FIREFLY_FAMILIES[fam].name} Guardian Active!`, getFireflyColor(fam));
    el.classList.add('guardian-active');
    wrapper.style.pointerEvents = 'none';
    setTimeout(() => {
        el.style.transition = 'opacity 2s ease-out, transform 2s ease-out';
        el.style.opacity = '0';
        el.style.transform = 'scale(0.3) translate(-50%, -50%)';
        setTimeout(() => {
            wrapper.remove();
            activeBigFireflies = activeBigFireflies.filter(x => x !== fam);
            state.activeGuardians = state.activeGuardians.filter(x => x !== fam)
        }, 2000)
    }, 58000)
}

function releaseFirefly() {
    if (selectedFamily === null || !state.fireflies[selectedFamily] || state.fireflies[selectedFamily] < 1) return;
    state.fireflies[selectedFamily]--;
    state.totalFireflies--;
    const f = FIREFLY_FAMILIES[selectedFamily];
    let bt = f.effect,
        bs = 0.5,
        dur = 30;
    if (bt === 'random') {
        bt = ['water', 'sun', 'love', 'growth', 'health'][Math.floor(Math.random() * 5)];
        bs = 1;
        dur = 45
    }
    state.buffs.push({
        type: bt,
        strength: bs,
        remaining: dur
    });
    spawnFloatingText(`${f.power} released!`, getFireflyColor(selectedFamily));
    renderSanctuary()
}

function toggleMenu() {
    els.menuOverlay.classList.toggle('open');
    if (els.menuOverlay.classList.contains('open')) updateMenuStats()
}

function openFireflyLog() {
    els.menuOverlay.classList.remove('open');
    els.fireflyOverlay.classList.add('open');
    selectedFamily = null;
    renderSanctuary()
}

function closeFireflyLog() {
    els.fireflyOverlay.classList.remove('open');
    els.menuOverlay.classList.add('open')
}

function renderSanctuary() {
    const grid = document.getElementById('fireflyFamilyGrid');
    if (!grid) return;
    grid.innerHTML = '';
    FIREFLY_FAMILIES.forEach((f, i) => {
        const cnt = state.fireflies[i] || 0;
        const isG = cnt >= GUARDIAN_THRESHOLD;
        const col = getFireflyColor(i);
        const card = document.createElement('div');
        card.className = 'family-card' + (selectedFamily === i ? ' selected' : '');
        card.style.setProperty('--family-color', col);
        card.innerHTML = `<div class="family-orb" style="background:${col}"></div><div class="family-name">${f.name}</div><div class="family-count">${cnt}</div><div class="family-power">${isG?'👑':f.power}</div>`;
        card.onclick = () => {
            selectedFamily = i;
            renderSanctuary()
        };
        grid.appendChild(card)
    });
    const det = document.getElementById('familyDetailPanel');
    if (selectedFamily !== null && det) {
        det.style.display = 'block';
        const f = FIREFLY_FAMILIES[selectedFamily],
            cnt = state.fireflies[selectedFamily] || 0,
            col = getFireflyColor(selectedFamily);
        det.style.setProperty('--family-color', col);
        document.getElementById('detailOrb').style.cssText = `background:${col};box-shadow:0 0 20px ${col}`;
        document.getElementById('detailFamilyName').textContent = f.name + ' Family';
        document.getElementById('detailFamilyPower').textContent = f.desc;
        document.getElementById('detailFireflyCount').textContent = `You have ${cnt} fireflies`;
        const btn = document.getElementById('releaseBtn');
        btn.disabled = cnt < 1;
        btn.textContent = cnt > 0 ? `Release One (${cnt} left)` : 'None to release'
    } else if (det) {
        det.style.display = 'none'
    }
    const gt = document.getElementById('guardianProgressText');
    if (gt) {
        const gs = FIREFLY_FAMILIES.filter((_, i) => hasGuardian(i));
        gt.textContent = gs.length > 0 ? `Guardians unlocked: ${gs.map(f=>f.name).join(', ')}` : `Collect ${GUARDIAN_THRESHOLD} of any family to summon their Guardian.`
    }
}

function openPotDesigner() {
    els.menuOverlay.classList.remove('open');
    els.potOverlay.classList.add('open');
    renderPotDesigner()
}

function closePotDesigner() {
    els.potOverlay.classList.remove('open');
    els.menuOverlay.classList.add('open');
    saveState()
}

function renderPotDesigner() {
    const cg = document.getElementById('potColorGrid');
    if (cg) {
        cg.innerHTML = '';
        POT_COLORS.forEach(c => {
            const d = document.createElement('div');
            d.className = 'color-dot' + (state.potColor === c ? ' selected' : '');
            d.style.background = c;
            d.onclick = () => {
                state.potColor = c;
                renderPotDesigner();
                renderPotPreview()
            };
            cg.appendChild(d)
        })
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
            btn.onclick = () => {
                if (unlocked) {
                    state.potPattern = p.id;
                    renderPotDesigner();
                    renderPotPreview()
                }
            };
            pg.appendChild(btn)
        })
    }
    const pcg = document.getElementById('patternColorGrid');
    if (pcg) {
        pcg.innerHTML = '';
        PATTERN_COLORS.forEach(c => {
            const d = document.createElement('div');
            d.className = 'color-dot' + (state.potPatternColor === c ? ' selected' : '');
            d.style.background = c;
            d.onclick = () => {
                state.potPatternColor = c;
                renderPotDesigner();
                renderPotPreview()
            };
            pcg.appendChild(d)
        })
    }
}

function openHelp() {
    els.menuOverlay.classList.remove('open');
    els.helpOverlay.classList.add('open')
}

function closeHelp() {
    els.helpOverlay.classList.remove('open');
    els.menuOverlay.classList.add('open')
}

function harvestPlant() {
    if (state.stage < 5) return;
    els.menuOverlay.classList.remove('open');
    els.harvestOverlay.classList.add('open');
    renderPlant('harvestPlantGroup', state.dna, state.stage);
    const trait = INHERITABLE_TRAITS[Math.floor(Math.random() * INHERITABLE_TRAITS.length)];
    document.getElementById('inheritedTraitDisplay').textContent = `${trait.name}: ${trait.desc}`;
    document.getElementById('inheritedTraitDisplay').dataset.traitId = trait.id
}

function closeHarvestModal() {
    els.harvestOverlay.classList.remove('open');
    els.menuOverlay.classList.add('open')
}

function confirmHarvest() {
    state.history.push({
        name: state.name,
        gen: state.generation,
        days: state.day,
        dna: { ...state.dna
        },
        stage: state.stage,
        scars: [...state.scars],
        potColor: state.potColor,
        potPattern: state.potPattern
    });
    const tid = document.getElementById('inheritedTraitDisplay').dataset.traitId;
    if (!state.inheritedTraits.includes(tid)) state.inheritedTraits.push(tid);
    const oldName = state.name;
    state.generation++;
    state.day = 1;
    state.stage = 1;
    state.growth = 0;
    state.water = 50;
    state.sun = 50;
    state.love = 50;
    state.scars = [];
    state.timeAtZero = 0;
    state.name = 'Sprout';
    state.season = (state.season + 1) % 4;
    state.dna = generateDNA(state.dna);
    els.harvestOverlay.classList.remove('open');
    spawnFloatingText(`A seed from ${oldName} takes root...`, 'var(--accent-growth)');
    setupWorld();
    renderPlant('plantGroup', state.dna, state.stage);
    updateSeason();
    updateUI();
    saveState()
}

function viewArchive(i) {
    if (i < 0 || i >= state.history.length) return;
    const a = state.history[i];
    els.menuOverlay.classList.remove('open');
    els.archiveOverlay.classList.add('open');
    document.getElementById('archiveTitle').textContent = a.name;
    renderPlant('archivePlantGroup', a.dna, a.stage, a.scars || []);
    const stats = document.getElementById('archiveStats');
    stats.innerHTML = `<div class="archive-stat"><span>Generation</span><span>${a.gen}</span></div><div class="archive-stat"><span>Days Lived</span><span>${a.days}</span></div><div class="archive-stat"><span>Stage</span><span>${STAGES[a.stage-1]||'Unknown'}</span></div>${a.scars?.length?`<div class="archive-stat"><span>Scars</span><span>${a.scars.join(', ')}</span></div>`:''}`
}

function closeArchive() {
    els.archiveOverlay.classList.remove('open');
    els.menuOverlay.classList.add('open')
}

function openResetConfirm() {
    els.menuOverlay.classList.remove('open');
    els.resetOverlay.classList.add('open')
}

function closeResetOverlay() {
    els.resetOverlay.classList.remove('open');
    els.menuOverlay.classList.add('open')
}

function finalizeReset() {
    resetGame(false);
    els.resetOverlay.classList.remove('open')
}

function updateName(n) {
    state.name = n.trim() || 'Sprout';
    updateUI();
    saveState()
}

function singToPlant() {
    if (Date.now() < state.singCooldownUntil) return;
    state.singCooldownUntil = Date.now() + CONFIG.singCooldown;
    checkSingCooldown();
    toggleMenu();
    spawnFloatingText("🎵 Singing...", "#748ffc");
    let needed = STAGE_THRESHOLDS[state.stage] || 1000;
    if (state.stage < 4) needed = STAGE_THRESHOLDS[state.stage + 1] - STAGE_THRESHOLDS[state.stage];
    const boost = needed * 0.1;
    state.growth += boost;
    setTimeout(() => spawnFloatingText(`+${Math.floor(boost)} Growth!`, "#4ade80"), 500);
    els.plantHero.classList.add('sing-glow');
    setTimeout(() => els.plantHero.classList.remove('sing-glow'), 3000);
    let i = 0;
    const notes = [261, 329, 392, 523];
    const iv = setInterval(() => {
        if (i >= notes.length) {
            clearInterval(iv);
            return
        }
        audio.play(notes[i], 'triangle', 0.3);
        i++
    }, 300)
}

function fertilizePlant() {
    if (Date.now() < state.fertilizeCooldownUntil) return;
    state.fertilizeCooldownUntil = Date.now() + CONFIG.fertilizeCooldown;
    checkFertilizeCooldown();
    toggleMenu();
    spawnFloatingText("🌿 Fertilized!", "#795548");
    state.growthMultiplier = 2;
    setTimeout(() => {
        state.growthMultiplier = 1
    }, 60000);
    state.growth += 50
}

function checkSingCooldown() {
    const r = state.singCooldownUntil - Date.now();
    if (els.btnSing) {
        if (r > 0) {
            els.btnSing.disabled = true;
            els.btnSing.textContent = `🎵 Sing (${Math.ceil(r/60000)}m)`
        } else {
            els.btnSing.disabled = false;
            els.btnSing.textContent = '🎵 Sing to Plant'
        }
    }
}

function checkFertilizeCooldown() {
    const r = state.fertilizeCooldownUntil - Date.now();
    if (els.btnFertilize) {
        if (r > 0) {
            els.btnFertilize.disabled = true;
            els.btnFertilize.textContent = `🌿 Fertilize (${Math.ceil(r/60000)}m)`
        } else {
            els.btnFertilize.disabled = false;
            els.btnFertilize.textContent = '🌿 Fertilize'
        }
    }
}


function syncAmbientAudioUI() {
    // Ensure ambient audio state is applied after loading saves (useful after leaving potview).
    try {
        audio.init();
        if (state.isMusicPlaying) {
            audio.playBackgroundMusic();
            if (els.btnMusic) {
                els.btnMusic.classList.add('active');
                els.btnMusic.textContent = '🎶 Music ON';
            }
        } else {
            audio.stopBackgroundMusic();
            if (els.btnMusic) {
                els.btnMusic.classList.remove('active');
                els.btnMusic.textContent = '🎶 Background Music';
            }
        }

        // IMPORTANT: btnRain is the icon-only dock button. Never replace its SVG with text.
        if (state.isRainOn) {
            audio.startRainSound();
        } else {
            audio.stopRainSound();
        }
        if (els.btnRain) {
            // Keep visual state consistent with the rest of the UI.
            els.btnRain.classList.toggle('rain-active', !!state.isRainOn);
        }
    } catch (e) {
        // May be blocked until user gesture; will retry on first interaction below.
    }
}

function toggleBackgroundMusic() {
    state.isMusicPlaying = !state.isMusicPlaying;
    if (state.isMusicPlaying) {
        audio.playBackgroundMusic();
        els.btnMusic.classList.add('active');
        els.btnMusic.textContent = '🎶 Music ON'
    } else {
        audio.stopBackgroundMusic();
        els.btnMusic.classList.remove('active');
        els.btnMusic.textContent = '🎶 Background Music'
    }
}

function processOfflineProgress() {
    const now = Date.now(),
        diff = (now - state.lastSave) / 1000;
    if (diff < 60) return;
    const hrs = diff / 3600;
    const wasHappy = state.water > 40 && state.sun > 40 && state.love > 40;
    if (!state.isRainOn) state.water = Math.max(0, state.water - diff * CONFIG.offlineDecayFactor);
    if (!state.isSunLampOn) state.sun = Math.max(0, state.sun - diff * CONFIG.offlineDecayFactor);
    state.love = Math.max(0, state.love - diff * CONFIG.offlineDecayFactor * 0.5);
    // Soil contamination builds more slowly while offline (half the active rate)
    state.soilContamination = Math.min(100, (state.soilContamination || 0) + diff * (CONFIG.contaminationRate * 0.5));
    if (wasHappy) state.growth += diff * 0.15;
    state.day += Math.floor(diff / 14400);
    let nested = null;
    if (hrs >= 2 && Math.random() < 0.4) {
        const fi = Math.floor(Math.random() * 8);
        if (!state.fireflies[fi]) state.fireflies[fi] = 0;
        state.fireflies[fi]++;
        state.totalFireflies++;
        nested = FIREFLY_FAMILIES[fi]
    }
    let dream = null;
    if (hrs >= 1) {
        const di = Math.floor(Math.random() * DREAMS.length);
        if (di !== state.lastDream) {
            dream = DREAMS[di];
            state.lastDream = di
        }
    }
    updateUI();
    if (diff > 600) {
        let tc = '';
        if (dream) tc += `<div style="font-style:italic;margin-bottom:10px;opacity:0.9;">While away, your plant ${dream}</div>`;
        tc += `<div style="font-size:0.8rem;opacity:0.7;">You were away for ${hrs>=1?`${Math.floor(hrs)}h ${Math.floor((diff%3600)/60)}m`:`${Math.floor(diff/60)}m`}</div>`;
        const ps = getPlantState();
        tc += `<div style="margin:8px 0;">Your plant is <span style="color:${ps.color};font-weight:bold;">${ps.label}</span></div>`;
        if (nested) tc += `<div style="color:${getFireflyColor(FIREFLY_FAMILIES.indexOf(nested))};">🦋 A ${nested.name} firefly nested nearby!</div>`;
        if (wasHappy) tc += `<div style="opacity:0.7;font-size:0.85rem;margin-top:5px;">Growth continued while you were away 🌱</div>`;
        document.getElementById('toastBody').innerHTML = tc;
        els.welcomeToast.classList.add('visible')
    }
    state.lastSave = now;
    saveState()
}

function closeToast() {
    els.welcomeToast.classList.remove('visible')
}

function handleVisibility() {
    if (document.visibilityState === 'visible') {
        processOfflineProgress();
        if (audio.ctx) audio.ctx.resume();
        if (state.isRainOn) {
            audio.startRainSound()
        }
        document.body.classList.remove('paused');
        state.activeGuardians.forEach(i => {
            if (!document.querySelector(`.firefly.guardian[data-family="${i}"]`)) {
                spawnVisualFirefly(i, true)
            }
        });
        setTimeout(positionMoonbeam, 100)
    } else {
        saveState();
        if (audio.isRainPlaying) {
            audio.stopRainSound()
        }
        document.body.classList.add('paused')
    }
}

function saveState() {
    state.lastSave = Date.now();
    try {
        localStorage.setItem('pocketSprout', JSON.stringify(state))
    } catch (e) {}
}

function loadState() {
    try {
        const s = localStorage.getItem('pocketSprout');
        if (s) state = { ...state,
            ...JSON.parse(s)
        }
    } catch (e) {}
}

function resetGame(preserveHistory = true) {
    if (preserveHistory && state.name !== 'Sprout' && !state.isDead) {
        state.history.push({
            name: state.name,
            gen: state.generation,
            days: state.day,
            dna: { ...state.dna
            },
            stage: state.stage,
            scars: [...state.scars],
            potColor: state.potColor,
            potPattern: state.potPattern
        })
    }
    const hist = preserveHistory ? state.history : [];
    const tf = preserveHistory ? state.totalFireflies : 0;
    const ff = preserveHistory ? state.fireflies : {};
    const it = preserveHistory ? state.inheritedTraits : [];
    const gen = preserveHistory ? state.generation + 1 : 1;
    state = {
        water: 50,
        sun: 50,
        love: 50,
        growth: 0,
        stage: 1,
        isSunLampOn: false,
        isRainOn: false,
        day: 1,
        generation: gen,
        name: "Sprout",
        season: state.season || 0,
        dna: generateDNA(),
        potColor: POT_COLORS[0],
        potPattern: 'patNone',
        potPatternColor: 'rgba(255,255,255,0.5)',
        timeAtZero: 0,
        isDead: false,
        history: hist,
        lastSave: Date.now(),
        growthMultiplier: 1,
        singCooldownUntil: 0,
        fertilizeCooldownUntil: 0,
        fireflies: ff,
        totalFireflies: tf,
        activeGuardians: [],
        buffs: [],
        scars: [],
        crisisCount: 0,
        inheritedTraits: it,
        lastDream: null,
        isMusicPlaying: false,
        pollution: state.pollution || 0,
        soilContamination: 0
    };
    els.deathOverlay.classList.remove('open');
    els.plantHero.classList.remove('dead-plant', 'dormant-plant');
    audio.stopRainSound();
    setupWorld();
    renderPlant('plantGroup', state.dna, state.stage);
    renderPotPreview();
    updateUI();
    saveState()
}

function handleBackButton(e) {
    if (!e.state || !e.state.pocketSprout) {
        history.pushState({
            pocketSprout: true,
            depth: 1
        }, '');
        return
    }
    const overlays = [{
        el: els.fireflyOverlay,
        close: closeFireflyLog
    }, {
        el: els.potOverlay,
        close: closePotDesigner
    }, {
        el: els.harvestOverlay,
        close: closeHarvestModal
    }, {
        el: els.archiveOverlay,
        close: closeArchive
    }, {
        el: els.helpOverlay,
        close: closeHelp
    }, {
        el: els.resetOverlay,
        close: closeResetOverlay
    }, {
        el: els.menuOverlay,
        close: toggleMenu
    }];
    for (const o of overlays) {
        if (o.el && o.el.classList.contains('open')) {
            o.close();
            break
        }
    }
    pushHistoryState()
}

function spawnFloatingText(text, color) {
    const el = document.createElement('div');
    el.className = 'floating-text';
    el.textContent = text;
    el.style.color = color;
    el.style.left = '50%';
    el.style.top = '40%';
    el.style.transform = 'translateX(-50%)';
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2000)
}

let debugTapCount = 0,
    debugTapTimer = null;

function handleDebugTap() {
    debugTapCount++;
    clearTimeout(debugTapTimer);
    debugTapTimer = setTimeout(() => debugTapCount = 0, 3000);
    if (debugTapCount >= CONFIG.debugTapThreshold) {
        toggleDebug();
        debugTapCount = 0
    }
}

function toggleDebug() {
    els.debugPanel.classList.toggle('open');
    if (els.debugPanel.classList.contains('open')) updateDebugState()
}

function debugLog(m) {
    const l = document.getElementById('debugLog');
    if (l) l.innerHTML = `[${new Date().toLocaleTimeString()}] ${m}<br>` + l.innerHTML
}

function updateDebugState() {
    const s = document.getElementById('debugState');
    if (s) s.textContent = JSON.stringify(state, null, 2)
}

function debugMaxStats() {
    state.water = 100;
    state.sun = 100;
    state.love = 100;
    render();
    debugLog('Max stats')
}

function debugGrow() {
    state.growth += 1000;
    render();
    debugLog('+1000 growth')
}

function debugEvolve() {
    if (state.stage < 5) {
        state.stage++;
        renderPlant('plantGroup', state.dna, state.stage);
        debugLog(`Stage ${state.stage}`)
    } else {
        debugLog('Max stage')
    }
}

function debugKill() {
    triggerDeath();
    debugLog('Killed')
}

function debugUnlockFireflies() {
    FIREFLY_FAMILIES.forEach((_, i) => {
        state.fireflies[i] = CONFIG.maxFireflyPerFamily
    });
    state.totalFireflies = 8 * CONFIG.maxFireflyPerFamily;
    debugLog('All fireflies')
}

function debugAddFirefly() {
    const i = Math.floor(Math.random() * 8);
    if (!state.fireflies[i]) state.fireflies[i] = 0;
    state.fireflies[i]++;
    state.totalFireflies++;
    debugLog(`+${FIREFLY_FAMILIES[i].name}`)
}

function debugCycleTime() {
    const ts = ['night', 'dawn', 'morning', 'day', 'afternoon', 'dusk', 'evening'],
        c = ts.findIndex(t => document.body.classList.contains('time-' + t)),
        n = (c + 1) % ts.length;
    document.body.className = document.body.className.replace(/time-\w+/g, '');
    document.body.classList.add('time-' + ts[n]);
    debugLog('Time: ' + ts[n])
}

function debugCycleSeason() {
    state.season = (state.season + 1) % 4;
    updateSeason();
    debugLog('Season: ' + SEASONS[state.season].name)
}

function debugCycleMoon() {
    const m = document.getElementById('moonElement');
    if (m) {
        const ps = [0, 25, 50, 75, 100, -75, -50, -25],
            c = ps.indexOf(parseInt(m.style.getPropertyValue('--moon-phase')) || 0),
            n = (c + 1) % ps.length;
        m.style.setProperty('--moon-phase', ps[n] + '%');
        debugLog('Moon cycled')
    }
}

function debugAddScar() {
    const st = ['wilt', 'bend', 'pale', 'dormant'],
        av = st.filter(s => !state.scars.includes(s));
    if (av.length > 0) {
        const s = av[Math.floor(Math.random() * av.length)];
        state.scars.push(s);
        renderPlant('plantGroup', state.dna, state.stage);
        updateUI();
        debugLog('Scar: ' + s)
    } else {
        debugLog('All scars')
    }
}

function debugResetGame() {
    localStorage.removeItem('pocketSprout');
    location.reload()
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
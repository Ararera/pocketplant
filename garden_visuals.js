// garden_visuals.js - Visuals, Rendering, and Interactions

function initMidnightGarden() {
    createGardenStars();
    gardenState.elements = {
        overlay: document.getElementById('midnightGardenOverlay'),
        transition: document.getElementById('midnightTransition'),
        plantsScroll: document.getElementById('gardenPlantsScroll'),
        firefliesContainer: document.getElementById('gardenFireflies'),
        subtitle: document.getElementById('gardenSubtitle'),
        moon: document.getElementById('gardenMoon'),
        soundscapeIndicator: document.getElementById('soundscapeIndicator'),
        essenceJar: document.getElementById('essenceJar'),
        essenceAmt: document.getElementById('essenceAmt'),
        essenceFill: document.getElementById('essenceJarFill'),
        seedLayer: document.getElementById('gardenSeedLayer'),
        seedPouchBtn: document.getElementById('seedPouchBtn'),
        seedPalette: document.getElementById('seedPalette'),
        seedSlotRow: document.getElementById('seedSlotRow')
    };

    // Sync Essence jar immediately (if present)
    if (typeof updateEssenceJarUI === 'function') updateEssenceJarUI();

    initGardenMusicTools();
}

function createGardenStars() {
    const container = document.getElementById('gardenStars');
    if (!container) return;
    container.innerHTML = '';
    const starCount = 100;
    for (let i = 0; i < starCount; i++) {
        const star = document.createElement('div');
        star.className = 'garden-star';
        star.style.cssText = `left: ${Math.random() * 100}%; top: ${Math.random() * 55}%; --dur: ${3 + Math.random() * 4}s; --delay: ${Math.random() * 5}s; --brightness: ${0.5 + Math.random() * 0.5};`;
        container.appendChild(star);
    }
}

function enterMidnightGarden() {
    if (gardenState.isOpen) return;
    gardenState.isOpen = true;
    if (typeof unlockDiscovery === 'function') unlockDiscovery('visited_garden');
    gardenState.entryTime = Date.now();
    const transition = gardenState.elements?.transition || document.getElementById('midnightTransition');
    const overlay = gardenState.elements?.overlay || document.getElementById('midnightGardenOverlay');
    document.body.classList.add('midnight-garden-active');
    if (typeof audio !== 'undefined' && audio.stopRainSound) audio.stopRainSound();
    if (typeof audio !== 'undefined' && audio.stopBackgroundMusic) audio.stopBackgroundMusic();
    transition.classList.add('active');
    setTimeout(() => {
        syncMoonPhase();
        renderGardenPlants();
        startGardenFireflies();
        overlay.classList.add('open');
        setTimeout(() => { transition.classList.remove('active'); }, 300);
        setTimeout(() => { startAmbientSoundscape(); }, 1000);
        // Restore Sound Seeds a beat later so transport is stable.
        setTimeout(() => { loadGardenSoundSeeds(); }, 1200);
    }, 800);
    if (typeof pushHistoryState === 'function') pushHistoryState();
}

function exitMidnightGarden() {
    if (!gardenState.isOpen) return;
    const transition = gardenState.elements?.transition || document.getElementById('midnightTransition');
    const overlay = gardenState.elements?.overlay || document.getElementById('midnightGardenOverlay');
    // Persist & stop Sound Seeds before leaving.
    saveGardenSoundSeeds();
    if (typeof stopAllSoundSeeds === 'function') stopAllSoundSeeds();

    stopAmbientSoundscape();
    stopGardenFireflies();
    transition.classList.add('active');
    setTimeout(() => {
        overlay.classList.remove('open');
        document.body.classList.remove('midnight-garden-active');
        setTimeout(() => {
            transition.classList.remove('active');
            gardenState.isOpen = false;
            if (typeof render === 'function') render();
            if (typeof updateUI === 'function') updateUI();
            if (typeof state !== 'undefined' && state.isRainOn && typeof audio !== 'undefined' && audio.startRainSound) audio.startRainSound();
            if (typeof state !== 'undefined' && state.isMusicPlaying && typeof audio !== 'undefined' && audio.playBackgroundMusic) audio.playBackgroundMusic();
        }, 300);
    }, 800);
}

function syncMoonPhase() {
    const gardenMoon = gardenState.elements?.moon || document.getElementById('gardenMoon');
    const mainMoon = document.getElementById('moonElement');
    if (gardenMoon && mainMoon) {
        const phase = getComputedStyle(mainMoon).getPropertyValue('--moon-phase');
        gardenMoon.style.setProperty('--moon-phase', phase);
    } else if (gardenMoon && typeof getMoonPhase === 'function') {
        const phase = getMoonPhase();
        gardenMoon.style.setProperty('--moon-phase', phase.phase + '%');
    }
}

function renderGardenPlants() {
    const container = gardenState.elements?.plantsScroll || document.getElementById('gardenPlantsScroll');
    const subtitle = gardenState.elements?.subtitle || document.getElementById('gardenSubtitle');
    if (!container) return;
    container.innerHTML = '';
    const history = (typeof state !== 'undefined' && state.history) ? state.history : [];
    if (history.length === 0) {
        const emptyDiv = document.createElement('div');
        emptyDiv.className = 'garden-empty';
        emptyDiv.innerHTML = `<div class="garden-empty-icon">🌱</div><div class="garden-empty-text">No ancestors yet.<br>Ascend your first plant to<br>see it resting here.</div>`;
        container.appendChild(emptyDiv);
        if (subtitle) subtitle.style.display = 'none';
        return;
    }
    if (subtitle) {
        subtitle.style.display = '';
        const count = history.length;
        subtitle.textContent = `${count} ancestor${count !== 1 ? 's' : ''} resting`;
    }
    history.forEach((plantData, index) => {
        const plantEl = createGardenPlant(plantData, index);
        container.appendChild(plantEl);
    });
}

function createGardenPlant(plantData, index) {
    const wrapper = document.createElement('div');
    wrapper.className = 'garden-plant';
    wrapper.style.setProperty('--appear-delay', `${index * 0.15}s`);
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 200 250');
    svg.setAttribute('class', 'garden-plant-svg');
    svg.appendChild(document.createElementNS('http://www.w3.org/2000/svg', 'defs'));
    const plantGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    plantGroup.setAttribute('id', `gardenPlant_${index}`);
    svg.appendChild(plantGroup);
    const potGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    const potBody = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    potBody.setAttribute('d', 'M72 197 L128 197 L118 232 L82 232 Z');
    potBody.setAttribute('fill', plantData.potColor || '#e07a5f');
    potGroup.appendChild(potBody);
    const potRim = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    potRim.setAttribute('d', 'M68 189 L132 189 L128 199 L72 199 Z');
    potRim.setAttribute('fill', plantData.potColor || '#e07a5f');
    potRim.style.filter = 'brightness(1.1)';
    potGroup.appendChild(potRim);
    const dirt = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
    dirt.setAttribute('cx', '100'); dirt.setAttribute('cy', '191'); dirt.setAttribute('rx', '24'); dirt.setAttribute('ry', '7'); dirt.setAttribute('fill', '#5d4037');
    potGroup.appendChild(dirt);
    svg.appendChild(potGroup);
    
    if (typeof renderPlant === 'function' && plantData.dna) {
        const tempId = `tempGardenPlant_${index}_${Date.now()}`;
        plantGroup.setAttribute('id', tempId);
        document.body.appendChild(svg);
        renderPlant(tempId, plantData.dna, plantData.stage || 5, plantData.scars || []);
        document.body.removeChild(svg);
    }
    wrapper.appendChild(svg);
    const nameEl = document.createElement('div'); nameEl.className = 'garden-plant-name'; nameEl.textContent = plantData.name || 'Unknown'; wrapper.appendChild(nameEl);
    const genEl = document.createElement('div'); genEl.className = 'garden-plant-gen'; genEl.textContent = `Cycle ${plantData.gen || 1}`; wrapper.appendChild(genEl);
    wrapper.addEventListener('click', () => {
        // One-time Essence gift: the first time you tap an ancestor, it gives back.
        // We persist per-ancestor by storing the flag on the history entry itself.
        try {
            const alreadyClaimed = !!plantData.essenceFirstTapClaimed;
            if (!alreadyClaimed) {
                plantData.essenceFirstTapClaimed = true;
                if (typeof addEssence === 'function') addEssence(1000, 'rgba(254,249,195,0.9)');
                if (typeof saveState === 'function') saveState();
            }
        } catch (e) { /* non-fatal */ }
        showGardenPlantDetail(plantData, index);
    });
    return wrapper;
}

function showGardenPlantDetail(plantData, index) {
    const plantEl = document.querySelectorAll('.garden-plant')[index];
    if (plantEl) {
        plantEl.style.transition = 'transform 0.3s ease';
        plantEl.style.transform = 'scale(1.08) translateY(-8px)';
        setTimeout(() => { plantEl.style.transform = ''; }, 300);
    }
    playPlantSound(plantData);
}

function startGardenFireflies() {
    const container = gardenState.elements?.firefliesContainer || document.getElementById('gardenFireflies');
    if (!container) return;
    container.innerHTML = '';
    gardenState.fireflies = [];
    const fireflyInventory = (typeof state !== 'undefined' && state.fireflies) ? state.fireflies : {};
    let totalOwned = 0; const ownedFamilies = [];
    for (let i = 0; i < 8; i++) { const count = fireflyInventory[i] || 0; if (count > 0) { totalOwned += count; ownedFamilies.push(i); } }
    if (totalOwned === 0 || ownedFamilies.length === 0) return;
    
    const maxVisible = Math.min(gardenState.maxFireflies, Math.ceil(totalOwned / 2));
    const initialCount = Math.min(maxVisible, Math.max(3, Math.floor(maxVisible * 0.6)));
    
    const weightedFamilySelection = (inventory, ownedFamilies) => {
        let totalWeight = 0; for (const fam of ownedFamilies) totalWeight += inventory[fam] || 0;
        let random = Math.random() * totalWeight;
        for (const fam of ownedFamilies) { random -= inventory[fam] || 0; if (random <= 0) return fam; }
        return ownedFamilies[0];
    };
    
    for (let i = 0; i < initialCount; i++) {
        const famIndex = weightedFamilySelection(fireflyInventory, ownedFamilies);
        spawnGardenFirefly(famIndex, container);
    }
    
    gardenState.fireflySpawnInterval = setInterval(() => {
        if (!gardenState.isOpen) return;
        gardenState.fireflies = gardenState.fireflies.filter(ff => ff.element && ff.element.parentNode);
        if (gardenState.fireflies.length < maxVisible && ownedFamilies.length > 0) {
            const famIndex = weightedFamilySelection(fireflyInventory, ownedFamilies);
            spawnGardenFirefly(famIndex, container);
        }
    }, 4000 + Math.random() * 3000);
}

function spawnGardenFirefly(familyIndex, container) {
    const ff = document.createElement('div');
    ff.className = 'garden-firefly';
    const color = typeof getFireflyColor === 'function' ? getFireflyColor(familyIndex) : `hsl(${[15, 45, 120, 180, 210, 270, 330, 0][familyIndex]}, 70%, 60%)`;
    
    // Spawn position - can spawn from edges or middle
    let posX, posY;
    const spawnEdge = Math.random() < 0.4; // 40% chance to spawn from edge
    if (spawnEdge) {
        const edge = Math.floor(Math.random() * 4);
        switch(edge) {
            case 0: posX = -5; posY = 20 + Math.random() * 50; break; // left
            case 1: posX = 105; posY = 20 + Math.random() * 50; break; // right
            case 2: posX = 10 + Math.random() * 80; posY = -5; break; // top
            case 3: posX = 10 + Math.random() * 80; posY = 75; break; // bottom
        }
    } else {
        posX = 10 + Math.random() * 80;
        posY = 15 + Math.random() * 55;
    }
    
    const glowDur = 2 + Math.random() * 2;
    const lifeDur = 20 + Math.random() * 25;
    
    ff.style.cssText = `left: ${posX}%; top: ${posY}%; background: ${color}; --ff-color: ${color}; --glow-dur: ${glowDur}s;`;
    ff.dataset.family = familyIndex;
    
    let animationId = null;
    let lifeTimer = null;
    let fadeoutTimer = null;
    
    const handleTap = (e) => {
        e.preventDefault(); e.stopPropagation();
        if (!gardenState.isOpen) return;
        if (gardenState.moonFlightActive) return;
        if (animationId) cancelAnimationFrame(animationId);
        if (lifeTimer) clearTimeout(lifeTimer);
        if (fadeoutTimer) clearTimeout(fadeoutTimer);
        playFireflyChord(familyIndex);
        if (typeof markGardenActivity === 'function') markGardenActivity();
        ff.removeEventListener('click', handleTap);
        ff.removeEventListener('touchend', handleTap);
        flyFireflyToMoon(ff, familyIndex, color);
    };
    ff.addEventListener('click', handleTap);
    ff.addEventListener('touchend', handleTap, { passive: false });
    container.appendChild(ff);
    
    // Fade in after append
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            ff.classList.add('visible');
        });
    });
    
    // More realistic firefly movement state
    // Fireflies have distinct flight patterns: drift, pause, quick dart, gentle bob
    const moveState = {
        x: posX,
        y: posY,
        velX: (Math.random() - 0.5) * 0.15, // Start with gentle velocity
        velY: (Math.random() - 0.5) * 0.12,
        targetX: posX + (Math.random() - 0.5) * 15,
        targetY: posY + (Math.random() - 0.5) * 10,
        phase: 'drift', // drift, pause, dart
        phaseTime: 0,
        phaseDuration: 5 + Math.random() * 6,
        bobOffset: Math.random() * Math.PI * 2, // For gentle bobbing
        dartCooldown: 0
    };
    
    // Clamp initial target to bounds
    moveState.targetX = Math.max(5, Math.min(95, moveState.targetX));
    moveState.targetY = Math.max(10, Math.min(70, moveState.targetY));
    
    let lastTime = performance.now();
    
    const animateFirefly = (currentTime) => {
        if (!ff.parentNode || !gardenState.isOpen) { 
            cancelAnimationFrame(animationId); 
            return; 
        }
        
        const deltaTime = Math.min((currentTime - lastTime) / 1000, 0.1); // Cap delta to avoid jumps
        lastTime = currentTime;
        
        moveState.phaseTime += deltaTime;
        moveState.dartCooldown -= deltaTime;
        
        // Phase transitions
        if (moveState.phaseTime >= moveState.phaseDuration) {
            moveState.phaseTime = 0;
            
            // Weighted random phase selection
            const roll = Math.random();
            if (roll < 0.55) {
                // Drift phase - gentle movement toward target
                moveState.phase = 'drift';
                moveState.phaseDuration = 6 + Math.random() * 8;
                // Pick a new target - modest distance
                moveState.targetX = moveState.x + (Math.random() - 0.5) * 20;
                moveState.targetY = moveState.y + (Math.random() - 0.5) * 15;
                moveState.targetX = Math.max(5, Math.min(95, moveState.targetX));
                moveState.targetY = Math.max(10, Math.min(70, moveState.targetY));
            } else if (roll < 0.75 && moveState.dartCooldown <= 0) {
                // Dart phase - quick movement burst (real fireflies do this!)
                moveState.phase = 'dart';
                moveState.phaseDuration = 0.4 + Math.random() * 0.5;
                // Dart in a random direction - gentle speed
                const dartAngle = Math.random() * Math.PI * 2;
                const dartSpeed = 0.3 + Math.random() * 0.25;
                moveState.velX = Math.cos(dartAngle) * dartSpeed;
                moveState.velY = Math.sin(dartAngle) * dartSpeed;
                moveState.dartCooldown = 8 + Math.random() * 10; // Don't dart again too soon
            } else {
                // Pause phase - hover in place with gentle bob
                moveState.phase = 'pause';
                moveState.phaseDuration = 3 + Math.random() * 5;
            }
        }
        
        // Apply physics based on phase
        const dx = moveState.targetX - moveState.x;
        const dy = moveState.targetY - moveState.y;
        
        switch(moveState.phase) {
            case 'drift':
                // Very gentle acceleration toward target
                moveState.velX += dx * 0.0004 * deltaTime * 60;
                moveState.velY += dy * 0.0004 * deltaTime * 60;
                // Add subtle sinusoidal bob
                moveState.velY += Math.sin(currentTime * 0.001 + moveState.bobOffset) * 0.002;
                moveState.velX += Math.cos(currentTime * 0.0008 + moveState.bobOffset) * 0.0015;
                // Strong damping for dreamy movement
                moveState.velX *= Math.pow(0.94, deltaTime * 60);
                moveState.velY *= Math.pow(0.94, deltaTime * 60);
                break;
                
            case 'dart':
                // Less damping during dart - but still controlled
                moveState.velX *= Math.pow(0.97, deltaTime * 60);
                moveState.velY *= Math.pow(0.97, deltaTime * 60);
                break;
                
            case 'pause':
                // Strong damping to slow down, but keep gentle bob
                moveState.velX *= Math.pow(0.88, deltaTime * 60);
                moveState.velY *= Math.pow(0.88, deltaTime * 60);
                // Gentle hovering motion
                moveState.velY += Math.sin(currentTime * 0.0015 + moveState.bobOffset) * 0.003;
                moveState.velX += Math.cos(currentTime * 0.001 + moveState.bobOffset) * 0.002;
                break;
        }
        
        // Apply velocity
        moveState.x += moveState.velX * deltaTime * 60;
        moveState.y += moveState.velY * deltaTime * 60;
        
        // Soft boundary bounce (fireflies tend to turn away from edges)
        if (moveState.x < 5) { moveState.velX += 0.02; moveState.x = 5; }
        if (moveState.x > 95) { moveState.velX -= 0.02; moveState.x = 95; }
        if (moveState.y < 8) { moveState.velY += 0.015; moveState.y = 8; }
        if (moveState.y > 72) { moveState.velY -= 0.015; moveState.y = 72; }
        
        ff.style.left = moveState.x + '%';
        ff.style.top = moveState.y + '%';
        
        animationId = requestAnimationFrame(animateFirefly);
    };
    
    animationId = requestAnimationFrame(animateFirefly);
    
    const fireflyData = { 
        element: ff, 
        family: familyIndex, 
        spawnTime: Date.now(), 
        animationId: animationId, 
        lifeTimer: null, 
        fadeoutTimer: null,
        x: posX,
        y: posY
    };
    gardenState.fireflies.push(fireflyData);
    
    // Start fadeout 1.2s before end of life
    fadeoutTimer = setTimeout(() => {
        ff.classList.remove('visible');
        ff.classList.add('fadeout');
    }, (lifeDur - 1.2) * 1000);
    fireflyData.fadeoutTimer = fadeoutTimer;
    
    lifeTimer = setTimeout(() => {
        if (animationId) cancelAnimationFrame(animationId);
        if (ff.parentNode) ff.remove();
        gardenState.fireflies = gardenState.fireflies.filter(f => f.element !== ff);
    }, lifeDur * 1000);
    fireflyData.lifeTimer = lifeTimer;
}

function stopGardenFireflies() {
    if (gardenState.fireflySpawnInterval) { clearInterval(gardenState.fireflySpawnInterval); gardenState.fireflySpawnInterval = null; }
    gardenState.fireflies.forEach(ff => { 
        if (ff.animationId) cancelAnimationFrame(ff.animationId); 
        if (ff.lifeTimer) clearTimeout(ff.lifeTimer);
        if (ff.fadeoutTimer) clearTimeout(ff.fadeoutTimer);
    });
    gardenState.fireflies = [];
}

function _ensureMoonBaseStyles() {
    const moon = gardenState.elements?.moon || document.getElementById('gardenMoon');
    if (!moon) return null;
    if (!gardenState._moonBaseBoxShadow || !gardenState._moonBaseBackground) {
        const cs = getComputedStyle(moon);
        gardenState._moonBaseBoxShadow = cs.boxShadow; gardenState._moonBaseBackground = cs.backgroundImage || cs.background;
    }
    return moon;
}

function _applyMoonHitGlow(colorCss) {
    const moon = _ensureMoonBaseStyles(); if (!moon) return;
    if (gardenState.moonHitTimer) clearTimeout(gardenState.moonHitTimer);
    moon.style.transition = 'box-shadow 1.8s ease'; moon.style.boxShadow = gardenState._moonBaseBoxShadow;
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            moon.style.boxShadow = `0 0 70px ${colorCss}, 0 0 140px ${colorCss}, 0 0 240px rgba(0,0,0,0)`;
            gardenState.moonHitTimer = setTimeout(() => { moon.style.boxShadow = gardenState._moonBaseBoxShadow; }, 650);
        });
    });
}

function _applyMoonFullTint(colorCss, durationMs) {
    const moon = _ensureMoonBaseStyles(); if (!moon) return;
    if (gardenState.moonTintTimer) clearTimeout(gardenState.moonTintTimer);
    const base = { r: 254, g: 249, b: 195 }, rgb = _parseColorToRgb(colorCss);
    const soft = _mixRgb(base, rgb, 0.55), deep = _mixRgb(base, rgb, 0.70);
    const tintGradient = `radial-gradient(circle at 30% 30%, ${_rgbToCss(soft, 0.95)}, ${_rgbToCss(deep, 0.95)}, ${_rgbToCss(deep, 0.80)})`;
    moon.style.setProperty('--moon-tint-color', tintGradient);
    moon.style.boxShadow = `0 0 60px rgba(254, 249, 195, 0.5), 0 0 120px rgba(254, 249, 195, 0.3), 0 0 200px rgba(254, 249, 195, 0.15), 0 0 85px ${_rgbToCss(soft, 0.45)}, 0 0 170px ${_rgbToCss(soft, 0.28)}`;
    requestAnimationFrame(() => { moon.style.setProperty('--moon-tint-opacity', '1'); });
    
    // Spawn colored motes during moon tint phase
    spawnColoredMoteRain(colorCss, durationMs || 7000);

    // Essence harvest happens *with* the motes (the rain is the feedback).
    if (typeof addEssence === 'function') addEssence(ESSENCE_GAIN_PER_MOON, colorCss);
    
    gardenState.moonTintTimer = setTimeout(() => { moon.style.setProperty('--moon-tint-opacity', '0'); moon.style.boxShadow = gardenState._moonBaseBoxShadow; }, durationMs || 7000);
}

// ============================================
// COLORED MOTE RAIN EFFECT
// ============================================

function spawnColoredMoteRain(colorCss, durationMs) {
    const container = document.getElementById('gardenMotes');
    if (!container) return;
    
    const rgb = _parseColorToRgb(colorCss);
    const moteColor = _rgbToCss(rgb, 0.5);
    const glowColor = _rgbToCss(rgb, 0.3);
    
    // Create fewer motes that fall very slowly
    const moteCount = 25;
    const spawnInterval = durationMs / moteCount;
    let spawned = 0;
    
    const spawnMote = () => {
        if (spawned >= moteCount || !gardenState.isOpen) return;
        spawned++;
        
        const mote = document.createElement('div');
        mote.className = 'colored-mote';
        mote.style.cssText = `
            position: absolute;
            width: ${2 + Math.random() * 2}px;
            height: ${2 + Math.random() * 2}px;
            border-radius: 50%;
            background: ${moteColor};
            box-shadow: 0 0 5px ${glowColor}, 0 0 10px ${glowColor};
            left: ${Math.random() * 100}%;
            top: -3%;
            opacity: 0;
            pointer-events: none;
            z-index: 406;
        `;
        
        container.appendChild(mote);
        
        // Animate the mote falling - very slow, dreamy descent
        const fallDuration = 12000 + Math.random() * 8000;
        const swayAmount = 15 + Math.random() * 20;
        const swaySpeed = 0.8 + Math.random() * 0.7;
        const startTime = performance.now();
        const startX = parseFloat(mote.style.left);
        
        const animateMote = (now) => {
            const elapsed = now - startTime;
            const progress = Math.min(1, elapsed / fallDuration);
            
            // Very slow vertical fall
            const y = progress * 105;
            
            // Gentle horizontal sway
            const sway = Math.sin(progress * Math.PI * swaySpeed) * swayAmount;
            
            // Fade in then out
            let opacity = 0;
            if (progress < 0.2) opacity = progress / 0.2;
            else if (progress > 0.8) opacity = (1 - progress) / 0.2;
            else opacity = 1;
            opacity *= 0.5;
            
            mote.style.top = `${y}%`;
            mote.style.left = `calc(${startX}% + ${sway}px)`;
            mote.style.opacity = String(opacity);
            
            if (progress < 1 && gardenState.isOpen) {
                requestAnimationFrame(animateMote);
            } else {
                mote.remove();
            }
        };
        
        requestAnimationFrame(animateMote);
        
        // Schedule next mote with more variation
        if (spawned < moteCount) {
            setTimeout(spawnMote, spawnInterval * (0.7 + Math.random() * 0.6));
        }
    };
    
    // Start spawning
    spawnMote();
}

function _updateMoonStreak(key, colorCss) {
    if (gardenState.moonStreakKey === key) gardenState.moonStreakCount += 1;
    else { gardenState.moonStreakKey = key; gardenState.moonStreakCount = 1; }
    if (gardenState.moonStreakCount >= 3) {
        // 3 same-color fireflies: trigger the moon tint mechanic AND unlock the color melody loop.
        // Melody loop is subtle and persistent while the player remains in the garden.
        try { if (typeof startColorMelodyLoop === 'function') startColorMelodyLoop(Number(key)); } catch (e) {}
        gardenState.moonStreakCount = 0;
        gardenState.moonStreakKey = null;
        _applyMoonFullTint(colorCss, 7000);
    }
}

function flyFireflyToMoon(fireflyEl, familyIndex, colorCss) {
    if (!fireflyEl || gardenState.moonFlightActive) return false;
    const overlay = gardenState.elements?.overlay || document.getElementById('midnightGardenOverlay');
    const moon = gardenState.elements?.moon || document.getElementById('gardenMoon');
    if (!overlay || !moon) return false;
    gardenState.moonFlightActive = true;
    const tracked = gardenState.fireflies.find(f => f.element === fireflyEl);
    if (tracked) {
        if (tracked.animationId) try { cancelAnimationFrame(tracked.animationId); } catch (e) {}
        if (tracked.lifeTimer) clearTimeout(tracked.lifeTimer);
        gardenState.fireflies = gardenState.fireflies.filter(f => f.element !== fireflyEl);
    }
    const startRect = fireflyEl.getBoundingClientRect(), overlayRect = overlay.getBoundingClientRect(), moonRect = moon.getBoundingClientRect();
    const startX = (startRect.left - overlayRect.left) + startRect.width / 2, startY = (startRect.top - overlayRect.top) + startRect.height / 2;
    const endX = (moonRect.left - overlayRect.left) + moonRect.width / 2, endY = (moonRect.top - overlayRect.top) + moonRect.height / 2;
    
    const flight = document.createElement('div'); flight.className = 'moon-flight-firefly';
    flight.style.setProperty('--ff-color', colorCss); flight.style.left = `${startX}px`; flight.style.top = `${startY}px`;
    overlay.appendChild(flight);
    try { fireflyEl.style.pointerEvents = 'none'; fireflyEl.style.opacity = '0'; } catch (e) {}
    if (fireflyEl.parentNode) fireflyEl.parentNode.removeChild(fireflyEl);
    
    const dur = 1600, startT = performance.now(), dx = endX - startX, dy = endY - startY;
    const ease = (t) => t * t * (3 - 2 * t);
    const step = (now) => {
        const t = Math.min(1, (now - startT) / dur), tt = ease(t);
        const arc = Math.sin(Math.PI * tt) * -45, x = startX + dx * tt, y = startY + dy * tt + arc;
        const fade = (t < 0.75) ? 1 : (1 - (t - 0.75) / 0.25), scale = 1 - 0.35 * tt;
        flight.style.transform = `translate(-50%, -50%) translate3d(${x - startX}px, ${y - startY}px, 0) scale(${scale})`;
        flight.style.opacity = String(Math.max(0, fade));
        if (t < 1) requestAnimationFrame(step);
        else {
            _applyMoonHitGlow(colorCss); _updateMoonStreak(String(familyIndex), colorCss);
            if (flight.parentNode) flight.parentNode.removeChild(flight);
            setTimeout(() => { gardenState.moonFlightActive = false; }, 260);
        }
    };
    requestAnimationFrame(step);
    return true;
}

function handleGardenBack(e) { if (gardenState.isOpen) { exitMidnightGarden(); return true; } return false; }

const originalHandleBackButton = typeof handleBackButton === 'function' ? handleBackButton : null;
window.handleBackButtonGarden = function(e) { if (gardenState.isOpen) { exitMidnightGarden(); e.preventDefault(); return; } if (originalHandleBackButton) originalHandleBackButton(e); };
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initMidnightGarden); else setTimeout(initMidnightGarden, 100);

window.enterMidnightGarden = enterMidnightGarden;
window.exitMidnightGarden = exitMidnightGarden;
window.triggerWindGust = triggerWindGust;
window.setGardenMood = setGardenMood;
window.gardenState = gardenState;




// ============================================
// MUSIC TOOLS: SOUND SEEDS + GESTURE GLISS
// ============================================

function initGardenMusicTools() {
    const row = gardenState.elements?.seedSlotRow || document.getElementById('seedSlotRow');
    const pouch = gardenState.elements?.seedPouchBtn || document.getElementById('seedPouchBtn');
    const palette = gardenState.elements?.seedPalette || document.getElementById('seedPalette');
    const seedLayer = gardenState.elements?.seedLayer || document.getElementById('gardenSeedLayer');

    if (row && !row.dataset.built) {
        row.dataset.built = '1';
        row.innerHTML = '';
        (typeof SOUND_SEED_TYPES !== 'undefined' ? SOUND_SEED_TYPES : []).forEach(t => {
            const slot = document.createElement('div');
            slot.className = 'seed-slot';
            slot.dataset.seedType = t.id;
            slot.innerHTML = `<div class="seed-icon">${t.icon}</div><div class="seed-name">${t.label}</div>`;
            slot.addEventListener('pointerdown', (e) => beginSeedDrag(e, t));
            row.appendChild(slot);
        });
    }

    if (pouch && !pouch.dataset.bound) {
        pouch.dataset.bound = '1';
        pouch.addEventListener('click', (e) => {
            e.preventDefault();
            toggleSeedPalette();
        });
    }

    // Gesture gliss across the overlay (anything non-UI).
    if (seedLayer && !seedLayer.dataset.gestureBound) {
        seedLayer.dataset.gestureBound = '1';
        const overlay = gardenState.elements?.overlay || document.getElementById('midnightGardenOverlay');
        if (overlay) {
            overlay.addEventListener('pointerdown', handleGardenGestureStart, { passive: false });
            overlay.addEventListener('pointermove', handleGardenGestureMove, { passive: false });
            overlay.addEventListener('pointerup', handleGardenGestureEnd, { passive: false });
            overlay.addEventListener('pointercancel', handleGardenGestureEnd, { passive: false });
        }
    }
}

function toggleSeedPalette(force) {
    const palette = gardenState.elements?.seedPalette || document.getElementById('seedPalette');
    if (!palette) return;
    const next = (typeof force === 'boolean') ? force : !palette.classList.contains('open');
    gardenState.seedPaletteOpen = next;
    palette.classList.toggle('open', next);
    palette.setAttribute('aria-hidden', next ? 'false' : 'true');
}

function beginSeedDrag(e, seedType) {
    if (!gardenState.isOpen) return;
    e.preventDefault();
    e.stopPropagation();
    toggleSeedPalette(false);

    const overlay = gardenState.elements?.overlay || document.getElementById('midnightGardenOverlay');
    if (!overlay) return;

    const existing = Array.isArray(state?.gardenSoundSeeds) ? state.gardenSoundSeeds.length : 0;
    if (typeof MAX_SOUND_SEEDS !== 'undefined' && existing >= MAX_SOUND_SEEDS) {
        if (typeof spawnFloatingText === 'function') spawnFloatingText('Too many seeds', null, 'warn');
        return;
    }

    const ghost = document.createElement('div');
    ghost.className = `garden-seed ${seedType.id}`;
    ghost.dataset.icon = seedType.icon;
    ghost.style.opacity = '0.75';
    ghost.style.pointerEvents = 'none';

    const layer = gardenState.elements?.seedLayer || document.getElementById('gardenSeedLayer');
    (layer || overlay).appendChild(ghost);

    const updateGhost = (clientX, clientY) => {
        const r = overlay.getBoundingClientRect();
        const x = (clientX - r.left) / r.width;
        const y = (clientY - r.top) / r.height;
        ghost.style.left = (x * 100) + '%';
        ghost.style.top = (y * 100) + '%';
    };

    updateGhost(e.clientX, e.clientY);
    gardenState.activeSeedDrag = { type: seedType, ghost, overlay, updateGhost };

    const move = (ev) => { ev.preventDefault(); updateGhost(ev.clientX, ev.clientY); };
    const up = (ev) => {
        ev.preventDefault();
        try { window.removeEventListener('pointermove', move, true); window.removeEventListener('pointerup', up, true); } catch (err) {}
        finalizeSeedDrop(ev.clientX, ev.clientY);
    };

    window.addEventListener('pointermove', move, true);
    window.addEventListener('pointerup', up, true);
}

function finalizeSeedDrop(clientX, clientY) {
    const drag = gardenState.activeSeedDrag;
    gardenState.activeSeedDrag = null;
    if (!drag) return;

    const { overlay, type, ghost } = drag;
    const r = overlay.getBoundingClientRect();
    const x = Math.max(0.02, Math.min(0.98, (clientX - r.left) / r.width));
    const y = Math.max(0.05, Math.min(0.95, (clientY - r.top) / r.height));

    try { ghost.remove(); } catch (e) {}

    const seed = {
        id: `seed_${Date.now()}_${Math.floor(Math.random() * 1e6)}`,
        type: type.id,
        x, y,
        scaleIndex: 0,
        lastTouched: Date.now(),
    };

    if (typeof state !== 'undefined') {
        if (!Array.isArray(state.gardenSoundSeeds)) state.gardenSoundSeeds = [];
        state.gardenSoundSeeds.push(seed);
        if (typeof saveState === 'function') saveState();
    }

    renderSoundSeed(seed);
    if (typeof startSoundSeed === 'function') startSoundSeed(seed);

    const el = document.getElementById(seed.id);
    if (el) { el.classList.remove('pulse'); void el.offsetHeight; el.classList.add('pulse'); }
    if (typeof spawnFloatingText === 'function') spawnFloatingText('♫ Seed planted', 'rgba(254,249,195,0.75)', 'good');
}

function loadGardenSoundSeeds() {
    if (!gardenState.isOpen) return;

    // Anchor transport on entry for consistent quantization.
    try {
        gardenState._gardenTransport = gardenState._gardenTransport || { bpm: (typeof GARDEN_TRANSPORT_BPM !== 'undefined' ? GARDEN_TRANSPORT_BPM : 38), startTime: 0 };
        gardenState._gardenTransport.bpm = (typeof GARDEN_TRANSPORT_BPM !== 'undefined' ? GARDEN_TRANSPORT_BPM : 38);
        const ctx = gardenState.audioContext;
        gardenState._gardenTransport.startTime = (ctx && typeof ctx.currentTime === 'number') ? ctx.currentTime : 0;
    } catch (e) {}

    const layer = gardenState.elements?.seedLayer || document.getElementById('gardenSeedLayer');
    if (layer) layer.innerHTML = '';

    const seeds = (typeof state !== 'undefined' && Array.isArray(state.gardenSoundSeeds)) ? state.gardenSoundSeeds : [];
    gardenState.soundSeeds = seeds.slice(0, (typeof MAX_SOUND_SEEDS !== 'undefined' ? MAX_SOUND_SEEDS : 8));

    gardenState.soundSeeds.forEach(seed => {
        renderSoundSeed(seed);
        if (typeof startSoundSeed === 'function') startSoundSeed(seed);
    });
}

function saveGardenSoundSeeds() {
    if (typeof state === 'undefined') return;
    if (!Array.isArray(state.gardenSoundSeeds)) state.gardenSoundSeeds = [];

    // Positions live in the objects, but keep this hook for future drag.
    if (typeof saveState === 'function') saveState();
}

function renderSoundSeed(seed) {
    const layer = gardenState.elements?.seedLayer || document.getElementById('gardenSeedLayer');
    if (!layer || !seed) return;

    const existing = document.getElementById(seed.id);
    if (existing) existing.remove();

    const typeInfo = (typeof SOUND_SEED_TYPES !== 'undefined') ? SOUND_SEED_TYPES.find(t => t.id === seed.type) : null;
    const icon = typeInfo?.icon || '♫';

    const el = document.createElement('div');
    el.className = `garden-seed ${seed.type}`;
    el.id = seed.id;
    el.dataset.icon = icon;
    el.style.left = (seed.x * 100) + '%';
    el.style.top = (seed.y * 100) + '%';

    // Tap: retune (rotate through small set of offsets)
    el.addEventListener('click', (e) => {
        e.preventDefault(); e.stopPropagation();
        seed.scaleIndex = (seed.scaleIndex + 1) % 5;
        seed.lastTouched = Date.now();
        el.classList.remove('pulse'); void el.offsetHeight; el.classList.add('pulse');
        if (typeof updateSoundSeed === 'function') updateSoundSeed(seed);
        if (typeof spawnFloatingText === 'function') spawnFloatingText('retuned', 'rgba(254,249,195,0.6)', 'good');
        if (typeof saveState === 'function') saveState();
    });

    // Hold: remove
    let holdT = null;
    const cancelHold = () => { if (holdT) { clearTimeout(holdT); holdT = null; } };
    el.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        cancelHold();
        holdT = setTimeout(() => {
            cancelHold();
            removeSoundSeed(seed.id);
        }, 600);
    });
    el.addEventListener('pointerup', cancelHold);
    el.addEventListener('pointercancel', cancelHold);
    el.addEventListener('pointerleave', cancelHold);

    layer.appendChild(el);
}

function removeSoundSeed(seedId) {
    if (!seedId) return;
    if (typeof stopSoundSeed === 'function') stopSoundSeed(seedId);

    if (typeof state !== 'undefined' && Array.isArray(state.gardenSoundSeeds)) {
        state.gardenSoundSeeds = state.gardenSoundSeeds.filter(s => s.id !== seedId);
        if (typeof saveState === 'function') saveState();
    }
    const el = document.getElementById(seedId);
    if (el) el.remove();
    if (typeof spawnFloatingText === 'function') spawnFloatingText('seed removed', null, 'warn');
}

// ----- Gesture gliss: swipe across the overlay to play a soft harp-like run.
function _isGardenUiTarget(target) {
    if (!target) return false;
    return !!(target.closest && (target.closest('#seedPalette') || target.closest('#seedPouchBtn') || target.closest('#essenceJar') || target.closest('#midnightGardenBack')));
}

function handleGardenGestureStart(e) {
    if (!gardenState.isOpen) return;
    if (_isGardenUiTarget(e.target)) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    gardenState.gestureTrail = [{ x: e.clientX, y: e.clientY, t: performance.now() }];
}

function handleGardenGestureMove(e) {
    if (!gardenState.isOpen) return;
    if (!gardenState.gestureTrail || gardenState.gestureTrail.length === 0) return;
    if (e.pointerType !== 'mouse') e.preventDefault();
    const now = performance.now();
    const last = gardenState.gestureTrail[gardenState.gestureTrail.length - 1];
    const dx = e.clientX - last.x;
    const dy = e.clientY - last.y;
    if ((dx*dx + dy*dy) < 80) return;
    gardenState.gestureTrail.push({ x: e.clientX, y: e.clientY, t: now });
}

function handleGardenGestureEnd(e) {
    if (!gardenState.isOpen) return;
    const pts = gardenState.gestureTrail || [];
    gardenState.gestureTrail = [];
    if (pts.length < 6) return;

    const now = Date.now();
    if (gardenState.lastGestureAt && (now - gardenState.lastGestureAt) < 1200) return;
    gardenState.lastGestureAt = now;

    const overlay = gardenState.elements?.overlay || document.getElementById('midnightGardenOverlay');
    if (!overlay) return;
    const r = overlay.getBoundingClientRect();

    const norm = pts.map(p => ({
        x: Math.max(0, Math.min(1, (p.x - r.left) / r.width)),
        y: Math.max(0, Math.min(1, (p.y - r.top) / r.height)),
        t: p.t
    }));

    if (typeof playGestureGliss === 'function') playGestureGliss(norm);
}

// ============================================
// ESSENCE (Midnight Garden currency)
// ============================================

const ESSENCE_MAX = 10000;
const ESSENCE_GAIN_PER_MOON = 100;
const ESSENCE_SCAR_COST = 1000;

function getEssence() {
    if (typeof state === 'undefined') return 0;
    if (typeof state.essence !== 'number') state.essence = 0;
    return state.essence;
}

function updateEssenceJarUI() {
    const amtEl = gardenState.elements?.essenceAmt || document.getElementById('essenceAmt');
    const fillEl = gardenState.elements?.essenceFill || document.getElementById('essenceJarFill');
    const jar = gardenState.elements?.essenceJar || document.getElementById('essenceJar');
    if (!amtEl || !fillEl || !jar) return;

    const v = Math.max(0, Math.min(ESSENCE_MAX, getEssence()));
    amtEl.textContent = String(Math.floor(v));
    fillEl.style.height = ((v / ESSENCE_MAX) * 100) + '%';
    jar.style.opacity = v > 0 ? '1' : '0.85';
}

function addEssence(amount, colorCss) {
    if (typeof state === 'undefined') return;
    if (typeof state.essence !== 'number') state.essence = 0;

    const before = state.essence;
    const next = Math.max(0, Math.min(ESSENCE_MAX, before + (amount || 0)));
    state.essence = next;

    updateEssenceJarUI();

    const jar = gardenState.elements?.essenceJar || document.getElementById('essenceJar');
    if (jar) {
        jar.classList.remove('pulse');
        void jar.offsetHeight; // reflow
        jar.classList.add('pulse');
    }

    if (next > before && typeof spawnFloatingText === 'function') {
        spawnFloatingText(`+${next - before} Essence`, colorCss || 'rgba(254,249,195,0.9)', 'good');
    }
    if (typeof saveState === 'function') saveState();
}

function spendEssence() {
    // Only usable from within the Midnight Garden.
    if (!gardenState || !gardenState.isOpen) return;

    const have = getEssence();
    if (have < ESSENCE_SCAR_COST) {
        if (typeof spawnFloatingText === 'function') spawnFloatingText(`Need ${ESSENCE_SCAR_COST} Essence`, null, 'warn');
        return;
    }

    state.essence = have - ESSENCE_SCAR_COST;

    if (typeof unlockDiscovery === 'function') unlockDiscovery('invoke_power');

    const hasScars = Array.isArray(state.scars) && state.scars.length > 0;
    if (hasScars) {
        const success = Math.random() < 0.5;
        if (success) {
            const idx = Math.floor(Math.random() * state.scars.length);
            state.scars.splice(idx, 1);
            if (typeof unlockDiscovery === 'function') unlockDiscovery('scar_healed');
            if (typeof spawnFloatingText === 'function') spawnFloatingText('🫙 Scar lifted.', 'rgba(254,249,195,0.95)', 'good');
            if (typeof render === 'function') render();
            if (typeof updateMenuStats === 'function') updateMenuStats();
            if (typeof updateUI === 'function') updateUI();
        } else {
            if (typeof spawnFloatingText === 'function') spawnFloatingText('🫙 The scar holds.', 'rgba(254,249,195,0.75)', 'warn');
        }
    } else {
        // No scars: convert Essence into growth using the same baseline as singing.
        let needed = (typeof STAGE_THRESHOLDS !== 'undefined') ? (STAGE_THRESHOLDS[state.stage] || 1000) : 1000;
        if (typeof STAGE_THRESHOLDS !== 'undefined' && state.stage < 4) {
            needed = (STAGE_THRESHOLDS[state.stage + 1] - STAGE_THRESHOLDS[state.stage]);
        }
        const boost = needed * 0.1;
        state.growth += boost;
        if (typeof spawnFloatingText === 'function') spawnFloatingText(`+${Math.floor(boost)} Growth`, '#4ade80', 'good');
        if (typeof updateUI === 'function') updateUI();
    }

    updateEssenceJarUI();
    if (typeof saveState === 'function') saveState();
}

// Expose for HTML onclick
window.spendEssence = spendEssence;
window.updateEssenceJarUI = updateEssenceJarUI;
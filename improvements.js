/* ============================================
   POCKET SPROUT - v1.2 Improvements
   New features and fixes
   Optimized for Performance
   ============================================ */

// Optimization: UI Cache to prevent repeated DOM queries
const uiCache = {
    ringWater: null, ringSun: null, ringLove: null,
    urgencyWarning: null, urgencyText: null,
    modifierList: null, activeModifiers: null,
    plantMoodDisplay: null, stageLabel: null,
    plantHero: null, genBadge: null,
    discoveriesList: null, fireflyFamilyGrid: null,
    hintBubble: null, hintContent: null,
    genBadge: null, detailOrb: null, detailFamilyName: null,
    detailFamilyPower: null, detailFireflyCount: null,
    guardianBarFill: null, guardianBarLabel: null, releaseBtn: null,
    familyDetailPanel: null, quickStatsTooltip: null, quickStatsContent: null
};

// Helper to get cached element
function getEl(id) {
    if (uiCache[id]) return uiCache[id];
    const el = document.getElementById(id);
    if (el) uiCache[id] = el;
    return el;
}

// ============================================
// MENU TABS SYSTEM
// ============================================

function switchMenuTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.menu-tab').forEach(tab => {
        const isActive = tab.dataset.tab === tabName;
        if (tab.classList.contains('active') !== isActive) {
            tab.classList.toggle('active', isActive);
        }
    });
    
    const tabId = 'tab' + tabName.charAt(0).toUpperCase() + tabName.slice(1);
    
    // Update tab content
    document.querySelectorAll('.menu-tab-content').forEach(content => {
        const isActive = content.id === tabId;
        if (content.classList.contains('active') !== isActive) {
            content.classList.toggle('active', isActive);
        }
    });
}

// Make available globally immediately
window.switchMenuTab = switchMenuTab;

// ============================================
// DISCOVERIES SYSTEM
// ============================================

const DISCOVERIES = Object.freeze([
    { id: 'first_water', name: 'First Rain', desc: 'Watered your plant for the first time', icon: '💧' },
    { id: 'first_sun', name: 'Let There Be Light', desc: 'Gave your plant sunlight', icon: '☀️' },
    { id: 'first_love', name: 'Tender Touch', desc: 'Showed affection to your plant', icon: '❤️' },
    { id: 'first_firefly', name: 'Firefly Catcher', desc: 'Collected your first firefly', icon: '🦋' },
    { id: 'first_guardian', name: 'Guardian Summoned', desc: 'Unlocked a Guardian (50 of one family)', icon: '👑' },
    { id: 'first_ascension', name: 'Circle of Life', desc: 'Ascended your first plant', icon: '🌸' },
    { id: 'visited_garden', name: 'Midnight Wanderer', desc: 'Visited the Midnight Garden', icon: '🌙' },
    { id: 'garden_chord', name: 'Moon Chord', desc: 'Played a chord in the Midnight Garden', icon: '🎹' },
    { id: 'made_rainbow', name: 'Prismatic', desc: 'Created a rainbow (sun + rain)', icon: '🌈' },
    { id: 'named_plant', name: 'True Name', desc: 'Gave your plant a real name', icon: '🏷️' },
    { id: 'survived_winter', name: 'Winter Survivor', desc: 'Kept a plant alive through winter', icon: '❄️' },
    { id: 'reached_bloom', name: 'Blooming', desc: 'Reached the Bloom growth stage', icon: '🌼' },
    { id: 'full_bloom', name: 'Full Flourish', desc: 'Reached the Flourish growth stage', icon: '🌺' },
    { id: 'five_generations', name: 'Dynasty', desc: 'Reached generation 5', icon: '🧬' },
    { id: 'pot_customized', name: 'Personal Touch', desc: 'Customized your pot design', icon: '🎨' },
    { id: 'first_fertilize', name: 'Nourished', desc: 'Used fertilizer', icon: '🧪' },
    { id: 'all_families', name: 'Firefly Collector', desc: 'Collected at least one of each firefly family', icon: '✨' },
    { id: 'sang_to_plant', name: 'Plant Whisperer', desc: 'Sang to your plant', icon: '🎵' },
    { id: 'invoke_power', name: 'Essence Caller', desc: 'Used Essence in the Midnight Garden', icon: '⚡' },
    { id: 'scar_healed', name: 'Unburdened', desc: 'Lifted a scar using Essence', icon: '🫙' }
]);

function unlockDiscovery(discoveryId) {
    if (!state.discoveries) state.discoveries = [];
    if (state.discoveries.includes(discoveryId)) return false;
    
    state.discoveries.push(discoveryId);
    const discovery = DISCOVERIES.find(d => d.id === discoveryId);
    if (discovery && typeof spawnFloatingText === 'function') {
        spawnFloatingText(`✨ Discovered: ${discovery.name}`, '#fbbf24', 'good');
    }
    if (typeof saveState === 'function') saveState();
    return true;
}

function openDiscoveries() {
    const menuOverlay = document.getElementById('menuOverlay');
    if (menuOverlay) menuOverlay.classList.remove('open');
    const overlay = document.getElementById('discoveriesOverlay');
    if (overlay) {
        overlay.classList.add('open');
        renderDiscoveries();
    }
    if (typeof pushHistoryState === 'function') pushHistoryState();
}

function closeDiscoveries() {
    const overlay = document.getElementById('discoveriesOverlay');
    if (overlay) overlay.classList.remove('open');
    const menuOverlay = document.getElementById('menuOverlay');
    if (menuOverlay) menuOverlay.classList.add('open');
}

function renderDiscoveries() {
    const list = getEl('discoveriesList');
    if (!list) return;
    
    if (!state.discoveries) state.discoveries = [];
    
    // Optimization: Use DocumentFragment to batch inserts
    const fragment = document.createDocumentFragment();
    
    DISCOVERIES.forEach(d => {
        const unlocked = state.discoveries.includes(d.id);
        const item = document.createElement('div');
        item.className = 'discovery-item' + (unlocked ? '' : ' locked');
        item.innerHTML = `
            <div class="discovery-icon">${unlocked ? d.icon : '🔒'}</div>
            <div class="discovery-info">
                <div class="discovery-name">${unlocked ? d.name : '???'}</div>
                <div class="discovery-desc">${unlocked ? d.desc : 'Keep playing to discover'}</div>
            </div>
        `;
        fragment.appendChild(item);
    });
    
    list.innerHTML = '';
    list.appendChild(fragment);
}

// ============================================
// DIAGNOSTIC MOODS
// ============================================

const DIAGNOSTIC_MOODS = Object.freeze({
    crisis_water: { text: 'desperately thirsty...', color: '#f87171', class: 'crisis' },
    crisis_sun: { text: 'fading in darkness...', color: '#f87171', class: 'crisis' },
    crisis_love: { text: 'feeling abandoned...', color: '#f87171', class: 'crisis' },
    crisis_all: { text: 'withering away...', color: '#f87171', class: 'crisis' },
    stressed_water: { text: 'parched and wilting...', color: '#fb923c', class: 'thirsty' },
    stressed_sun: { text: 'reaching for light...', color: '#fb923c', class: 'dim' },
    stressed_love: { text: 'feeling neglected...', color: '#fb923c', class: 'lonely' },
    needs_water: { text: 'could use some rain...', color: '#fbbf24', class: 'thirsty' },
    needs_sun: { text: 'a bit dim today...', color: '#fbbf24', class: 'dim' },
    needs_love: { text: 'looking for attention...', color: '#fbbf24', class: 'lonely' },
    thriving: { text: 'basking contentedly', color: '#4ade80', class: '' },
    content: { text: 'swaying gently', color: '#a3e635', class: '' },
    growing: { text: 'growing steadily', color: '#4ade80', class: '' },
    dormant: { text: 'resting quietly', color: '#94a3b8', class: '' }
});

function getDiagnosticMood() {
    const w = state.water, s = state.sun, l = state.love;
    const min = Math.min(w, s, l);
    const avg = (w + s + l) / 3;
    
    if (min < 10) {
        if (w < 10 && s < 10 && l < 10) return DIAGNOSTIC_MOODS.crisis_all;
        if (w < 10) return DIAGNOSTIC_MOODS.crisis_water;
        if (s < 10) return DIAGNOSTIC_MOODS.crisis_sun;
        if (l < 10) return DIAGNOSTIC_MOODS.crisis_love;
    }
    
    if (min < 20) {
        if (w < 20) return DIAGNOSTIC_MOODS.stressed_water;
        if (s < 20) return DIAGNOSTIC_MOODS.stressed_sun;
        if (l < 20) return DIAGNOSTIC_MOODS.stressed_love;
    }
    
    if (min < 35) {
        if (w < 35) return DIAGNOSTIC_MOODS.needs_water;
        if (s < 35) return DIAGNOSTIC_MOODS.needs_sun;
        if (l < 35) return DIAGNOSTIC_MOODS.needs_love;
    }
    
    if (avg >= 75) return DIAGNOSTIC_MOODS.thriving;
    if (avg >= 50) return DIAGNOSTIC_MOODS.content;
    return DIAGNOSTIC_MOODS.growing;
}

// ============================================
// URGENCY INDICATORS
// ============================================

function updateUrgencyIndicators() {
    const w = state.water, s = state.sun, l = state.love;
    const min = Math.min(w, s, l);
    
    // Optimization: Use cached elements
    const ringWater = getEl('ringWater');
    const ringSun = getEl('ringSun');
    const ringLove = getEl('ringLove');
    
    // Toggle class is efficient, only touches DOM if changed
    if (ringWater) ringWater.classList.toggle('urgent', w < 20);
    if (ringSun) ringSun.classList.toggle('urgent', s < 20);
    if (ringLove) ringLove.classList.toggle('urgent', l < 20);
    
    const urgencyWarning = getEl('urgencyWarning');
    const urgencyText = getEl('urgencyText');
    
    if (urgencyWarning && urgencyText) {
        if (min < 15) {
            urgencyWarning.classList.add('visible');
            if (w < 15) urgencyText.textContent = 'Needs water urgently!';
            else if (s < 15) urgencyText.textContent = 'Needs light urgently!';
            else urgencyText.textContent = 'Needs love urgently!';
        } else {
            urgencyWarning.classList.remove('visible');
        }
    }
}

// ============================================
// ACTIVE MODIFIERS DISPLAY
// ============================================

function updateActiveModifiers() {
    const modifiers = getEl('modifierList');
    const container = getEl('activeModifiers');
    if (!modifiers || !container) return;
    
    // Optimization: Check if rebuild is necessary could be added,
    // but building small strings is generally fast enough in JS.
    // The previous implementation is fine, just using cached DOM now.
    
    const mods = [];
    
    // Season modifier
    if (typeof SEASONS !== 'undefined' && typeof state !== 'undefined') {
        const season = SEASONS[state.season % 4];
        if (season && season.growth !== 1) {
            const sign = season.growth > 1 ? '+' : '';
            mods.push({
                text: `${season.icon} ${sign}${Math.round((season.growth - 1) * 100)}% growth`,
                class: 'seasonal'
            });
        }
    }
    
    // Guardian effects
    if (state.activeGuardians && typeof FIREFLY_FAMILIES !== 'undefined') {
        state.activeGuardians.forEach(i => {
            const fam = FIREFLY_FAMILIES[i];
            if (fam) {
                mods.push({
                    text: `👑 ${fam.name} Guardian`,
                    class: 'guardian'
                });
            }
        });
    }
    
    // Active buffs
    if (state.buffs) {
        state.buffs.forEach(buff => {
            if (buff.remaining > 0) {
                mods.push({
                    text: `✨ ${buff.type} boost`,
                    class: 'buff'
                });
            }
        });
    }
    
    // Fertilizer
    if (state.growthMultiplier > 1) {
        mods.push({
            text: '🌿 Fertilized (2x growth)',
            class: 'buff'
        });
    }
    
    container.classList.toggle('has-modifiers', mods.length > 0);
    
    // Only update innerHTML if it's actually different (saves layout/paint)
    const newHTML = mods.map(m => `<span class="modifier-tag ${m.class}">${m.text}</span>`).join('');
    if (modifiers.innerHTML !== newHTML) {
        modifiers.innerHTML = newHTML;
    }
}

// ============================================
// QUICK STATS TOOLTIP
// ============================================

function showQuickStats(x, y) {
    const tooltip = getEl('quickStatsTooltip');
    const content = getEl('quickStatsContent');
    if (!tooltip || !content) return;
    
    let html = '';
    
    if (typeof SEASONS !== 'undefined' && typeof state !== 'undefined') {
        const season = SEASONS[state.season % 4];
        const growthMod = typeof computeGrowthFactor === 'function' ? computeGrowthFactor() : 0.5;
        const effectiveGrowth = Math.round(growthMod * season.growth * (state.growthMultiplier || 1) * 100);
        
        html += `<div class="stat-row">
            <span class="stat-label">Growth Efficiency</span>
            <span class="stat-value ${effectiveGrowth >= 70 ? 'positive' : effectiveGrowth >= 40 ? 'neutral' : 'negative'}">${effectiveGrowth}%</span>
        </div>`;
        
        html += `<div class="stat-row">
            <span class="stat-label">Season</span>
            <span class="stat-value neutral">${season.icon} ${season.name}</span>
        </div>`;
    }
    
    if (state.dna?.resilience > 1) {
        html += `<div class="stat-row">
            <span class="stat-label">Resilience</span>
            <span class="stat-value positive">-${Math.round((1 - 1/state.dna.resilience) * 100)}% decay</span>
        </div>`;
    }
    
    if (state.activeGuardians?.length > 0) {
        html += `<div class="stat-row">
            <span class="stat-label">Guardians Active</span>
            <span class="stat-value positive">${state.activeGuardians.length}</span>
        </div>`;
    }
    
    content.innerHTML = html || '<div class="stat-row"><span class="stat-label">No active modifiers</span></div>';
    
    tooltip.style.left = Math.min(x, window.innerWidth - 280) + 'px';
    tooltip.style.top = Math.max(y - 150, 20) + 'px';
    tooltip.classList.add('visible');
}

function hideQuickStats() {
    const tooltip = getEl('quickStatsTooltip');
    if (tooltip) tooltip.classList.remove('visible');
}

// ============================================
// HINTS SYSTEM
// ============================================

const HINTS = {
    first_visit: {
        content: '👋 Welcome to Pocket Sprout! Toggle rain ☁️ and sun ☀️ to care for your plant. Tap the pot to show love, or hold it to see vitality rings!'
    },
    firefly_appeared: {
        content: '🦋 A firefly appeared! Tap it to collect. Each family grants unique powers.'
    },
    guardian_ready: {
        content: '👑 You have enough fireflies to summon a Guardian! Visit the Firefly Sanctuary.'
    },
    midnight_garden: {
        content: '🌙 Tap the arrow → on the right to visit the Midnight Garden, where your ancestors rest.'
    },
    plant_struggling: {
        content: '⚠️ Your plant is struggling! Check its vitality rings by holding the pot.'
    },
    ascension_ready: {
        content: '🌸 Your plant is ready to ascend! Open the menu to harvest and begin a new cycle.'
    }
};

function showHint(hintId) {
    if (!state.hintsShown) state.hintsShown = [];
    if (state.hintsShown.includes(hintId)) return;
    
    const hint = HINTS[hintId];
    if (!hint) return;
    
    const bubble = getEl('hintBubble');
    const content = getEl('hintContent');
    
    if (bubble && content) {
        content.textContent = hint.content;
        bubble.classList.add('visible');
        
        state.hintsShown.push(hintId);
        if (typeof saveState === 'function') saveState();
    }
}

function dismissHint() {
    const bubble = getEl('hintBubble');
    if (bubble) bubble.classList.remove('visible');
}

// ============================================
// FIREFLY SANCTUARY IMPROVEMENTS
// ============================================

function renderFireflyLogImproved() {
    const grid = getEl('fireflyFamilyGrid');
    if (!grid || typeof FIREFLY_FAMILIES === 'undefined') return;
    
    // Optimization: Fragments again
    const fragment = document.createDocumentFragment();
    
    FIREFLY_FAMILIES.forEach((f, i) => {
        const cnt = state.fireflies[i] || 0;
        const col = typeof getFireflyColor === 'function' ? getFireflyColor(i) : `hsl(${f.hue}, 70%, 60%)`;
        const threshold = (typeof GUARDIAN_THRESHOLD !== 'undefined') ? GUARDIAN_THRESHOLD : 50;
        const hasGuardian = cnt >= threshold;
        
        const card = document.createElement('div');
        card.className = 'family-card' + (selectedFamily === i ? ' selected' : '');
        card.style.setProperty('--family-color', col);
        
        const progress = Math.min(100, (cnt / threshold) * 100);
        
        card.innerHTML = `
            <div class="family-orb" style="background:${col}"></div>
            <div class="family-name">${f.name}</div>
            <div class="family-count">${cnt}</div>
            <div class="family-power">${hasGuardian ? '👑 ' + f.power : f.power}</div>
            <div class="family-mini-progress" style="width:${progress}%;background:${col}"></div>
        `;
        
        // Note: Event delegation is better, but this is acceptable for small lists (8 items)
        card.onclick = () => {
            selectedFamily = i;
            renderFireflyLogImproved();
            renderFamilyDetail();
        };
        
        fragment.appendChild(card);
    });
    
    grid.innerHTML = '';
    grid.appendChild(fragment);
    
    renderFamilyDetail();
}

function renderFamilyDetail() {
    const det = getEl('familyDetailPanel');
    if (selectedFamily === null || !det || typeof FIREFLY_FAMILIES === 'undefined') {
        if (det) det.style.display = 'none';
        return;
    }
    
    det.style.display = 'block';
    
    const f = FIREFLY_FAMILIES[selectedFamily];
    const cnt = state.fireflies[selectedFamily] || 0;
    const col = typeof getFireflyColor === 'function' ? getFireflyColor(selectedFamily) : `hsl(${f.hue}, 70%, 60%)`;
    const threshold = typeof GUARDIAN_THRESHOLD !== 'undefined' ? GUARDIAN_THRESHOLD : 50;
    
    det.style.setProperty('--family-color', col);
    
    const orb = getEl('detailOrb');
    if (orb) orb.style.cssText = `background:${col};box-shadow:0 0 20px ${col}`;
    
    const name = getEl('detailFamilyName');
    if (name) name.textContent = f.name + ' Family';
    
    const power = getEl('detailFamilyPower');
    if (power) power.textContent = f.desc;
    
    const count = getEl('detailFireflyCount');
    if (count) count.textContent = `You have ${cnt} fireflies`;
    
    const barFill = getEl('guardianBarFill');
    const barLabel = getEl('guardianBarLabel');
    
    if (barFill && barLabel) {
        const progress = Math.min(100, (cnt / threshold) * 100);
        barFill.style.width = progress + '%';
        
        if (cnt >= threshold) {
            barLabel.textContent = '👑 Guardian is present (Invoking costs 25)';
        } else {
            barLabel.textContent = `${cnt}/${threshold} to Guardian`;
        }
    }
    
    const btn = getEl('releaseBtn');
    if (btn) {
        btn.disabled = cnt < 1;
        btn.textContent = cnt >= 1 ? '✨ Invoke Power' : 'No fireflies';
    }
}

// ============================================
// DISCOVERABILITY
// ============================================

function checkGardenDiscoverability() {
    if (state.history && state.history.length > 0 && (!state.hintsShown || !state.hintsShown.includes('midnight_garden'))) {
        const entry = document.getElementById('midnightGardenEntry');
        const hint = document.getElementById('gardenHint');
        
        if (entry) {
            entry.classList.add('pulse-hint', 'show-label');
            setTimeout(() => entry.classList.remove('pulse-hint'), 6000);
        }
        
        if (hint) {
            hint.classList.add('visible');
            setTimeout(() => hint.classList.remove('visible'), 6000);
        }
        
        showHint('midnight_garden');
    }
}

function showGardenFireflyHint() {
    const hint = document.getElementById('gardenFireflyHint');
    if (hint && (!state.hintsShown || !state.hintsShown.includes('garden_fireflies'))) {
        hint.classList.add('visible');
        if (!state.hintsShown) state.hintsShown = [];
        state.hintsShown.push('garden_fireflies');
    }
}

// ============================================
// VOCABULARY FIXES
// ============================================

function updateGenBadgeText() {
    const genBadge = getEl('genBadge');
    if (genBadge && typeof state !== 'undefined') {
        genBadge.textContent = `GEN ${state.generation}`;
    }
}

// ============================================
// ENHANCED RENDER
// ============================================

function enhancedRender() {
    // Call original render if exists
    if (typeof window._originalRender === 'function') {
        window._originalRender();
    }
    
    updateUrgencyIndicators();
    updateGenBadgeText();
    updateAscensionGlow();
    updateBuffVisuals();
    
    // Update mood with diagnostic version
    const plantMoodDisplay = getEl('plantMoodDisplay');
    if (plantMoodDisplay && typeof state !== 'undefined') {
        const mood = getDiagnosticMood();
        // Optimization: check text content first
        if (plantMoodDisplay.textContent !== mood.text) {
            plantMoodDisplay.textContent = mood.text;
            plantMoodDisplay.style.color = mood.color;
            plantMoodDisplay.className = 'plant-mood ' + mood.class;
        }
    }
    
    // Update stage label
    const stageLabel = getEl('stageLabel');
    if (stageLabel && typeof STAGES !== 'undefined' && typeof state !== 'undefined') {
        const txt = STAGES[state.stage - 1] || 'Seed';
        if (stageLabel.textContent !== txt) {
            stageLabel.textContent = txt;
        }
    }
}

// ============================================
// ASCENSION GLOW & HINT
// ============================================

function updateAscensionGlow() {
    const plantHero = getEl('plantHero');
    if (!plantHero || typeof state === 'undefined') return;
    
    const isReady = state.stage >= 5 && !state.isDead;
    // toggle handles boolean check internally
    plantHero.classList.toggle('ascension-ready', isReady);
    
    // Show hint if ready and not shown before
    if (isReady && (!state.hintsShown || !state.hintsShown.includes('ascension_ready'))) {
        showHint('ascension_ready');
    }
}

// ============================================
// BUFF VISUAL FEEDBACK
// ============================================

function updateBuffVisuals() {
    const plantHero = getEl('plantHero');
    if (!plantHero || typeof state === 'undefined') return;
    
    // Check for active buffs with color
    const activeBuff = state.buffs && state.buffs.find(b => b.remaining > 0);
    
    if (activeBuff) {
        plantHero.classList.add('buff-active');
        // Use stored color from buff if available, otherwise use type-based color
        if (activeBuff.color) {
            plantHero.style.setProperty('--buff-color', activeBuff.color.replace(')', ', 0.35)').replace('hsl(', 'hsla('));
        } else {
            plantHero.classList.add('buff-' + activeBuff.type);
        }
    } else if (state.activeGuardians && state.activeGuardians.length > 0 && typeof FIREFLY_FAMILIES !== 'undefined') {
        // Guardian is active
        plantHero.classList.add('buff-active');
        const firstGuardian = FIREFLY_FAMILIES[state.activeGuardians[0]];
        if (firstGuardian) {
            const col = typeof getFireflyColor === 'function' ? getFireflyColor(state.activeGuardians[0]) : `hsl(${firstGuardian.hue}, 70%, 60%)`;
            plantHero.style.setProperty('--buff-color', col.replace(')', ', 0.35)').replace('hsl(', 'hsla('));
        }
    } else {
        // No active buffs or guardians
        // Removing classes is cheap if they aren't there
        plantHero.classList.remove('buff-active', 'buff-water', 'buff-sun', 'buff-love', 'buff-growth', 'buff-health', 'buff-slow', 'buff-luck', 'buff-random');
        plantHero.style.removeProperty('--buff-color');
    }
}

function enhancedUpdateMenuStats() {
    if (typeof window._originalUpdateMenuStats === 'function') {
        window._originalUpdateMenuStats();
    }
    updateActiveModifiers();
}

// ============================================
// INITIALIZE
// ============================================

function initImprovements() {
    // Ensure state has new properties
    if (typeof state !== 'undefined') {
        if (!state.discoveries) state.discoveries = [];
        if (!state.hintsShown) state.hintsShown = [];
    }
    
    // Override functions
    if (typeof render === 'function') {
        window._originalRender = render;
        window.render = enhancedRender;
    }
    
    if (typeof updateMenuStats === 'function') {
        window._originalUpdateMenuStats = updateMenuStats;
        window.updateMenuStats = enhancedUpdateMenuStats;
    }
    
    if (typeof renderFireflyLog === 'function') {
        window._originalRenderFireflyLog = renderFireflyLog;
        window.renderFireflyLog = renderFireflyLogImproved;
    }
    
    // Check garden discoverability
    setTimeout(checkGardenDiscoverability, 5000);
    
    // Show first visit hint if new player
    if (typeof state !== 'undefined' && state.day === 1 && state.generation === 1 && 
        (!state.hintsShown || !state.hintsShown.includes('first_visit'))) {
        setTimeout(() => showHint('first_visit'), 2000);
    }
    
    console.log('Pocket Sprout v1.2 improvements loaded');
}

// Initialize when ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(initImprovements, 500));
} else {
    setTimeout(initImprovements, 500);
}

// Export all functions globally
window.switchMenuTab = switchMenuTab;
window.openDiscoveries = openDiscoveries;
window.closeDiscoveries = closeDiscoveries;
window.dismissHint = dismissHint;
window.showHint = showHint;
window.unlockDiscovery = unlockDiscovery;
window.showQuickStats = showQuickStats;
window.hideQuickStats = hideQuickStats;
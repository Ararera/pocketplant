/**
 * Day of the Week System for Pocket Sprout
 * Each day brings unique bonuses and special features
 */

(function() {
    'use strict';

    // ═══════════════════════════════════════════════════════════════════════
    // DAY DEFINITIONS
    // ═══════════════════════════════════════════════════════════════════════
    
    const DAYS_OF_WEEK = Object.freeze({
        0: {
            name: 'Sun Day',
            shortName: 'Sunday',
            icon: '☀️',
            color: '#fbbf24',
            effects: [
                { text: '☀️ 2x sunlight recovery', type: 'sun_boost' }
            ],
            description: 'The sun shines twice as bright today. Your plant receives double the sunlight when using the sun feature.'
        },
        1: {
            name: 'Moon Day',
            shortName: 'Monday',
            icon: '🌙',
            color: '#a78bfa',
            effects: [
                { text: '🌙 2x moonlight at night', type: 'moon_boost' },
                { text: '✨ Pearl fireflies +50%', type: 'pearl_boost' }
            ],
            description: 'Mystery fills the air. Moonlight is twice as effective at night, and Pearl fireflies appear more often.'
        },
        2: {
            name: 'Growth Day',
            shortName: 'Tuesday',
            icon: '🌱',
            color: '#4ade80',
            effects: [
                { text: '🌿 Fertilizer lasts 2x', type: 'fertilizer_boost' },
                { text: '🎮 Growth ritual available', type: 'growth_ritual' }
            ],
            description: 'A day of flourishing. Fertilizer effects last twice as long, and you can perform a special growth ritual up to 3 times.'
        },
        3: {
            name: 'Water Day',
            shortName: 'Wednesday',
            icon: '💧',
            color: '#60a5fa',
            effects: [
                { text: '💧 Soil retains 2x water', type: 'water_retention' },
                { text: '📜 Wisdom messages unlocked', type: 'wisdom' }
            ],
            description: 'Water lingers longer today. Your soil retains water twice as long. Visit discoveries for daily wisdom.'
        },
        4: {
            name: 'Thirst Day',
            shortName: 'Thursday',
            icon: '🏜️',
            color: '#fb923c',
            effects: [
                { text: '🏜️ Slightly faster thirst', type: 'thirst_penalty' }
            ],
            description: 'Your plant is a bit thirstier than usual. Keep an eye on its water needs.'
        },
        5: {
            name: 'Firefly Friday',
            shortName: 'Friday',
            icon: '🦋',
            color: '#f472b6',
            effects: [
                { text: '🦋 +50% firefly spawns', type: 'firefly_boost' },
                { text: '🎨 Fashion Friday active', type: 'fashion' }
            ],
            description: 'Fireflies are drawn to your garden! 50% more fireflies appear. Changing pot styles unlocks a special discovery and attracts matching fireflies.'
        },
        6: {
            name: 'Rest Day',
            shortName: 'Saturday',
            icon: '🐌',
            color: '#94a3b8',
            effects: [
                { text: '😌 Stats decay slower', type: 'rest_bonus' },
                { text: '🐌 Wandering snail visits', type: 'snail' }
            ],
            description: 'A peaceful day of rest. All stats decay slower than usual, and a mysterious snail wanders by your plant.'
        }
    });

    // Wisdom messages for Wisdom Wednesday
    const WISDOM_MESSAGES = Object.freeze([
        "Growth is not always visible, but it is always happening.",
        "The strongest roots are formed in patient soil.",
        "Every leaf that falls makes room for new growth.",
        "Water your dreams as you water your plant.",
        "Sunlight and shadow both have lessons to teach.",
        "The tallest trees started as the smallest seeds.",
        "Rest is not idleness; it is preparation for bloom.",
        "A garden thrives on attention, not perfection.",
        "The firefly's light comes from within.",
        "Each season passes, but the cycle returns.",
        "Nurture what you wish to see flourish.",
        "Patience turns seeds into forests.",
        "The moon watches over what the sun began.",
        "Even wilting teaches us about resilience.",
        "Love given freely returns in unexpected ways.",
        "The snail arrives when you need it most.",
        "Colors fade only to return more vibrant.",
        "What seems dormant is often deeply alive.",
        "Your presence alone is a gift to growing things.",
        "The journey of a thousand blooms begins with one bud."
    ]);

    // Snail dialog options
    const SNAIL_DIALOGS = {
        greeting: [
            "A weathered snail emerges from behind the pot, leaving a faint silvery trail...",
            "You notice a small shell gleaming in the light. The snail within regards you thoughtfully.",
            "Slowly, deliberately, a snail appears. Its ancient eyes seem to hold secrets."
        ],
        offers: [
            {
                id: 'heal_scar',
                name: 'Heal a Scar',
                desc: 'The snail offers to help mend one of your plant\'s scars',
                cost: 10,
                available: () => (typeof state !== 'undefined' && state.scars && state.scars.length > 0)
            },
            {
                id: 'boost_growth',
                name: 'Growth Blessing',
                desc: 'Receive a significant boost to growth (+500)',
                cost: 10,
                available: () => true
            },
            {
                id: 'restore_vitality',
                name: 'Restore Vitality',
                desc: 'Fully restore water, sun, and love',
                cost: 10,
                available: () => true
            },
            {
                id: 'attract_fireflies',
                name: 'Firefly Beacon',
                desc: 'Greatly increase firefly spawns for the rest of the day',
                cost: 10,
                available: () => true
            },
            {
                id: 'change_flower_color',
                name: 'Shift Flower Hue',
                desc: 'Slightly alter your plant\'s flower color',
                cost: 10,
                available: () => (typeof state !== 'undefined' && state.stage >= 4)
            }
        ],
        farewell: [
            "The snail nods slowly and begins its journey away, leaving shimmering trails.",
            "With a gentle movement, the snail retreats into its shell, content.",
            "The snail's trail glows briefly before fading. Until next Saturday..."
        ]
    };

    // ═══════════════════════════════════════════════════════════════════════
    // DAY STATE
    // ═══════════════════════════════════════════════════════════════════════
    
    const dayState = {
        currentDay: new Date().getDay(),
        tuesdayRitualsUsed: 0,
        tuesdayRitualsMax: 3,
        lastTuesdayReset: null,
        snailInteracted: false,
        lastSnailDay: null,
        fashionFridayStyleChanged: false,
        lastFashionFridayPotSnapshot: null,
        fireflyBeaconActive: false,
        fireflyBeaconExpires: null,
        wisdomMessageIndex: -1
    };

    // ═══════════════════════════════════════════════════════════════════════
    // CORE FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════
    
    function getCurrentDay() {
        return new Date().getDay();
    }

    function getDayInfo(dayNum = null) {
        const day = dayNum !== null ? dayNum : getCurrentDay();
        return DAYS_OF_WEEK[day];
    }

    function getDayName() {
        return getDayInfo().name;
    }

    function getDayIcon() {
        return getDayInfo().icon;
    }

    function getDayEffects() {
        return getDayInfo().effects;
    }

    function isDayOfWeek(dayNum) {
        return getCurrentDay() === dayNum;
    }

    // Convenience checks
    function isSunDay() { return isDayOfWeek(0); }
    function isMoonDay() { return isDayOfWeek(1); }
    function isTuesday() { return isDayOfWeek(2); }
    function isWednesday() { return isDayOfWeek(3); }
    function isThursday() { return isDayOfWeek(4); }
    function isFriday() { return isDayOfWeek(5); }
    function isSaturday() { return isDayOfWeek(6); }

    // ═══════════════════════════════════════════════════════════════════════
    // MODIFIER CALCULATIONS
    // ═══════════════════════════════════════════════════════════════════════
    
    /**
     * Get sun recovery multiplier based on day
     */
    function getSunRecoveryMultiplier() {
        if (isSunDay()) return 2.0;
        if (isMoonDay() && typeof isDaytime === 'function' && !isDaytime()) return 2.0;
        return 1.0;
    }

    /**
     * Get water decay multiplier (lower = slower decay)
     */
    function getWaterDecayMultiplier() {
        if (isWednesday()) return 0.5; // Water retained 2x longer
        if (isThursday()) return 1.15; // Slightly faster thirst
        if (isSaturday()) return 0.85; // Rest day slower decay
        return 1.0;
    }

    /**
     * Get sun decay multiplier
     */
    function getSunDecayMultiplier() {
        if (isSaturday()) return 0.85;
        return 1.0;
    }

    /**
     * Get love decay multiplier
     */
    function getLoveDecayMultiplier() {
        if (isSaturday()) return 0.85;
        return 1.0;
    }

    /**
     * Get fertilizer duration multiplier
     */
    function getFertilizerDurationMultiplier() {
        if (isTuesday()) return 2.0;
        return 1.0;
    }

    /**
     * Get firefly spawn multiplier
     */
    function getFireflySpawnMultiplier() {
        let mult = 1.0;
        if (isFriday()) mult *= 1.5;
        if (dayState.fireflyBeaconActive && dayState.fireflyBeaconExpires && Date.now() < dayState.fireflyBeaconExpires) {
            mult *= 2.0;
        } else if (dayState.fireflyBeaconActive) {
            dayState.fireflyBeaconActive = false;
            dayState.fireflyBeaconExpires = null;
        }
        return mult;
    }

    /**
     * Get Pearl firefly spawn multiplier (for Monday)
     */
    function getPearlFireflyMultiplier() {
        if (isMoonDay()) return 1.5;
        return 1.0;
    }

    /**
     * Check if pot color matches a firefly family
     * Returns the family index if matched, -1 otherwise
     */
    function getMatchingFireflyFamily(potColor) {
        if (!potColor || typeof FIREFLY_FAMILIES === 'undefined') return -1;
        
        // Parse pot color to get hue
        let potHue = -1;
        if (potColor.startsWith('hsl')) {
            const match = potColor.match(/hsl\((\d+)/);
            if (match) potHue = parseInt(match[1]);
        } else if (potColor.startsWith('#')) {
            potHue = hexToHue(potColor);
        }
        
        if (potHue < 0) return -1;

        // Find closest firefly family by hue
        let closestIdx = -1;
        let closestDiff = 360;
        
        FIREFLY_FAMILIES.forEach((f, i) => {
            const diff = Math.min(
                Math.abs(potHue - f.hue),
                360 - Math.abs(potHue - f.hue)
            );
            if (diff < closestDiff && diff < 30) { // Within 30 degrees
                closestDiff = diff;
                closestIdx = i;
            }
        });
        
        return closestIdx;
    }

    function hexToHue(hex) {
        const r = parseInt(hex.slice(1, 3), 16) / 255;
        const g = parseInt(hex.slice(3, 5), 16) / 255;
        const b = parseInt(hex.slice(5, 7), 16) / 255;
        
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        
        if (max === min) return 0;
        
        let h;
        const d = max - min;
        
        switch (max) {
            case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
            case g: h = ((b - r) / d + 2) / 6; break;
            case b: h = ((r - g) / d + 4) / 6; break;
        }
        
        return Math.round(h * 360);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // TUESDAY GROWTH RITUAL
    // ═══════════════════════════════════════════════════════════════════════
    
    function canPerformGrowthRitual() {
        if (!isTuesday()) return false;
        
        // Reset counter if it's a new Tuesday
        const today = new Date().toDateString();
        if (dayState.lastTuesdayReset !== today) {
            dayState.tuesdayRitualsUsed = 0;
            dayState.lastTuesdayReset = today;
        }
        
        return dayState.tuesdayRitualsUsed < dayState.tuesdayRitualsMax;
    }

    function getRitualsRemaining() {
        if (!isTuesday()) return 0;
        const today = new Date().toDateString();
        if (dayState.lastTuesdayReset !== today) {
            return dayState.tuesdayRitualsMax;
        }
        return dayState.tuesdayRitualsMax - dayState.tuesdayRitualsUsed;
    }

    function startGrowthRitual() {
        if (!canPerformGrowthRitual()) {
            if (typeof spawnFloatingText === 'function') {
                spawnFloatingText('No rituals remaining today', '#fb923c', 'warn');
            }
            return false;
        }
        
        // Close any open menus
        const menuOverlay = document.getElementById('menuOverlay');
        if (menuOverlay) menuOverlay.classList.remove('open');
        
        // Start the wilt healing mini-game with special reward callback
        if (typeof window.beginHealing === 'function') {
            // Store that this is a growth ritual, not a real scar healing
            dayState.isGrowthRitual = true;
            window.beginHealing('wilt');
            return true;
        }
        
        return false;
    }

    function completeGrowthRitual() {
        if (!dayState.isGrowthRitual) return;
        
        dayState.isGrowthRitual = false;
        dayState.tuesdayRitualsUsed++;
        
        // Apply growth ritual bonuses
        if (typeof state !== 'undefined') {
            state.water = Math.min(100, state.water + 25);
            state.growth += 150;
            
            if (typeof spawnFloatingText === 'function') {
                spawnFloatingText('🌱 Growth Ritual Complete! +150 growth, +25 water', '#4ade80', 'good');
            }
            
            if (typeof saveState === 'function') saveState();
            if (typeof unlockDiscovery === 'function') unlockDiscovery('growth_ritual');
        }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // WISDOM WEDNESDAY
    // ═══════════════════════════════════════════════════════════════════════
    
    function getWisdomMessage() {
        if (!isWednesday()) return null;
        
        // Get a deterministic but varying message based on the date
        const today = new Date();
        const dayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24));
        const index = dayOfYear % WISDOM_MESSAGES.length;
        
        return WISDOM_MESSAGES[index];
    }

    // ═══════════════════════════════════════════════════════════════════════
    // FASHION FRIDAY
    // ═══════════════════════════════════════════════════════════════════════
    
    function checkFashionFriday(oldPotColor, newPotColor) {
        if (!isFriday()) return;
        if (oldPotColor === newPotColor) return;
        
        // Unlock fashion discovery
        if (typeof unlockDiscovery === 'function') {
            unlockDiscovery('fashion_friday');
        }
        
        if (typeof spawnFloatingText === 'function') {
            spawnFloatingText('✨ Fashion Friday style unlocked!', '#f472b6', 'good');
        }
        
        // Find matching firefly family
        const matchIdx = getMatchingFireflyFamily(newPotColor);
        if (matchIdx >= 0 && typeof FIREFLY_FAMILIES !== 'undefined') {
            dayState.fashionFridayMatchedFamily = matchIdx;
            const family = FIREFLY_FAMILIES[matchIdx];
            if (typeof spawnFloatingText === 'function') {
                setTimeout(() => {
                    spawnFloatingText(`🦋 ${family.name} fireflies are drawn to your new style!`, getFireflyColor(matchIdx), 'good');
                }, 1500);
            }
        }
    }

    function getFashionFridayBonusFamily() {
        if (!isFriday()) return -1;
        return dayState.fashionFridayMatchedFamily ?? -1;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // SATURDAY SNAIL
    // ═══════════════════════════════════════════════════════════════════════
    
    function shouldShowSnail() {
        if (!isSaturday()) return false;
        
        const today = new Date().toDateString();
        if (dayState.lastSnailDay === today && dayState.snailInteracted) return false;
        
        // Reset for new Saturday
        if (dayState.lastSnailDay !== today) {
            dayState.snailInteracted = false;
            dayState.lastSnailDay = today;
        }
        
        return true;
    }

    function createSnailElement() {
        if (!shouldShowSnail()) return null;
        
        let snail = document.getElementById('wanderingSnail');
        if (snail) return snail;
        
        snail = document.createElement('div');
        snail.id = 'wanderingSnail';
        snail.className = 'wandering-snail';
        snail.innerHTML = '🐌';
        snail.title = 'A wandering snail...';
        
        snail.addEventListener('click', openSnailDialog);
        snail.addEventListener('touchend', (e) => {
            e.preventDefault();
            openSnailDialog();
        });
        
        const stageContainer = document.querySelector('.stage-container');
        if (stageContainer) {
            stageContainer.appendChild(snail);
        } else {
            document.body.appendChild(snail);
        }
        
        // Animate in after a moment
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                snail.classList.add('visible');
            });
        });
        
        return snail;
    }

    function removeSnailElement() {
        const snail = document.getElementById('wanderingSnail');
        if (snail) {
            snail.classList.remove('visible');
            setTimeout(() => snail.remove(), 600);
        }
    }

    function openSnailDialog() {
        // Close any open menus
        const menuOverlay = document.getElementById('menuOverlay');
        if (menuOverlay) menuOverlay.classList.remove('open');
        
        const overlay = document.getElementById('snailOverlay');
        if (!overlay) {
            createSnailOverlay();
        }
        
        renderSnailDialog();
        document.getElementById('snailOverlay').classList.add('open');
        
        if (typeof pushHistoryState === 'function') pushHistoryState();
    }

    function closeSnailDialog() {
        const overlay = document.getElementById('snailOverlay');
        if (overlay) overlay.classList.remove('open');
    }

    function createSnailOverlay() {
        const overlay = document.createElement('div');
        overlay.id = 'snailOverlay';
        overlay.className = 'menu-overlay';
        overlay.innerHTML = `
            <div class="menu-card snail-card">
                <div class="menu-title">🐌 Wandering Snail</div>
                <div class="snail-greeting" id="snailGreeting"></div>
                <div class="snail-offers" id="snailOffers"></div>
                <div class="snail-cost-notice">Each exchange costs 10 fireflies</div>
                <button class="btn-base close-btn" onclick="window.closeSnailDialog()">Leave the snail be</button>
            </div>
        `;
        document.body.appendChild(overlay);
    }

    function renderSnailDialog() {
        const greeting = document.getElementById('snailGreeting');
        const offersContainer = document.getElementById('snailOffers');
        
        if (greeting) {
            const greetings = SNAIL_DIALOGS.greeting;
            greeting.textContent = greetings[Math.floor(Math.random() * greetings.length)];
        }
        
        if (offersContainer) {
            offersContainer.innerHTML = '';
            
            const totalFireflies = (typeof state !== 'undefined' && state.totalFireflies) ? state.totalFireflies : 0;
            
            SNAIL_DIALOGS.offers.forEach(offer => {
                if (!offer.available()) return;
                
                const canAfford = totalFireflies >= offer.cost;
                
                const btn = document.createElement('button');
                btn.className = 'btn-base snail-offer-btn' + (canAfford ? '' : ' disabled');
                btn.innerHTML = `
                    <div class="snail-offer-name">${offer.name}</div>
                    <div class="snail-offer-desc">${offer.desc}</div>
                `;
                btn.disabled = !canAfford;
                
                if (canAfford) {
                    btn.onclick = () => acceptSnailOffer(offer.id);
                }
                
                offersContainer.appendChild(btn);
            });
            
            if (offersContainer.children.length === 0) {
                offersContainer.innerHTML = '<div class="snail-no-offers">The snail has nothing to offer right now...</div>';
            }
        }
    }

    function acceptSnailOffer(offerId) {
        if (typeof state === 'undefined') return;
        
        const cost = 10;
        if ((state.totalFireflies || 0) < cost) {
            if (typeof spawnFloatingText === 'function') {
                spawnFloatingText('Not enough fireflies...', '#f87171', 'warn');
            }
            return;
        }
        
        // Deduct fireflies (spread across families)
        let remaining = cost;
        for (let i = 0; i < 16 && remaining > 0; i++) {
            const have = state.fireflies[i] || 0;
            const take = Math.min(have, remaining);
            if (take > 0) {
                state.fireflies[i] = have - take;
                remaining -= take;
            }
        }
        state.totalFireflies = Math.max(0, (state.totalFireflies || 0) - cost);
        
        // Apply the offer
        switch (offerId) {
            case 'heal_scar':
                if (state.scars && state.scars.length > 0) {
                    const scar = state.scars.shift();
                    if (typeof spawnFloatingText === 'function') {
                        spawnFloatingText(`🐌 The snail heals your ${scar} scar...`, '#94a3b8', 'good');
                    }
                    if (typeof renderPlant === 'function') {
                        renderPlant('plantGroup', state.dna, state.stage);
                    }
                }
                break;
                
            case 'boost_growth':
                state.growth += 500;
                if (typeof spawnFloatingText === 'function') {
                    spawnFloatingText('🐌 The snail blesses your plant with growth! +500', '#4ade80', 'good');
                }
                break;
                
            case 'restore_vitality':
                state.water = 100;
                state.sun = 100;
                state.love = 100;
                if (typeof spawnFloatingText === 'function') {
                    spawnFloatingText('🐌 Your plant\'s vitality is fully restored!', '#4ade80', 'good');
                }
                break;
                
            case 'attract_fireflies':
                dayState.fireflyBeaconActive = true;
                // Expires at midnight
                const tomorrow = new Date();
                tomorrow.setHours(24, 0, 0, 0);
                dayState.fireflyBeaconExpires = tomorrow.getTime();
                if (typeof spawnFloatingText === 'function') {
                    spawnFloatingText('🐌 Fireflies will swarm to your garden today!', '#f472b6', 'good');
                }
                break;
                
            case 'change_flower_color':
                if (state.dna) {
                    state.dna.flowerH = (state.dna.flowerH + 30) % 360;
                    state.dna.flowerColor = `hsl(${state.dna.flowerH},${state.dna.flowerS}%,${state.dna.flowerL}%)`;
                    if (typeof renderPlant === 'function') {
                        renderPlant('plantGroup', state.dna, state.stage);
                    }
                    if (typeof spawnFloatingText === 'function') {
                        spawnFloatingText('🐌 Your flower\'s hue shifts subtly...', '#a78bfa', 'good');
                    }
                }
                break;
        }
        
        dayState.snailInteracted = true;
        
        if (typeof unlockDiscovery === 'function') {
            unlockDiscovery('snail_exchange');
        }
        
        if (typeof saveState === 'function') saveState();
        
        // Show farewell and close
        const farewell = SNAIL_DIALOGS.farewell[Math.floor(Math.random() * SNAIL_DIALOGS.farewell.length)];
        const greeting = document.getElementById('snailGreeting');
        const offers = document.getElementById('snailOffers');
        
        if (greeting) greeting.textContent = farewell;
        if (offers) offers.innerHTML = '';
        
        setTimeout(() => {
            closeSnailDialog();
            removeSnailElement();
        }, 2500);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // UI UPDATES
    // ═══════════════════════════════════════════════════════════════════════
    
    function createGrowthRitualButton() {
        if (!isTuesday()) {
            removeGrowthRitualButton();
            return;
        }
        
        let btn = document.getElementById('growthRitualBtn');
        if (btn) {
            updateGrowthRitualButton();
            return;
        }
        
        btn = document.createElement('button');
        btn.id = 'growthRitualBtn';
        btn.className = 'growth-ritual-btn';
        btn.onclick = startGrowthRitual;
        
        const stageContainer = document.querySelector('.stage-container');
        if (stageContainer) {
            stageContainer.appendChild(btn);
        }
        
        updateGrowthRitualButton();
        
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                btn.classList.add('visible');
            });
        });
    }

    function updateGrowthRitualButton() {
        const btn = document.getElementById('growthRitualBtn');
        if (!btn) return;
        
        const remaining = getRitualsRemaining();
        btn.innerHTML = `🌱 Growth Ritual (${remaining} left)`;
        btn.disabled = remaining <= 0;
        btn.classList.toggle('depleted', remaining <= 0);
    }

    function removeGrowthRitualButton() {
        const btn = document.getElementById('growthRitualBtn');
        if (btn) {
            btn.classList.remove('visible');
            setTimeout(() => btn.remove(), 300);
        }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // INITIALIZATION & DAY CHANGE HANDLING
    // ═══════════════════════════════════════════════════════════════════════
    
    function checkDayChange() {
        const currentDay = getCurrentDay();
        
        if (dayState.currentDay !== currentDay) {
            dayState.currentDay = currentDay;
            onDayChanged();
        }
    }

    function onDayChanged() {
        // Reset daily state
        dayState.tuesdayRitualsUsed = 0;
        dayState.snailInteracted = false;
        dayState.fashionFridayStyleChanged = false;
        dayState.fashionFridayMatchedFamily = -1;
        dayState.fireflyBeaconActive = false;
        dayState.fireflyBeaconExpires = null;
        
        // Handle day-specific elements
        if (isTuesday()) {
            createGrowthRitualButton();
        } else {
            removeGrowthRitualButton();
        }
        
        if (isSaturday()) {
            setTimeout(createSnailElement, 2000);
        } else {
            removeSnailElement();
        }
        
        // Notify player of the new day
        if (typeof spawnFloatingText === 'function') {
            const info = getDayInfo();
            spawnFloatingText(`${info.icon} ${info.name}`, info.color, 'info');
        }
    }

    function initDaySystem() {
        console.log('[DaySystem] Initializing day of week system...');
        
        // Load saved day state
        try {
            const saved = localStorage.getItem('pocketSprout_dayState');
            if (saved) {
                const parsed = JSON.parse(saved);
                Object.assign(dayState, parsed);
            }
        } catch (e) {
            console.warn('[DaySystem] Could not load day state', e);
        }
        
        // Check for day changes
        checkDayChange();
        
        // Setup day-specific elements
        if (isTuesday()) {
            createGrowthRitualButton();
        }
        
        if (isSaturday()) {
            setTimeout(createSnailElement, 3000);
        }
        
        // Check for day changes periodically
        setInterval(checkDayChange, 60000);
        
        // Save day state periodically
        setInterval(saveDayState, 30000);
        
        console.log('[DaySystem] Day system initialized. Today is ' + getDayName());
    }

    function saveDayState() {
        try {
            localStorage.setItem('pocketSprout_dayState', JSON.stringify(dayState));
        } catch (e) {
            console.warn('[DaySystem] Could not save day state', e);
        }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // EXPORT TO GLOBAL SCOPE
    // ═══════════════════════════════════════════════════════════════════════
    
    window.daySystem = {
        getCurrentDay,
        getDayInfo,
        getDayName,
        getDayIcon,
        getDayEffects,
        
        isSunDay,
        isMoonDay,
        isTuesday,
        isWednesday,
        isThursday,
        isFriday,
        isSaturday,
        
        getSunRecoveryMultiplier,
        getWaterDecayMultiplier,
        getSunDecayMultiplier,
        getLoveDecayMultiplier,
        getFertilizerDurationMultiplier,
        getFireflySpawnMultiplier,
        getPearlFireflyMultiplier,
        getFashionFridayBonusFamily,
        
        canPerformGrowthRitual,
        getRitualsRemaining,
        startGrowthRitual,
        completeGrowthRitual,
        
        getWisdomMessage,
        checkFashionFriday,
        
        shouldShowSnail,
        openSnailDialog,
        closeSnailDialog,
        
        DAYS_OF_WEEK,
        WISDOM_MESSAGES,
        dayState
    };
    
    // Expose close function globally for onclick
    window.closeSnailDialog = closeSnailDialog;

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => setTimeout(initDaySystem, 600));
    } else {
        setTimeout(initDaySystem, 600);
    }

})();

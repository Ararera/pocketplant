/**
 * Community Garden - A shared tree that grows with collective care
 * All Pocket Sprout players contribute to a single magnificent tree
 * Updated for Firebase v9+ Modular SDK (Static Import Version)
 */

let fs = null; // lazy-loaded Firestore module (avoids hard failure if CDN import is blocked)

const CommunityGarden = {
    isOpen: false,
    db: null,
    unsubscribe: null,
    contributionCooldowns: {
        water: 30 * 60 * 1000,
        sun: 30 * 60 * 1000,
        love: 15 * 60 * 1000,
        firefly: 0
    },
    
    // Tree grows through 8 distinct stages
    TREE_STAGES: [
        { name: 'Seed',           threshold: 0,       icon: '🌰', desc: 'A tiny seed, full of potential' },
        { name: 'Sprouting',      threshold: 500,     icon: '🌱', desc: 'The first green emerges from soil' },
        { name: 'Sapling',        threshold: 2500,    icon: '🌿', desc: 'Young and eager, reaching upward' },
        { name: 'Young Tree',     threshold: 8000,    icon: '🌳', desc: 'Taking root, finding strength' },
        { name: 'Growing Tree',   threshold: 20000,   icon: '🌲', desc: 'Branches spread wide and welcoming' },
        { name: 'Mature Tree',    threshold: 50000,   icon: '🌴', desc: 'A beacon for all who tend it' },
        { name: 'Ancient Tree',   threshold: 120000,  icon: '🎄', desc: 'Wisdom gathered through countless seasons' },
        { name: 'World Tree',     threshold: 300000,  icon: '✨', desc: 'A living legend, touched by all' }
    ],
    
    // Environment evolves with tree growth
    ENVIRONMENT_STAGES: [
        { minStage: 0, features: [] },
        { minStage: 1, features: ['grass'] },
        { minStage: 2, features: ['grass', 'flowers'] },
        { minStage: 3, features: ['grass', 'flowers', 'mushrooms'] },
        { minStage: 4, features: ['grass', 'flowers', 'mushrooms', 'birds'] },
        { minStage: 5, features: ['grass', 'flowers', 'mushrooms', 'birds', 'butterflies'] },
        { minStage: 6, features: ['grass', 'flowers', 'mushrooms', 'birds', 'butterflies', 'pond'] },
        { minStage: 7, features: ['grass', 'flowers', 'mushrooms', 'birds', 'butterflies', 'pond', 'aurora'] }
    ],
    
    // Local state mirrors Firestore
    treeState: {
        growth: 0,
        stage: 0,
        totalContributions: 0,
        waterLevel: 50,
        sunLevel: 50,
        loveLevel: 50,
        firefliesReleased: 0,
        recentActivity: [],
        lastReset: null
    },
    
    // Player's contribution tracking
    playerData: {
        username: null, // Generated silly name
        odometer: 0,
        lastWater: 0,
        lastSun: 0,
        lastLove: 0,
        firefliesGiven: 0
    },
    
    // ═══════════════════════════════════════════════════════════════════════
    // INITIALIZATION & STATE ACCESS
    // ═══════════════════════════════════════════════════════════════════════
    
    init() {
        this.loadPlayerData();
        
        // Generate a silly username if one doesn't exist
        if (!this.playerData.username) {
            this.playerData.username = this.generateUsername();
            this.savePlayerData();
            console.log('[CommunityGarden] Assigned new identity:', this.playerData.username);
        }

        this.createOverlay();
        this.bindEvents();
        console.log('[CommunityGarden] Module initialized');
    },

    generateUsername() {
        const adjectives = [
            'Happy', 'Sleepy', 'Bouncy', 'Cosmic', 'Fluffy', 'Green', 'Sunny', 
            'Misty', 'Quiet', 'Lucky', 'Wandering', 'Gentle', 'Wiggly', 'Cheery', 
            'Drowsy', 'Radiant', 'Dusty', 'Golden', 'Silver', 'Tiny', 'Giant'
        ];
        const nouns = [
            'Sprout', 'Leaf', 'Fern', 'Moss', 'Root', 'Seed', 'Bud', 'Bloom', 
            'Petal', 'Twig', 'Gardener', 'Spirit', 'Turnip', 'Potato', 'Radish', 
            'Tulip', 'Cactus', 'Vine', 'Sapling', 'Friend', 'Pal'
        ];
        
        const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
        const noun = nouns[Math.floor(Math.random() * nouns.length)];
        return `${adj} ${noun}`;
    },

    // Helper to access the global state object safely
    getGameState() {
        try {
            if (typeof state !== 'undefined') return state;
        } catch(e) {}
        if (typeof window.state !== 'undefined') return window.state;
        return null;
    },
    
    async initFirebase() {
        if (this.db) return true;
        
        // Lazy-load Firestore functions.
        if (!fs) {
            try {
                fs = await import('https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js');
            } catch (e) {
                console.warn('[CommunityGarden] Firestore module failed to load:', e);
                return false;
            }
        }

        // Check global instance from firebase-config.js
        if (window.db) {
            this.db = window.db;
            console.log('[CommunityGarden] Firebase connected via global instance');
            return true;
        }

        // Retry once after a short delay
        await new Promise(resolve => setTimeout(resolve, 500));
        if (window.db) {
            this.db = window.db;
            return true;
        }

        console.warn('[CommunityGarden] Firebase global instance (window.db) not found');
        return false;
    },
    
    // ═══════════════════════════════════════════════════════════════════════
    // OVERLAY CREATION
    // ═══════════════════════════════════════════════════════════════════════
    
    createOverlay() {
        const overlay = document.createElement('div');
        overlay.id = 'communityGardenOverlay';
        overlay.className = 'cg-overlay';
        overlay.innerHTML = `
            <div class="cg-container">
                <div class="cg-header">
                    <button class="cg-close" onclick="CommunityGarden.close()" aria-label="Close">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M18 6L6 18M6 6l12 12"/>
                        </svg>
                    </button>
                    <h1 class="cg-title">Community Garden</h1>
                    <p class="cg-subtitle">Tended by <span id="cgUsernameDisplay" style="color:#fbbf24; font-weight:600"></span> & friends</p>
                </div>
                
                <div class="cg-stage-display">
                    <div class="cg-stage-icon" id="cgStageIcon">🌰</div>
                    <div class="cg-stage-info">
                        <div class="cg-stage-name" id="cgStageName">Seed</div>
                        <div class="cg-stage-desc" id="cgStageDesc">A tiny seed, full of potential</div>
                    </div>
                </div>
                
                <div class="cg-tree-area" id="cgTreeArea">
                    <div class="cg-environment" id="cgEnvironment"></div>
                    <svg class="cg-tree-svg" id="cgTreeSVG" viewBox="0 0 300 400">
                        <defs>
                            <linearGradient id="cgTrunkGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" style="stop-color:#5D4037"/>
                                <stop offset="50%" style="stop-color:#795548"/>
                                <stop offset="100%" style="stop-color:#5D4037"/>
                            </linearGradient>
                            <radialGradient id="cgLeafGrad" cx="30%" cy="30%">
                                <stop offset="0%" style="stop-color:#81C784"/>
                                <stop offset="100%" style="stop-color:#388E3C"/>
                            </radialGradient>
                            <filter id="cgGlow">
                                <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                                <feMerge>
                                    <feMergeNode in="coloredBlur"/>
                                    <feMergeNode in="SourceGraphic"/>
                                </feMerge>
                            </filter>
                        </defs>
                        <g id="cgTreeGroup"></g>
                    </svg>
                    <div class="cg-fireflies-layer" id="cgFirefliesLayer"></div>
                </div>
                
                <div class="cg-progress-section">
                    <div class="cg-progress-header">
                        <span class="cg-progress-label">Growth Progress</span>
                        <span class="cg-progress-value" id="cgProgressValue">0 / 500</span>
                    </div>
                    <div class="cg-progress-bar">
                        <div class="cg-progress-fill" id="cgProgressFill"></div>
                        <div class="cg-progress-glow" id="cgProgressGlow"></div>
                    </div>
                    <div class="cg-next-stage" id="cgNextStage">Next: Sprouting</div>
                </div>
                
                <div class="cg-vitals">
                    <div class="cg-vital" data-type="water">
                        <div class="cg-vital-ring">
                            <svg viewBox="0 0 36 36">
                                <circle class="cg-ring-bg" cx="18" cy="18" r="15.5"/>
                                <circle class="cg-ring-fill" id="cgWaterRing" cx="18" cy="18" r="15.5"/>
                            </svg>
                            <span class="cg-vital-icon">💧</span>
                        </div>
                        <span class="cg-vital-label">Water</span>
                    </div>
                    <div class="cg-vital" data-type="sun">
                        <div class="cg-vital-ring">
                            <svg viewBox="0 0 36 36">
                                <circle class="cg-ring-bg" cx="18" cy="18" r="15.5"/>
                                <circle class="cg-ring-fill" id="cgSunRing" cx="18" cy="18" r="15.5"/>
                            </svg>
                            <span class="cg-vital-icon">☀️</span>
                        </div>
                        <span class="cg-vital-label">Sun</span>
                    </div>
                    <div class="cg-vital" data-type="love">
                        <div class="cg-vital-ring">
                            <svg viewBox="0 0 36 36">
                                <circle class="cg-ring-bg" cx="18" cy="18" r="15.5"/>
                                <circle class="cg-ring-fill" id="cgLoveRing" cx="18" cy="18" r="15.5"/>
                            </svg>
                            <span class="cg-vital-icon">❤️</span>
                        </div>
                        <span class="cg-vital-label">Love</span>
                    </div>
                </div>
                
                <div class="cg-actions">
                    <button class="cg-action-btn" id="cgBtnWater" onclick="CommunityGarden.contribute('water')">
                        <span class="cg-action-icon">💧</span>
                        <span class="cg-action-label">Water</span>
                        <span class="cg-action-cooldown" id="cgWaterCooldown"></span>
                    </button>
                    <button class="cg-action-btn" id="cgBtnSun" onclick="CommunityGarden.contribute('sun')">
                        <span class="cg-action-icon">☀️</span>
                        <span class="cg-action-label">Sunlight</span>
                        <span class="cg-action-cooldown" id="cgSunCooldown"></span>
                    </button>
                    <button class="cg-action-btn" id="cgBtnLove" onclick="CommunityGarden.contribute('love')">
                        <span class="cg-action-icon">❤️</span>
                        <span class="cg-action-label">Love</span>
                        <span class="cg-action-cooldown" id="cgLoveCooldown"></span>
                    </button>
                </div>
                
                <div class="cg-firefly-section">
                    <div class="cg-firefly-header">
                        <span>✨ Release Fireflies</span>
                        <span class="cg-firefly-count" id="cgFireflyAvailable">0 available</span>
                    </div>
                    <p class="cg-firefly-desc">Release your fireflies to accelerate the tree's growth. Each firefly adds lasting energy.</p>
                    <div class="cg-firefly-controls">
                        <button class="cg-firefly-btn" id="cgBtnRelease1" onclick="CommunityGarden.releaseFireflies(1)">
                            Release 1 <span class="cg-ff-cost">(+5 growth)</span>
                        </button>
                        <button class="cg-firefly-btn" id="cgBtnRelease5" onclick="CommunityGarden.releaseFireflies(5)">
                            Release 5 <span class="cg-ff-cost">(+30 growth)</span>
                        </button>
                        <button class="cg-firefly-btn cg-release-all" id="cgBtnReleaseAll" onclick="CommunityGarden.releaseFireflies('all')">
                            Release All
                        </button>
                    </div>
                </div>
                
                <div class="cg-activity-section">
                    <div class="cg-activity-header">
                        <span>🌍 Recent Activity</span>
                        <span class="cg-total-contributions" id="cgTotalContributions">0 contributions</span>
                    </div>
                    <div class="cg-activity-feed" id="cgActivityFeed">
                        <div class="cg-activity-empty">Waiting for gardeners...</div>
                    </div>
                </div>
                
                <div class="cg-stats-footer">
                    <div class="cg-stat">
                        <span class="cg-stat-value" id="cgYourContributions">0</span>
                        <span class="cg-stat-label">Your contributions</span>
                    </div>
                    <div class="cg-stat">
                        <span class="cg-stat-value" id="cgFirefliesGiven">0</span>
                        <span class="cg-stat-label">Fireflies given</span>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
    },
    
    // ═══════════════════════════════════════════════════════════════════════
    // OPEN / CLOSE
    // ═══════════════════════════════════════════════════════════════════════
    
    async open() {
        const overlay = document.getElementById('communityGardenOverlay');
        if (!overlay) return;

        this.isOpen = true;
        overlay.classList.add('open');

        const notice = document.getElementById('cgOfflineNotice');
        if (notice) notice.classList.remove('visible');
        
        // Show your silly username
        const usernameEl = document.getElementById('cgUsernameDisplay');
        if (usernameEl) usernameEl.textContent = this.playerData.username || 'You';

        // Render local state immediately
        this.renderFireflySection();
        this.renderPlayerStats();
        this.updateCooldownDisplays();
        this.render();

        // Connect to Firebase
        const connected = await this.initFirebase();

        if (connected) {
            this.subscribeToTree();
        } else {
            this.setOfflineMode('Offline - showing cached data');
            this.render();
        }

        this.updateCooldownDisplays();
        this.startCooldownTimer();

        if (typeof pushHistoryState === 'function') pushHistoryState();
    },
    
    close() {
        const overlay = document.getElementById('communityGardenOverlay');
        if (!overlay) return;
        
        this.isOpen = false;
        overlay.classList.remove('open');
        
        if (this.unsubscribe) {
            this.unsubscribe();
            this.unsubscribe = null;
        }
        
        if (this.cooldownTimer) {
            clearInterval(this.cooldownTimer);
            this.cooldownTimer = null;
        }
    },
    
    setOfflineMode(message = 'Offline - showing cached data') {
        const notice = document.getElementById('cgOfflineNotice');
        if (notice) {
            notice.querySelector('.cg-offline-text').textContent = message;
            notice.classList.add('visible');
            setTimeout(() => notice.classList.remove('visible'), 3000);
        }
    },
    
    // ═══════════════════════════════════════════════════════════════════════
    // FIREBASE SYNC
    // ═══════════════════════════════════════════════════════════════════════
    
    subscribeToTree() {
        if (!this.db) return;
        
        let initialLoadComplete = false;

        setTimeout(() => {
            if (!initialLoadComplete) {
                console.log('[CommunityGarden] Connection timed out, switching to offline view');
                this.setOfflineMode('Taking too long - Working Offline');
            }
        }, 4000);
        
        try {
            const treeRef = fs.doc(this.db, 'communityGarden', 'mainTree');
            
            this.unsubscribe = fs.onSnapshot(treeRef, (docSnap) => {
                initialLoadComplete = true;
                document.getElementById('cgOfflineNotice')?.classList.remove('visible');

                if (docSnap.exists()) {
                    const data = docSnap.data();
                    this.treeState = {
                        growth: data.growth || 0,
                        stage: this.calculateStage(data.growth || 0),
                        totalContributions: data.totalContributions || 0,
                        waterLevel: data.waterLevel || 50,
                        sunLevel: data.sunLevel || 50,
                        loveLevel: data.loveLevel || 50,
                        firefliesReleased: data.firefliesReleased || 0,
                        recentActivity: data.recentActivity || [],
                        lastReset: data.lastReset
                    };
                } else {
                    this.initializeTree();
                }
                this.render();
            }, (error) => {
                initialLoadComplete = true;
                console.error('[CommunityGarden] Snapshot error:', error);
                this.setOfflineMode('Connection Issue - Working Offline');
            });
        } catch (e) {
            console.error('[CommunityGarden] Critical setup error:', e);
            this.setOfflineMode('Connection Failed');
        }
    },
    
    async initializeTree() {
        if (!this.db) return;
        
        try {
            await fs.setDoc(fs.doc(this.db, 'communityGarden', 'mainTree'), {
                growth: 0,
                totalContributions: 0,
                waterLevel: 50,
                sunLevel: 50,
                loveLevel: 50,
                firefliesReleased: 0,
                recentActivity: [],
                createdAt: fs.serverTimestamp(),
                lastReset: null
            });
        } catch (e) {
            console.error('[CommunityGarden] Failed to initialize tree:', e);
        }
    },
    
    // ═══════════════════════════════════════════════════════════════════════
    // CONTRIBUTIONS
    // ═══════════════════════════════════════════════════════════════════════
    
    async contribute(type) {
        const cooldownKey = `last${type.charAt(0).toUpperCase() + type.slice(1)}`;
        const lastTime = this.playerData[cooldownKey] || 0;
        const cooldown = this.contributionCooldowns[type];
        
        if (Date.now() - lastTime < cooldown) {
            this.showFeedback('⏳ Please wait before contributing again', 'warning');
            return;
        }
        
        this.playerData[cooldownKey] = Date.now();
        this.playerData.odometer++;
        this.savePlayerData();
        this.playContributionAnimation(type);
        
        if (!this.db) {
            this.showFeedback('📡 Offline - contribution saved locally', 'info');
            return;
        }
        
        try {
            const treeRef = fs.doc(this.db, 'communityGarden', 'mainTree');
            const baseGrowth = 3;
            const vitalityBonus = this.treeState[`${type}Level`] < 30 ? 2 : 
                                  this.treeState[`${type}Level`] < 60 ? 1 : 0;
            
            // Use silly name instead of "A gardener"
            const contributorName = this.playerData.username || 'Mystery Sprout';
            
            const activityEntry = {
                type: type,
                plantName: contributorName,
                timestamp: Date.now(),
                amount: baseGrowth + vitalityBonus
            };
            
            await fs.updateDoc(treeRef, {
                growth: fs.increment(baseGrowth + vitalityBonus),
                totalContributions: fs.increment(1),
                [`${type}Level`]: fs.increment(8),
                recentActivity: fs.arrayUnion(activityEntry)
            });
            
            this.showFeedback(`✨ +${baseGrowth + vitalityBonus} growth contributed!`, 'success');
            
        } catch (e) {
            console.error('[CommunityGarden] Contribution failed:', e);
            this.showFeedback('Failed to sync - will retry', 'error');
        }
        
        this.updateCooldownDisplays();
    },
    
    // ═══════════════════════════════════════════════════════════════════════
    // FIREFLY RELEASE (FIXED SYNC LOGIC)
    // ═══════════════════════════════════════════════════════════════════════

    async releaseFireflies(amount) {
        const state = this.getGameState();
        
        if (!state || !state.fireflies) {
             this.showFeedback('🦋 Game state not ready', 'warning');
             return;
        }

        const families = state.fireflies;
        const familyKeys = Object.keys(families);
        
        let realTotal = 0;
        for (const id of familyKeys) {
            realTotal += (families[id] || 0);
        }

        if (state.totalFireflies !== realTotal) {
            console.log('[CommunityGarden] Syncing totalFireflies count...');
            state.totalFireflies = realTotal;
        }
        
        const available = realTotal;
        
        if (available === 0) {
            this.showFeedback('🦋 No fireflies to release', 'warning');
            return;
        }
        
        let toRelease = amount === 'all' ? available : Math.min(amount, available);
        
        if (toRelease <= 0) return;
        
        const growthGain = (toRelease * 5) + Math.floor(toRelease / 5);
        
        let remaining = toRelease;
        let passes = 0;
        const MAX_PASSES = 100;

        while (remaining > 0 && passes < MAX_PASSES) {
            let deductedThisPass = false;
            for (const fam of familyKeys) {
                if (remaining <= 0) break;
                if (families[fam] > 0) {
                    families[fam]--;
                    state.totalFireflies--;
                    remaining--;
                    deductedThisPass = true;
                }
            }
            if (!deductedThisPass) break; 
            passes++;
        }
        
        let finalCheck = 0;
        for (const id of familyKeys) finalCheck += (families[id] || 0);
        state.totalFireflies = finalCheck;

        if (typeof saveState === 'function') saveState();

        try {
            if (typeof updateUI === 'function') updateUI();
            if (typeof updateMenuStats === 'function') updateMenuStats();
            if (typeof renderFireflyLog === 'function') {
                const ffOverlay = document.getElementById('fireflyOverlay');
                if (ffOverlay && ffOverlay.classList.contains('open')) renderFireflyLog();
            }
        } catch (e) {
            console.warn('[CommunityGarden] UI update warning:', e);
        }
        
        this.renderFireflySection();
        
        this.playerData.firefliesGiven += toRelease;
        this.playerData.odometer += toRelease;
        this.savePlayerData();
        
        this.spawnFireflyBurst(toRelease);
        
        if (this.db) {
            try {
                const treeRef = fs.doc(this.db, 'communityGarden', 'mainTree');
                
                // Use silly name
                const contributorName = this.playerData.username || 'Mystery Sprout';

                const activityEntry = {
                    type: 'firefly',
                    plantName: contributorName,
                    timestamp: Date.now(),
                    amount: toRelease
                };
                
                await fs.updateDoc(treeRef, {
                    growth: fs.increment(growthGain),
                    totalContributions: fs.increment(toRelease),
                    firefliesReleased: fs.increment(toRelease),
                    recentActivity: fs.arrayUnion(activityEntry)
                });
                
                this.showFeedback(`✨ Released ${toRelease} fireflies! +${growthGain} growth`, 'success');
            } catch (e) {
                console.error('[CommunityGarden] Firefly release failed:', e);
            }
        }
        this.render();
    },
    
    // ═══════════════════════════════════════════════════════════════════════
    // RENDERING
    // ═══════════════════════════════════════════════════════════════════════
    
    render() {
        this.renderStageInfo();
        this.renderTree();
        this.renderProgress();
        this.renderVitals();
        this.renderActivityFeed();
        this.renderFireflySection();
        this.renderPlayerStats();
        this.renderEnvironment();
    },
    
    renderStageInfo() {
        const stage = this.TREE_STAGES[this.treeState.stage] || this.TREE_STAGES[0];
        const iconEl = document.getElementById('cgStageIcon');
        const nameEl = document.getElementById('cgStageName');
        const descEl = document.getElementById('cgStageDesc');
        if (iconEl) iconEl.textContent = stage.icon;
        if (nameEl) nameEl.textContent = stage.name;
        if (descEl) descEl.textContent = stage.desc;
    },
    
    renderProgress() {
        const currentStage = this.TREE_STAGES[this.treeState.stage];
        const nextStage = this.TREE_STAGES[this.treeState.stage + 1];
        
        const currentThreshold = currentStage?.threshold || 0;
        const nextThreshold = nextStage?.threshold || currentThreshold + 1000;
        
        const progress = this.treeState.growth - currentThreshold;
        const needed = nextThreshold - currentThreshold;
        const percent = Math.min(100, (progress / needed) * 100);
        
        const fillEl = document.getElementById('cgProgressFill');
        const glowEl = document.getElementById('cgProgressGlow');
        const valueEl = document.getElementById('cgProgressValue');
        const nextEl = document.getElementById('cgNextStage');
        
        if (fillEl) fillEl.style.width = percent + '%';
        if (glowEl) glowEl.style.width = percent + '%';
        if (valueEl) valueEl.textContent = `${Math.floor(this.treeState.growth)} / ${nextThreshold}`;
        if (nextEl) {
            if (nextStage) {
                nextEl.textContent = `Next: ${nextStage.name}`;
                nextEl.style.display = '';
            } else {
                nextEl.textContent = '🌟 Maximum growth achieved!';
            }
        }
    },
    
    renderVitals() {
        const circumference = 2 * Math.PI * 15.5;
        ['water', 'sun', 'love'].forEach(type => {
            const ring = document.getElementById(`cg${type.charAt(0).toUpperCase() + type.slice(1)}Ring`);
            if (ring) {
                const level = Math.max(0, Math.min(100, this.treeState[`${type}Level`] || 50));
                const offset = circumference - (level / 100) * circumference;
                ring.style.strokeDasharray = circumference;
                ring.style.strokeDashoffset = offset;
            }
        });
    },
    
    renderTree() {
        const group = document.getElementById('cgTreeGroup');
        if (!group) return;
        group.innerHTML = '';
        
        const stage = this.treeState.stage;
        const growth = this.treeState.growth;
        
        const ground = this.createSVGElement('ellipse');
        ground.setAttribute('cx', '150');
        ground.setAttribute('cy', '380');
        ground.setAttribute('rx', '100');
        ground.setAttribute('ry', '15');
        ground.setAttribute('fill', 'rgba(101, 67, 33, 0.3)');
        group.appendChild(ground);
        
        if (stage === 0) this.renderSeed(group, growth);
        else if (stage === 1) this.renderSprout(group, growth);
        else if (stage === 2) this.renderSapling(group, growth);
        else this.renderFullTree(group, stage, growth);
    },
    
    renderSeed(group, growth) {
        const progress = growth / this.TREE_STAGES[1].threshold;
        const seed = this.createSVGElement('ellipse');
        seed.setAttribute('cx', '150');
        seed.setAttribute('cy', '365');
        seed.setAttribute('rx', String(8 + progress * 4));
        seed.setAttribute('ry', String(6 + progress * 3));
        seed.setAttribute('fill', '#8B4513');
        group.appendChild(seed);
        
        const highlight = this.createSVGElement('ellipse');
        highlight.setAttribute('cx', '147');
        highlight.setAttribute('cy', '362');
        highlight.setAttribute('rx', '3');
        highlight.setAttribute('ry', '2');
        highlight.setAttribute('fill', 'rgba(255,255,255,0.2)');
        group.appendChild(highlight);
        
        if (progress > 0.6) {
            const crack = this.createSVGElement('path');
            crack.setAttribute('d', `M150 ${365 - progress * 8} Q148 ${360 - progress * 10} 150 ${355 - progress * 12}`);
            crack.setAttribute('stroke', '#4CAF50');
            crack.setAttribute('stroke-width', '2');
            crack.setAttribute('fill', 'none');
            crack.setAttribute('opacity', String((progress - 0.6) * 2.5));
            group.appendChild(crack);
        }
    },
    
    renderSprout(group, growth) {
        const progress = (growth - this.TREE_STAGES[1].threshold) / 
                        (this.TREE_STAGES[2].threshold - this.TREE_STAGES[1].threshold);
        const stemHeight = 40 + progress * 60;
        const stem = this.createSVGElement('path');
        stem.setAttribute('d', `M150 375 Q${148 + Math.sin(progress * 3) * 5} ${375 - stemHeight/2} 150 ${375 - stemHeight}`);
        stem.setAttribute('stroke', '#558B2F');
        stem.setAttribute('stroke-width', String(3 + progress));
        stem.setAttribute('fill', 'none');
        stem.setAttribute('stroke-linecap', 'round');
        group.appendChild(stem);
        
        const leafSize = 10 + progress * 15;
        const topY = 375 - stemHeight;
        
        const leaf1 = this.createSVGElement('path');
        leaf1.setAttribute('d', `M150 ${topY + 10} Q${150 - leafSize} ${topY} ${150 - leafSize * 0.7} ${topY + leafSize * 0.5}`);
        leaf1.setAttribute('fill', '#81C784');
        leaf1.setAttribute('stroke', '#558B2F');
        leaf1.setAttribute('stroke-width', '1');
        group.appendChild(leaf1);
        
        const leaf2 = this.createSVGElement('path');
        leaf2.setAttribute('d', `M150 ${topY + 10} Q${150 + leafSize} ${topY} ${150 + leafSize * 0.7} ${topY + leafSize * 0.5}`);
        leaf2.setAttribute('fill', '#81C784');
        leaf2.setAttribute('stroke', '#558B2F');
        leaf2.setAttribute('stroke-width', '1');
        group.appendChild(leaf2);
    },
    
    renderSapling(group, growth) {
        const progress = (growth - this.TREE_STAGES[2].threshold) / 
                        (this.TREE_STAGES[3].threshold - this.TREE_STAGES[2].threshold);
        const trunkHeight = 80 + progress * 40;
        const trunkWidth = 6 + progress * 4;
        
        const trunk = this.createSVGElement('path');
        trunk.setAttribute('d', `M${150 - trunkWidth/2} 375 L${150 - trunkWidth/3} ${375 - trunkHeight} L${150 + trunkWidth/3} ${375 - trunkHeight} L${150 + trunkWidth/2} 375 Z`);
        trunk.setAttribute('fill', 'url(#cgTrunkGrad)');
        group.appendChild(trunk);
        
        const branchCount = 3 + Math.floor(progress * 3);
        for (let i = 0; i < branchCount; i++) {
            const t = 0.3 + (i / branchCount) * 0.6;
            const y = 375 - trunkHeight * t;
            const side = i % 2 === 0 ? -1 : 1;
            const len = 20 + progress * 15 + Math.random() * 10;
            
            const branch = this.createSVGElement('path');
            branch.setAttribute('d', `M150 ${y} Q${150 + side * len * 0.5} ${y - 10} ${150 + side * len} ${y - 5}`);
            branch.setAttribute('stroke', '#5D4037');
            branch.setAttribute('stroke-width', '3');
            branch.setAttribute('fill', 'none');
            branch.setAttribute('stroke-linecap', 'round');
            group.appendChild(branch);
            
            this.renderLeafCluster(group, 150 + side * len, y - 5, 12 + progress * 8);
        }
        this.renderLeafCluster(group, 150, 375 - trunkHeight - 10, 20 + progress * 15);
    },
    
    renderFullTree(group, stage, growth) {
        const stageProgress = Math.min(1, (stage - 3) / 4);
        const trunkHeight = 120 + stageProgress * 80;
        const trunkBaseWidth = 15 + stageProgress * 20;
        const trunkTopWidth = 8 + stageProgress * 8;
        
        if (stage >= 4) this.renderRoots(group, stageProgress);
        
        const trunk = this.createSVGElement('path');
        trunk.setAttribute('d', `
            M${150 - trunkBaseWidth} 375 
            Q${150 - trunkBaseWidth * 0.8} ${375 - trunkHeight * 0.3} ${150 - trunkTopWidth} ${375 - trunkHeight}
            L${150 + trunkTopWidth} ${375 - trunkHeight}
            Q${150 + trunkBaseWidth * 0.8} ${375 - trunkHeight * 0.3} ${150 + trunkBaseWidth} 375
            Z
        `);
        trunk.setAttribute('fill', 'url(#cgTrunkGrad)');
        group.appendChild(trunk);
        
        this.renderTrunkTexture(group, trunkHeight, trunkBaseWidth, stageProgress);
        
        const branchLevels = 3 + Math.floor(stageProgress * 3);
        for (let level = 0; level < branchLevels; level++) {
            const t = 0.4 + (level / branchLevels) * 0.5;
            const y = 375 - trunkHeight * t;
            this.renderBranch(group, 150, y, -1, stageProgress, level);
            this.renderBranch(group, 150, y, 1, stageProgress, level);
        }
        
        this.renderCanopy(group, 150, 375 - trunkHeight, stage, stageProgress);
        
        if (stage >= 6) this.renderMagicEffects(group, stage);
    },
    
    renderRoots(group, progress) {
        const rootCount = 3 + Math.floor(progress * 3);
        for (let i = 0; i < rootCount; i++) {
            const angle = -30 + (i / (rootCount - 1)) * 60;
            const len = 30 + progress * 30 + Math.random() * 20;
            const rad = angle * Math.PI / 180;
            
            const root = this.createSVGElement('path');
            root.setAttribute('d', `
                M150 375 
                Q${150 + Math.sin(rad) * len * 0.5} ${380 + Math.cos(rad) * len * 0.3} 
                ${150 + Math.sin(rad) * len} ${380 + Math.abs(Math.cos(rad)) * len * 0.4}
            `);
            root.setAttribute('stroke', '#5D4037');
            root.setAttribute('stroke-width', String(4 + progress * 2));
            root.setAttribute('fill', 'none');
            root.setAttribute('stroke-linecap', 'round');
            root.setAttribute('opacity', '0.7');
            group.appendChild(root);
        }
    },
    
    renderTrunkTexture(group, height, width, progress) {
        const lineCount = 5 + Math.floor(progress * 5);
        for (let i = 0; i < lineCount; i++) {
            const y = 375 - (i / lineCount) * height * 0.9;
            const xOffset = (Math.random() - 0.5) * width * 0.5;
            
            const line = this.createSVGElement('path');
            line.setAttribute('d', `M${148 + xOffset} ${y} Q${150 + xOffset} ${y - 5} ${152 + xOffset} ${y - 2}`);
            line.setAttribute('stroke', 'rgba(0,0,0,0.15)');
            line.setAttribute('stroke-width', '1.5');
            line.setAttribute('fill', 'none');
            group.appendChild(line);
        }
    },
    
    renderBranch(group, x, y, side, progress, level) {
        const baseLen = 35 + progress * 25;
        const len = baseLen - level * 5;
        const thickness = 4 + progress * 2 - level * 0.5;
        
        const endX = x + side * len;
        const endY = y - 15 - Math.random() * 10;
        const ctrlX = x + side * len * 0.6;
        const ctrlY = y - 8;
        
        const branch = this.createSVGElement('path');
        branch.setAttribute('d', `M${x} ${y} Q${ctrlX} ${ctrlY} ${endX} ${endY}`);
        branch.setAttribute('stroke', '#5D4037');
        branch.setAttribute('stroke-width', String(thickness));
        branch.setAttribute('fill', 'none');
        branch.setAttribute('stroke-linecap', 'round');
        group.appendChild(branch);
        
        this.renderLeafCluster(group, endX, endY, 15 + progress * 10);
    },
    
    renderLeafCluster(group, x, y, size) {
        const leafCount = 5 + Math.floor(Math.random() * 4);
        for (let i = 0; i < leafCount; i++) {
            const angle = (i / leafCount) * Math.PI * 2;
            const dist = size * 0.4 + Math.random() * size * 0.3;
            const lx = x + Math.cos(angle) * dist;
            const ly = y + Math.sin(angle) * dist * 0.6 - size * 0.2;
            const lsize = size * 0.4 + Math.random() * size * 0.3;
            
            const leaf = this.createSVGElement('ellipse');
            leaf.setAttribute('cx', String(lx));
            leaf.setAttribute('cy', String(ly));
            leaf.setAttribute('rx', String(lsize));
            leaf.setAttribute('ry', String(lsize * 0.7));
            leaf.setAttribute('fill', 'url(#cgLeafGrad)');
            leaf.setAttribute('opacity', String(0.8 + Math.random() * 0.2));
            group.appendChild(leaf);
        }
    },
    
    renderCanopy(group, x, y, stage, progress) {
        const layers = 2 + Math.floor(progress * 2);
        const baseSize = 50 + progress * 40;
        
        for (let layer = layers - 1; layer >= 0; layer--) {
            const layerSize = baseSize - layer * 15;
            const layerY = y - layer * 20;
            const opacity = 0.7 + layer * 0.1;
            
            const canopy = this.createSVGElement('ellipse');
            canopy.setAttribute('cx', String(x));
            canopy.setAttribute('cy', String(layerY));
            canopy.setAttribute('rx', String(layerSize));
            canopy.setAttribute('ry', String(layerSize * 0.6));
            canopy.setAttribute('fill', `hsl(${100 + layer * 10}, ${50 + progress * 20}%, ${35 + layer * 8}%)`);
            canopy.setAttribute('opacity', String(opacity));
            group.appendChild(canopy);
        }
        
        const highlight = this.createSVGElement('ellipse');
        highlight.setAttribute('cx', String(x - 10));
        highlight.setAttribute('cy', String(y - layers * 20 - 10));
        highlight.setAttribute('rx', String(baseSize * 0.4));
        highlight.setAttribute('ry', String(baseSize * 0.25));
        highlight.setAttribute('fill', 'rgba(255,255,255,0.15)');
        group.appendChild(highlight);
    },
    
    renderMagicEffects(group, stage) {
        const particleCount = stage >= 7 ? 12 : 6;
        for (let i = 0; i < particleCount; i++) {
            const x = 80 + Math.random() * 140;
            const y = 150 + Math.random() * 180;
            const size = 2 + Math.random() * 3;
            
            const particle = this.createSVGElement('circle');
            particle.setAttribute('cx', String(x));
            particle.setAttribute('cy', String(y));
            particle.setAttribute('r', String(size));
            particle.setAttribute('fill', stage >= 7 ? '#FFD700' : '#90EE90');
            particle.setAttribute('filter', 'url(#cgGlow)');
            particle.setAttribute('opacity', '0.6');
            particle.innerHTML = `
                <animate attributeName="opacity" values="0.3;0.8;0.3" dur="${2 + Math.random() * 2}s" repeatCount="indefinite"/>
                <animate attributeName="cy" values="${y};${y - 10};${y}" dur="${3 + Math.random() * 2}s" repeatCount="indefinite"/>
            `;
            group.appendChild(particle);
        }
    },
    
    renderEnvironment() {
        const envContainer = document.getElementById('cgEnvironment');
        if (!envContainer) return;
        
        const stage = this.treeState.stage;
        const envStage = this.ENVIRONMENT_STAGES.find(e => e.minStage <= stage) || this.ENVIRONMENT_STAGES[0];
        
        const currentFeatures = envContainer.dataset.features || '';
        const newFeatures = envStage.features.join(',');
        if (currentFeatures === newFeatures) return;
        
        envContainer.dataset.features = newFeatures;
        envContainer.innerHTML = '';
        
        if (envStage.features.includes('grass')) {
            for (let i = 0; i < 20; i++) {
                const grass = document.createElement('div');
                grass.className = 'cg-grass';
                grass.style.left = `${Math.random() * 100}%`;
                grass.style.bottom = `${5 + Math.random() * 10}%`;
                grass.style.animationDelay = `${Math.random() * 2}s`;
                envContainer.appendChild(grass);
            }
        }
        
        if (envStage.features.includes('flowers')) {
            const flowerEmojis = ['🌸', '🌼', '🌺', '🌻', '💐'];
            for (let i = 0; i < 8; i++) {
                const flower = document.createElement('div');
                flower.className = 'cg-flower';
                flower.textContent = flowerEmojis[Math.floor(Math.random() * flowerEmojis.length)];
                flower.style.left = `${10 + Math.random() * 80}%`;
                flower.style.bottom = `${8 + Math.random() * 15}%`;
                flower.style.animationDelay = `${Math.random() * 3}s`;
                envContainer.appendChild(flower);
            }
        }
        
        if (envStage.features.includes('mushrooms')) {
            for (let i = 0; i < 4; i++) {
                const mushroom = document.createElement('div');
                mushroom.className = 'cg-mushroom';
                mushroom.textContent = '🍄';
                mushroom.style.left = `${5 + Math.random() * 25}%`;
                mushroom.style.bottom = `${5 + Math.random() * 8}%`;
                envContainer.appendChild(mushroom);
            }
        }
        
        if (envStage.features.includes('birds')) {
            for (let i = 0; i < 3; i++) {
                const bird = document.createElement('div');
                bird.className = 'cg-bird';
                bird.textContent = '🐦';
                bird.style.left = `${Math.random() * 100}%`;
                bird.style.top = `${10 + Math.random() * 30}%`;
                bird.style.animationDelay = `${i * 3}s`;
                bird.style.animationDuration = `${8 + Math.random() * 4}s`;
                envContainer.appendChild(bird);
            }
        }
        
        if (envStage.features.includes('butterflies')) {
            const butterflyEmojis = ['🦋', '🦋', '🦋'];
            for (let i = 0; i < 5; i++) {
                const butterfly = document.createElement('div');
                butterfly.className = 'cg-butterfly';
                butterfly.textContent = butterflyEmojis[Math.floor(Math.random() * butterflyEmojis.length)];
                butterfly.style.animationDelay = `${Math.random() * 5}s`;
                butterfly.style.animationDuration = `${6 + Math.random() * 4}s`;
                envContainer.appendChild(butterfly);
            }
        }
        
        if (envStage.features.includes('pond')) {
            const pond = document.createElement('div');
            pond.className = 'cg-pond';
            envContainer.appendChild(pond);
        }
        
        if (envStage.features.includes('aurora')) {
            const aurora = document.createElement('div');
            aurora.className = 'cg-aurora';
            envContainer.appendChild(aurora);
        }
    },
    
    renderActivityFeed() {
        const feed = document.getElementById('cgActivityFeed');
        const totalEl = document.getElementById('cgTotalContributions');
        
        if (totalEl) {
            totalEl.textContent = `${this.treeState.totalContributions.toLocaleString()} contributions`;
        }
        
        if (!feed) return;
        
        const activity = this.treeState.recentActivity || [];
        
        if (activity.length === 0) {
            feed.innerHTML = '<div class="cg-activity-empty">Waiting for gardeners...</div>';
            return;
        }
        
        // Show last 10 entries
        const recent = [...activity].reverse().slice(0, 10);
        
        feed.innerHTML = recent.map(entry => {
            const icon = entry.type === 'water' ? '💧' :
                        entry.type === 'sun' ? '☀️' :
                        entry.type === 'love' ? '❤️' :
                        entry.type === 'firefly' ? '✨' : '🌱';
            
            const action = entry.type === 'firefly' 
                ? `released ${entry.amount} fireflies`
                : `gave ${entry.type}`;
            
            const timeAgo = this.formatTimeAgo(entry.timestamp);
            
            return `
                <div class="cg-activity-item">
                    <span class="cg-activity-icon">${icon}</span>
                    <span class="cg-activity-text"><strong>${this.escapeHtml(entry.plantName)}</strong> ${action}</span>
                    <span class="cg-activity-time">${timeAgo}</span>
                </div>
            `;
        }).join('');
    },
    
    renderFireflySection() {
        const state = this.getGameState();
        
        // FIX: Calculate 'available' directly from families to be safe
        let available = 0;
        if (state && state.fireflies) {
            const families = state.fireflies;
            Object.keys(families).forEach(k => available += (families[k] || 0));
        }
        
        const countEl = document.getElementById('cgFireflyAvailable');
        const btn1 = document.getElementById('cgBtnRelease1');
        const btn5 = document.getElementById('cgBtnRelease5');
        const btnAll = document.getElementById('cgBtnReleaseAll');
        
        if (countEl) countEl.textContent = `${available} available`;
        if (btn1) btn1.disabled = available < 1;
        if (btn5) btn5.disabled = available < 5;
        if (btnAll) {
            btnAll.disabled = available < 1;
            if (available > 0) {
                const totalGain = (available * 5) + Math.floor(available / 5);
                btnAll.innerHTML = `Release All <span class="cg-ff-cost">(+${totalGain} growth)</span>`;
            } else {
                btnAll.innerHTML = `Release All`;
            }
        }
    },
    
    renderPlayerStats() {
        const contribEl = document.getElementById('cgYourContributions');
        const firefliesEl = document.getElementById('cgFirefliesGiven');
        if (contribEl) contribEl.textContent = this.playerData.odometer.toLocaleString();
        if (firefliesEl) firefliesEl.textContent = this.playerData.firefliesGiven.toLocaleString();
    },
    
    // ═══════════════════════════════════════════════════════════════════════
    // COOLDOWNS
    // ═══════════════════════════════════════════════════════════════════════
    
    updateCooldownDisplays() {
        ['water', 'sun', 'love'].forEach(type => {
            const cooldownKey = `last${type.charAt(0).toUpperCase() + type.slice(1)}`;
            const lastTime = this.playerData[cooldownKey] || 0;
            const cooldown = this.contributionCooldowns[type];
            const remaining = Math.max(0, cooldown - (Date.now() - lastTime));
            
            const btn = document.getElementById(`cgBtn${type.charAt(0).toUpperCase() + type.slice(1)}`);
            const cooldownEl = document.getElementById(`cg${type.charAt(0).toUpperCase() + type.slice(1)}Cooldown`);
            
            if (btn) {
                btn.disabled = remaining > 0;
                btn.classList.toggle('on-cooldown', remaining > 0);
            }
            
            if (cooldownEl) {
                if (remaining > 0) {
                    cooldownEl.textContent = this.formatCooldown(remaining);
                    cooldownEl.style.display = '';
                } else {
                    cooldownEl.style.display = 'none';
                }
            }
        });
    },
    
    startCooldownTimer() {
        if (this.cooldownTimer) clearInterval(this.cooldownTimer);
        this.cooldownTimer = setInterval(() => {
            if (this.isOpen) {
                this.updateCooldownDisplays();
            }
        }, 1000);
    },
    
    formatCooldown(ms) {
        const minutes = Math.floor(ms / 60000);
        const seconds = Math.floor((ms % 60000) / 1000);
        return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
    },
    
    // ═══════════════════════════════════════════════════════════════════════
    // VISUAL EFFECTS
    // ═══════════════════════════════════════════════════════════════════════
    
    playContributionAnimation(type) {
        const treeArea = document.getElementById('cgTreeArea');
        if (!treeArea) return;
        
        const icon = type === 'water' ? '💧' : type === 'sun' ? '☀️' : '❤️';
        const color = type === 'water' ? '#60a5fa' : type === 'sun' ? '#fbbf24' : '#f472b6';
        
        for (let i = 0; i < 8; i++) {
            const particle = document.createElement('div');
            particle.className = 'cg-contribution-particle';
            particle.textContent = icon;
            particle.style.setProperty('--particle-color', color);
            particle.style.setProperty('--particle-angle', `${(i / 8) * 360}deg`);
            particle.style.setProperty('--particle-delay', `${i * 0.05}s`);
            treeArea.appendChild(particle);
            setTimeout(() => particle.remove(), 1500);
        }
        
        const treeSvg = document.getElementById('cgTreeSVG');
        if (treeSvg) {
            treeSvg.classList.add('cg-tree-pulse');
            setTimeout(() => treeSvg.classList.remove('cg-tree-pulse'), 500);
        }
    },
    
    spawnFireflyBurst(count) {
        const layer = document.getElementById('cgFirefliesLayer');
        if (!layer) return;
        const actualCount = Math.min(count, 20);
        for (let i = 0; i < actualCount; i++) {
            setTimeout(() => {
                const firefly = document.createElement('div');
                firefly.className = 'cg-released-firefly';
                firefly.style.setProperty('--ff-hue', `${Math.random() * 60 + 30}`);
                firefly.style.left = `${40 + Math.random() * 20}%`;
                firefly.style.bottom = '20%';
                layer.appendChild(firefly);
                setTimeout(() => firefly.remove(), 3000);
            }, i * 100);
        }
    },
    
    showFeedback(message, type = 'info') {
        const existing = document.querySelector('.cg-toast');
        if (existing) existing.remove();
        
        const toast = document.createElement('div');
        toast.className = `cg-toast cg-toast-${type}`;
        toast.textContent = message;
        document.getElementById('communityGardenOverlay')?.appendChild(toast);
        
        setTimeout(() => toast.classList.add('visible'), 10);
        setTimeout(() => {
            toast.classList.remove('visible');
            setTimeout(() => toast.remove(), 300);
        }, 2500);
    },
    
    // ═══════════════════════════════════════════════════════════════════════
    // UTILITIES
    // ═══════════════════════════════════════════════════════════════════════
    
    calculateStage(growth) {
        for (let i = this.TREE_STAGES.length - 1; i >= 0; i--) {
            if (growth >= this.TREE_STAGES[i].threshold) return i;
        }
        return 0;
    },
    
    formatTimeAgo(timestamp) {
        const diff = Date.now() - timestamp;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);
        if (days > 0) return `${days}d ago`;
        if (hours > 0) return `${hours}h ago`;
        if (minutes > 0) return `${minutes}m ago`;
        return 'just now';
    },
    
    escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    },
    
    createSVGElement(tag) {
        return document.createElementNS('http://www.w3.org/2000/svg', tag);
    },
    
    // ═══════════════════════════════════════════════════════════════════════
    // PERSISTENCE
    // ═══════════════════════════════════════════════════════════════════════
    
    loadPlayerData() {
        try {
            const saved = localStorage.getItem('pocketSprout_communityGarden');
            if (saved) {
                this.playerData = { ...this.playerData, ...JSON.parse(saved) };
            }
        } catch (e) {
            console.warn('[CommunityGarden] Failed to load player data:', e);
        }
    },
    
    savePlayerData() {
        try {
            localStorage.setItem('pocketSprout_communityGarden', JSON.stringify(this.playerData));
        } catch (e) {
            console.warn('[CommunityGarden] Failed to save player data:', e);
        }
    },
    
    // ═══════════════════════════════════════════════════════════════════════
    // EVENT BINDING
    // ═══════════════════════════════════════════════════════════════════════
    
    bindEvents() {
        window.addEventListener('popstate', () => {
            if (this.isOpen) this.close();
        });
        document.getElementById('communityGardenOverlay')?.addEventListener('click', (e) => {
            if (e.target.classList.contains('cg-overlay')) this.close();
        });
    }
};

// Expose to window immediately for HTML onclick handlers
window.CommunityGarden = CommunityGarden;
window.openCommunityGarden = () => CommunityGarden.open();
window.closeCommunityGarden = () => CommunityGarden.close();

// Auto-initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => CommunityGarden.init());
} else {
    CommunityGarden.init();
}
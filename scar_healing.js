/**
 * Scar Healing System for Pocket Sprout
 * * Healing rituals that remove scars through contemplative mini-games.
 * Uses a shadow-container observation strategy to remain interactive 
 * even when the main game logic overwrites the scar list text.
 */

(function() {
    'use strict';

    // ═══════════════════════════════════════════════════════════════════════
    // HEALING STATE
    // ═══════════════════════════════════════════════════════════════════════
    
    const healingState = {
        activeHealing: null,      // Current scar being healed
        overlay: null,            // DOM overlay element
        canvas: null,             // Canvas for interactions
        ctx: null,                // Canvas context
        animationId: null,        // Animation frame ID
        audioCtx: null,           // Audio context
        progress: 0,              // Healing progress (0-100)
        phase: 'intro',           // intro, active, success, fail
        particles: [],            // Visual particles
        touchData: {},            // Touch/mouse tracking
        gameData: {},             // Mini-game specific data
        lastFrameTime: 0
    };

    // ═══════════════════════════════════════════════════════════════════════
    // SCAR DEFINITIONS
    // ═══════════════════════════════════════════════════════════════════════
    
    const SCAR_HEALINGS = {
        wilt: {
            name: 'Wilted',
            color: '#60a5fa',
            accentColor: '#93c5fd',
            bgGradient: ['#0c1929', '#1e3a5f'],
            description: 'The leaves remember thirst',
            healingType: 'misting',
            duration: 45000,
            initGame: initMistingGame,
            updateGame: updateMistingGame,
            renderGame: renderMistingGame
        },
        bend: {
            name: 'Bent',
            color: '#fbbf24',
            accentColor: '#fcd34d',
            bgGradient: ['#1a1708', '#3d320f'],
            description: 'The stem seeks balance',
            healingType: 'guiding',
            duration: 50000,
            initGame: initGuidingGame,
            updateGame: updateGuidingGame,
            renderGame: renderGuidingGame
        },
        pale: {
            name: 'Faded',
            color: '#a78bfa',
            accentColor: '#c4b5fd',
            bgGradient: ['#1a1520', '#2d1f3d'],
            description: 'Colors dream of return',
            healingType: 'color',
            duration: 40000,
            initGame: initColorGame,
            updateGame: updateColorGame,
            renderGame: renderColorGame
        },
        dormant: {
            name: 'Dormant',
            color: '#94a3b8',
            accentColor: '#cbd5e1',
            bgGradient: ['#0f1419', '#1e2631'],
            description: 'Deep within, life waits',
            healingType: 'whisper',
            duration: 55000,
            initGame: initWhisperGame,
            updateGame: updateWhisperGame,
            renderGame: renderWhisperGame
        }
    };

    // ═══════════════════════════════════════════════════════════════════════
    // CORE SYSTEM & OBSERVATION LOGIC
    // ═══════════════════════════════════════════════════════════════════════
    
    function initHealingSystem() {
        console.log('[ScarHealing] Initializing healing system...');
        createHealingOverlay();
        setupScarObserver();
    }

    /**
     * Sets up a robust observer that creates a "Shadow Container" for interactive buttons.
     * This decouples the display from the game logic that continually overwrites the text.
     */
    function setupScarObserver() {
        const checkForElement = () => {
            const originalList = document.getElementById('menuScarList');
            
            // If main game not loaded yet, retry
            if (!originalList) {
                setTimeout(checkForElement, 200);
                return;
            }

            console.log('[ScarHealing] Scar list found. Setting up observer.');

            // Create our Shadow Container if it doesn't exist
            let shadowList = document.getElementById('menuScarListInteractive');
            if (!shadowList) {
                shadowList = document.createElement('div'); // Div for flex behavior
                shadowList.id = 'menuScarListInteractive';
                shadowList.className = 'interactive-scar-container';
                
                // Insert immediately after the original list
                if (originalList.nextSibling) {
                    originalList.parentNode.insertBefore(shadowList, originalList.nextSibling);
                } else {
                    originalList.parentNode.appendChild(shadowList);
                }
                
                // Visually hide the original list, but keep it in DOM so game logic 
                // can write to it without errors.
                originalList.style.display = 'none';
            }

            // Function to sync the text from original list to our buttons
            const syncScars = () => {
                const text = originalList.textContent || '';
                
                // Optimization: Don't re-render if text hasn't changed
                if (shadowList.dataset.lastText === text) return;
                shadowList.dataset.lastText = text;

                // Clear current buttons
                shadowList.innerHTML = '';
                
                // Identify scars from text
                const scarIds = inferScarIdsFromText(text);
                
                if (scarIds.length > 0) {
                    scarIds.forEach(scarId => {
                        const info = SCAR_HEALINGS[scarId];
                        if (info) {
                            const btn = document.createElement('button');
                            btn.className = 'scar-item interactive';
                            btn.textContent = info.name;
                            btn.dataset.scar = scarId;
                            // Direct click binding is more reliable for dynamically created elements
                            btn.onclick = (e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                beginHealing(scarId);
                            };
                            shadowList.appendChild(btn);
                        }
                    });
                }
            };

            // Watch for changes to the original list's text
            const observer = new MutationObserver((mutations) => {
                syncScars();
            });
            
            observer.observe(originalList, { 
                childList: true, 
                characterData: true, 
                subtree: true 
            });
            
            // Also watch the parent to see if the whole section gets hidden/shown
            const parent = document.getElementById('menuScars');
            if (parent) {
                const parentObserver = new MutationObserver(() => {
                    // Ensure our logic runs when the menu becomes visible
                    if (parent.style.display !== 'none') {
                        syncScars();
                    }
                });
                parentObserver.observe(parent, { attributes: true, attributeFilter: ['style', 'class'] });
            }

            // Initial sync
            syncScars();
        };

        checkForElement();
    }

    function inferScarIdsFromText(text) {
        const t = (text || '').trim();
        if (!t) return [];
        
        // Build map of Name -> ID (e.g., "Wilted" -> "wilt")
        const nameToId = {};
        Object.entries(SCAR_HEALINGS).forEach(([id, info]) => {
            nameToId[info.name.toLowerCase()] = id;
        });

        // Split text by commas and map to IDs
        const parts = t.split(/,|&/).map(s => s.trim().toLowerCase());
        const ids = [];
        
        parts.forEach(p => {
            // Check exact match or partial match
            for (const [name, id] of Object.entries(nameToId)) {
                if (p.includes(name) || name.includes(p)) {
                    ids.push(id);
                    break; 
                }
            }
        });
        
        // Deduplicate
        return [...new Set(ids)];
    }

    // ═══════════════════════════════════════════════════════════════════════
    // UI SETUP
    // ═══════════════════════════════════════════════════════════════════════

    function createHealingOverlay() {
        if (document.getElementById('healingOverlay')) return;
        
        const overlay = document.createElement('div');
        overlay.id = 'healingOverlay';
        overlay.className = 'healing-overlay';
        overlay.innerHTML = `
            <div class="healing-backdrop"></div>
            <canvas id="healingCanvas"></canvas>
            <div class="healing-ui">
                <div class="healing-progress-ring">
                    <svg viewBox="0 0 100 100">
                        <circle class="progress-track" cx="50" cy="50" r="45"/>
                        <circle class="progress-fill" cx="50" cy="50" r="45" id="healingProgressRing"/>
                    </svg>
                    <div class="healing-icon" id="healingIcon"></div>
                </div>
                <div class="healing-whisper" id="healingWhisper"></div>
            </div>
            <button class="healing-close" id="healingClose" aria-label="Close">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
            </button>
            <div class="healing-success" id="healingSuccess">
                <div class="success-burst"></div>
                <div class="success-text">Released</div>
            </div>
        `;
        
        document.body.appendChild(overlay);
        healingState.overlay = overlay;
        
        // Setup canvas
        healingState.canvas = document.getElementById('healingCanvas');
        healingState.ctx = healingState.canvas.getContext('2d');
        
        // Close button
        document.getElementById('healingClose').addEventListener('click', cancelHealing);
        
        // Resize handler
        window.addEventListener('resize', resizeCanvas);
    }

    function resizeCanvas() {
        if (!healingState.canvas) return;
        healingState.canvas.width = window.innerWidth;
        healingState.canvas.height = window.innerHeight;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // HEALING FLOW
    // ═══════════════════════════════════════════════════════════════════════
    
    function beginHealing(scarId) {
        const scarInfo = SCAR_HEALINGS[scarId];
        if (!scarInfo) return;
        
        console.log('[ScarHealing] Beginning ritual for:', scarId);

        // Close menu
        const menuOverlay = document.getElementById('menuOverlay');
        if (menuOverlay) menuOverlay.classList.remove('open');
        
        // Setup state
        healingState.activeHealing = scarId;
        healingState.progress = 0;
        healingState.phase = 'intro';
        healingState.particles = [];
        healingState.gameData = {};
        healingState.startTime = Date.now();
        healingState.lastFrameTime = Date.now();
        
        // Setup overlay appearance
        const overlay = healingState.overlay;
        const backdrop = overlay.querySelector('.healing-backdrop');
        backdrop.style.background = `linear-gradient(135deg, ${scarInfo.bgGradient[0]}, ${scarInfo.bgGradient[1]})`;
        
        // Set color theme
        overlay.style.setProperty('--healing-color', scarInfo.color);
        overlay.style.setProperty('--healing-accent', scarInfo.accentColor);
        
        // Set icon
        const iconMap = { wilt: '💧', bend: '☀️', pale: '🎨', dormant: '🌙' };
        document.getElementById('healingIcon').textContent = iconMap[scarId] || '✨';
        
        // Set whisper text
        document.getElementById('healingWhisper').textContent = scarInfo.description;
        
        // Reset progress ring
        const ring = document.getElementById('healingProgressRing');
        ring.style.strokeDashoffset = 283;
        
        // Hide success
        document.getElementById('healingSuccess').classList.remove('visible');
        
        // Show overlay
        overlay.classList.add('open');
        overlay.dataset.scar = scarId; // For CSS targeting
        resizeCanvas();
        
        // Initialize audio
        initHealingAudio();
        
        // Initialize game
        if (scarInfo.initGame) scarInfo.initGame();
        
        // Start intro phase
        setTimeout(() => {
            if (healingState.activeHealing) {
                healingState.phase = 'active';
                setupInputHandlers(scarId);
            }
        }, 1500);
        
        // Start animation loop
        if (!healingState.animationId) {
            healingState.animationId = requestAnimationFrame(healingLoop);
        }
    }

    function healingLoop(timestamp) {
        if (!healingState.activeHealing) return;
        
        const scarInfo = SCAR_HEALINGS[healingState.activeHealing];
        const dt = Math.min(50, timestamp - healingState.lastFrameTime);
        healingState.lastFrameTime = timestamp;
        
        // Clear canvas
        const ctx = healingState.ctx;
        const w = healingState.canvas.width;
        const h = healingState.canvas.height;
        ctx.clearRect(0, 0, w, h);
        
        // Update and render particles
        updateParticles(dt);
        renderParticles(ctx);
        
        // Update game logic
        if (healingState.phase === 'active' && scarInfo) {
            scarInfo.updateGame(dt);
            scarInfo.renderGame(ctx, w, h);
            
            // Update progress ring
            const ring = document.getElementById('healingProgressRing');
            const offset = 283 * (1 - healingState.progress / 100);
            ring.style.strokeDashoffset = offset;
            
            // Check completion
            if (healingState.progress >= 100) {
                completeHealing();
            }
        }
        
        healingState.animationId = requestAnimationFrame(healingLoop);
    }

    function completeHealing() {
        if (healingState.phase === 'success') return; // Prevent double trigger
        healingState.phase = 'success';
        
        const scarId = healingState.activeHealing;
        
        // Remove scar from state (safely)
        if (typeof state !== 'undefined' && state.scars) {
            const index = state.scars.indexOf(scarId);
            if (index > -1) {
                state.scars.splice(index, 1);
            }
            
            // Reset associated neglect timers
            if (state.neglect) {
                if (scarId === 'wilt') state.neglect.waterLowMs = 0;
                if (scarId === 'pale') state.neglect.sunLowMs = 0;
                if (scarId === 'dormant') state.neglect.crisisMs = 0;
            }
            
            // Save state
            if (typeof saveState === 'function') saveState();
        }
        
        // Play success sound
        playHealingSound('success');
        
        // Burst particles
        for (let i = 0; i < 50; i++) {
            spawnParticle(
                healingState.canvas.width / 2,
                healingState.canvas.height / 2,
                'burst'
            );
        }
        
        // Show success state
        document.getElementById('healingSuccess').classList.add('visible');
        
        // Unlock discovery
        if (typeof unlockDiscovery === 'function') {
            unlockDiscovery('scar_healed');
        }
        
        // Update plant rendering immediately
        if (typeof renderPlant === 'function' && typeof state !== 'undefined') {
            renderPlant('plantGroup', state.dna, state.stage);
        }
        
        // Remove visual scar classes from DOM immediately
        const plantHero = document.getElementById('plantHero');
        if (plantHero) {
            // Remove specific class based on scar
            if (scarId === 'wilt') plantHero.classList.remove('droop-plant');
            if (scarId === 'pale') plantHero.classList.remove('shade-plant');
            if (scarId === 'dormant') plantHero.classList.remove('dormant-plant', 'quiet-plant');
        }
        
        // Close after delay
        setTimeout(() => {
            closeHealing();
            
            // Show floating text
            if (typeof spawnFloatingText === 'function') {
                const scarInfo = SCAR_HEALINGS[scarId];
                spawnFloatingText(`🌿 ${scarInfo.name} healed`, scarInfo.color, 'good');
            }
        }, 2500);
    }

    function cancelHealing() {
        closeHealing();
    }

    function closeHealing() {
        healingState.phase = 'closed';
        healingState.activeHealing = null;
        
        if (healingState.animationId) {
            cancelAnimationFrame(healingState.animationId);
            healingState.animationId = null;
        }
        
        // Remove input handlers
        removeInputHandlers();
        
        // Hide overlay
        if (healingState.overlay) healingState.overlay.classList.remove('open');
        
        // Trigger a UI update if possible to refresh the scar list
        if (typeof updateMenuStats === 'function') {
            updateMenuStats(); 
        }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // INPUT HANDLERS
    // ═══════════════════════════════════════════════════════════════════════
    
    function setupInputHandlers(scarId) {
        const canvas = healingState.canvas;
        
        const handleStart = (e) => {
            // Don't prevent default on close button or other UI
            if (e.target.closest('.healing-ui') || e.target.closest('.healing-close')) return;
            
            e.preventDefault();
            const pos = getEventPos(e);
            healingState.touchData.isDown = true;
            healingState.touchData.startPos = pos;
            healingState.touchData.currentPos = pos;
            healingState.touchData.startTime = Date.now();
        };
        
        const handleMove = (e) => {
            e.preventDefault();
            if (healingState.touchData.isDown) {
                healingState.touchData.currentPos = getEventPos(e);
            }
        };
        
        const handleEnd = (e) => {
            // e.preventDefault(); // Don't block clicks completely
            healingState.touchData.isDown = false;
            healingState.touchData.endTime = Date.now();
        };
        
        canvas.addEventListener('mousedown', handleStart);
        canvas.addEventListener('mousemove', handleMove);
        canvas.addEventListener('mouseup', handleEnd);
        canvas.addEventListener('mouseleave', handleEnd);
        canvas.addEventListener('touchstart', handleStart, { passive: false });
        canvas.addEventListener('touchmove', handleMove, { passive: false });
        canvas.addEventListener('touchend', handleEnd, { passive: false });
        
        healingState.inputHandlers = { handleStart, handleMove, handleEnd };
    }

    function removeInputHandlers() {
        if (!healingState.inputHandlers) return;
        const canvas = healingState.canvas;
        const { handleStart, handleMove, handleEnd } = healingState.inputHandlers;
        
        canvas.removeEventListener('mousedown', handleStart);
        canvas.removeEventListener('mousemove', handleMove);
        canvas.removeEventListener('mouseup', handleEnd);
        canvas.removeEventListener('mouseleave', handleEnd);
        canvas.removeEventListener('touchstart', handleStart);
        canvas.removeEventListener('touchmove', handleMove);
        canvas.removeEventListener('touchend', handleEnd);
        
        healingState.inputHandlers = null;
    }

    function getEventPos(e) {
        if (e.touches && e.touches.length > 0) {
            return { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }
        return { x: e.clientX, y: e.clientY };
    }

    // ═══════════════════════════════════════════════════════════════════════
    // PARTICLES
    // ═══════════════════════════════════════════════════════════════════════
    
    function spawnParticle(x, y, type = 'default') {
        const scarInfo = SCAR_HEALINGS[healingState.activeHealing];
        const color = scarInfo ? scarInfo.color : '#fff';
        
        healingState.particles.push({
            x, y,
            vx: (Math.random() - 0.5) * (type === 'burst' ? 8 : 2),
            vy: (Math.random() - 0.5) * (type === 'burst' ? 8 : 2) - (type === 'rise' ? 2 : 0),
            life: 1,
            decay: type === 'burst' ? 0.02 : 0.01,
            size: type === 'burst' ? 3 + Math.random() * 4 : 2 + Math.random() * 3,
            color: color,
            type: type
        });
    }

    function updateParticles(dt) {
        healingState.particles = healingState.particles.filter(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.02; // Slight gravity
            p.life -= p.decay;
            return p.life > 0;
        });
    }

    function renderParticles(ctx) {
        healingState.particles.forEach(p => {
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
            ctx.fillStyle = p.color + Math.floor(p.life * 255).toString(16).padStart(2, '0');
            ctx.fill();
        });
    }

    // ═══════════════════════════════════════════════════════════════════════
    // AUDIO
    // ═══════════════════════════════════════════════════════════════════════
    
    function initHealingAudio() {
        if (!healingState.audioCtx) {
            healingState.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (healingState.audioCtx.state === 'suspended') {
            healingState.audioCtx.resume();
        }
    }

    function playHealingTone(freq, duration = 0.3, type = 'sine', volume = 0.15) {
        const ctx = healingState.audioCtx;
        if (!ctx) return;
        
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();
        
        osc.type = type;
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(2000, ctx.currentTime);
        
        gain.gain.setValueAtTime(0, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
        
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + duration);
    }

    function playHealingSound(type) {
        const ctx = healingState.audioCtx;
        if (!ctx) return;
        
        if (type === 'success') {
            const notes = [261.63, 329.63, 392.00, 523.25];
            notes.forEach((freq, i) => {
                setTimeout(() => playHealingTone(freq, 0.4, 'sine', 0.12), i * 100);
            });
        } else if (type === 'progress') {
            playHealingTone(440 + healingState.progress * 2, 0.15, 'triangle', 0.08);
        } else if (type === 'fail') {
            playHealingTone(180, 0.3, 'sawtooth', 0.06);
        }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // GAME IMPLS
    // ═══════════════════════════════════════════════════════════════════════

    // -- MISTING (Wilt) --
    function initMistingGame() {
        const leafHue = (typeof state !== 'undefined' && state.dna) 
            ? ((state.dna.colorH + (state.dna.leafHueOffset || 0)) % 360 + 360) % 360 
            : 120;
        const leafShape = (typeof state !== 'undefined' && state.dna) ? state.dna.leafShape : 'round';
        
        healingState.gameData = {
            mistLevel: 0,
            targetMin: 60,
            targetMax: 80,
            isHolding: false,
            droplets: [],
            successfulMists: 0,
            requiredMists: 5,
            lastMistTime: 0,
            leafHue: leafHue,
            leafShape: leafShape,
            leafWilt: 1,
            leafDroplets: [],
            leafGlow: 0
        };
    }

    function updateMistingGame(dt) {
        const gd = healingState.gameData;
        gd.droplets = gd.droplets.filter(d => {
            d.y += d.vy; d.vy += 0.08; d.life -= 0.012;
            return d.life > 0 && d.y < healingState.canvas.height;
        });
        gd.leafDroplets = gd.leafDroplets.filter(d => {
            d.life -= 0.008; d.size *= 0.995;
            return d.life > 0 && d.size > 0.5;
        });
        gd.leafGlow = Math.max(0, gd.leafGlow - dt * 0.003);
        gd.leafWilt = 1 - (healingState.progress / 100);
        
        if (healingState.touchData.isDown) {
            gd.isHolding = true;
            gd.mistLevel = Math.min(100, gd.mistLevel + dt * 0.08);
            if (Math.random() < 0.4) {
                const pos = healingState.touchData.currentPos;
                gd.droplets.push({
                    x: pos.x + (Math.random() - 0.5) * 80, y: pos.y,
                    vy: -1.5 - Math.random() * 2.5, size: 2 + Math.random() * 5, life: 1
                });
            }
            if (Date.now() - gd.lastMistTime > 200) {
                playHealingTone(300 + gd.mistLevel * 3, 0.1, 'sine', 0.04);
                gd.lastMistTime = Date.now();
            }
        } else {
            if (gd.isHolding && gd.mistLevel > 20) {
                if (gd.mistLevel >= gd.targetMin && gd.mistLevel <= gd.targetMax) {
                    gd.successfulMists++;
                    healingState.progress = (gd.successfulMists / gd.requiredMists) * 100;
                    gd.leafGlow = 1;
                    playHealingSound('progress');
                    for (let i=0; i<8; i++) gd.leafDroplets.push({
                        x: (Math.random()-0.5)*100, y: (Math.random()-0.5)*60-20,
                        size: 3+Math.random()*4, life: 1
                    });
                    for (let i=0; i<15; i++) spawnParticle(
                        healingState.canvas.width/2 + (Math.random()-0.5)*120, 
                        healingState.canvas.height/2, 'rise'
                    );
                } else {
                    playHealingSound('fail');
                }
            }
            gd.isHolding = false;
            gd.mistLevel = Math.max(0, gd.mistLevel - dt * 0.12);
        }
    }

    function renderMistingGame(ctx, w, h) {
        const gd = healingState.gameData;
        const cx = w/2, cy = h/2;
        const barHeight=h*0.5, barWidth=24, barX=w-60, barY=(h-barHeight)/2;
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
        roundRect(ctx, barX, barY, barWidth, barHeight, 12);
        ctx.fill();
        
        const tY1 = barY + barHeight*(1 - gd.targetMax/100);
        const tY2 = barY + barHeight*(1 - gd.targetMin/100);
        ctx.fillStyle = 'rgba(96, 165, 250, 0.25)';
        ctx.fillRect(barX, tY1, barWidth, tY2 - tY1);
        
        const lY = barY + barHeight*(1 - gd.mistLevel/100);
        ctx.fillStyle = (gd.mistLevel >= gd.targetMin && gd.mistLevel <= gd.targetMax) ? '#4ade80' : '#60a5fa';
        roundRect(ctx, barX, lY, barWidth, barY+barHeight-lY, 12);
        ctx.fill();
        
        ctx.save();
        ctx.translate(cx, cy);
        if (gd.leafGlow > 0) {
            const grad = ctx.createRadialGradient(0,0,0,0,0,120);
            grad.addColorStop(0, `rgba(96,165,250,${gd.leafGlow*0.4})`);
            grad.addColorStop(1, 'transparent');
            ctx.fillStyle = grad;
            ctx.fillRect(-120,-120,240,240);
        }
        drawDetailedLeaf(ctx, gd.leafHue, gd.leafShape, gd.leafWilt, 2.5);
        gd.leafDroplets.forEach(d => {
            ctx.beginPath();
            ctx.arc(d.x, d.y, d.size*d.life, 0, Math.PI*2);
            ctx.fillStyle = `rgba(147,197,253,${d.life*0.7})`;
            ctx.fill();
        });
        ctx.restore();
        
        ctx.fillStyle = 'rgba(147, 197, 253, 0.6)';
        gd.droplets.forEach(d => {
            ctx.beginPath(); ctx.arc(d.x, d.y, d.size*d.life, 0, Math.PI*2); ctx.fill();
        });
        
        for (let i=0; i<gd.requiredMists; i++) {
            ctx.beginPath(); ctx.arc(cx-40+i*20, h-50, 6, 0, Math.PI*2);
            ctx.fillStyle = i<gd.successfulMists ? '#4ade80' : 'rgba(255,255,255,0.2)';
            ctx.fill();
        }
    }

    // -- GUIDING (Bend) --
    function initGuidingGame() {
        const w = healingState.canvas.width;
        const h = healingState.canvas.height;
        healingState.gameData = {
            lightX: w/2, lightY: h*0.35,
            stemAngle: 30, targetAngle: 0,
            lightTrail: [], isActive: false,
            totalMovement: 0, lastPos: null,
            glowIntensity: 0.5, particles: []
        };
    }

    function updateGuidingGame(dt) {
        const gd = healingState.gameData;
        const h = healingState.canvas.height;
        gd.lightTrail = gd.lightTrail.filter(p => { p.life-=0.02; return p.life>0; });
        gd.particles = gd.particles.filter(p => { 
            p.x+=p.vx; p.y+=p.vy; p.vy+=0.02; p.life-=0.02; return p.life>0; 
        });
        
        if (healingState.touchData.isDown) {
            const pos = healingState.touchData.currentPos;
            gd.isActive = true;
            if (gd.lastPos) {
                const dist = Math.hypot(pos.x - gd.lastPos.x, pos.y - gd.lastPos.y);
                gd.totalMovement += dist;
                if (dist > 2) gd.lightTrail.push({x:gd.lightX, y:gd.lightY, life:1});
                if (Math.random() < 0.3) gd.particles.push({
                    x:gd.lightX, y:gd.lightY, vx:(Math.random()-0.5)*2, vy:(Math.random()-0.5)*2, life:1
                });
            }
            gd.lightX += (pos.x - gd.lightX)*0.15;
            gd.lightY += (pos.y - gd.lightY)*0.15;
            gd.lastPos = {x:pos.x, y:pos.y};
            
            const heightFactor = Math.max(0, (h*0.6 - gd.lightY)/(h*0.4));
            if (heightFactor > 0.2) {
                healingState.progress = Math.min(100, healingState.progress + dt*0.004*heightFactor);
                gd.stemAngle = 30 * (1 - healingState.progress/100);
                if (Math.random() < 0.03) playHealingTone(350 + healingState.progress*3, 0.15, 'triangle', 0.06);
                gd.glowIntensity = 0.6 + heightFactor*0.4;
            } else {
                gd.glowIntensity = 0.4;
            }
        } else {
            gd.isActive = false; gd.lastPos = null;
            gd.glowIntensity = Math.max(0.3, gd.glowIntensity - dt*0.002);
        }
    }

    function renderGuidingGame(ctx, w, h) {
        const gd = healingState.gameData;
        const pX = w/2, pY = h*0.6+50;
        
        gd.lightTrail.forEach(p => {
            ctx.beginPath(); ctx.arc(p.x, p.y, 8*p.life, 0, Math.PI*2);
            ctx.fillStyle = `rgba(251,191,36,${p.life*0.3})`; ctx.fill();
        });
        
        const grad = ctx.createRadialGradient(gd.lightX, gd.lightY, 0, gd.lightX, gd.lightY, 250);
        grad.addColorStop(0, `rgba(251,191,36,${gd.glowIntensity*0.5})`);
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad; ctx.fillRect(0,0,w,h);
        
        ctx.beginPath(); ctx.moveTo(gd.lightX, gd.lightY); ctx.lineTo(pX, pY-80);
        ctx.strokeStyle = `rgba(251,191,36,${gd.glowIntensity*0.15})`;
        ctx.lineWidth = 60; ctx.lineCap = 'round'; ctx.stroke();
        
        ctx.beginPath(); ctx.arc(gd.lightX, gd.lightY, 25+gd.glowIntensity*8, 0, Math.PI*2);
        ctx.fillStyle = `rgba(251,191,36,${gd.glowIntensity})`; ctx.fill();
        ctx.beginPath(); ctx.arc(gd.lightX, gd.lightY, 12, 0, Math.PI*2);
        ctx.fillStyle = '#fef3c7'; ctx.fill();
        
        gd.particles.forEach(p => {
            ctx.beginPath(); ctx.arc(p.x, p.y, 3*p.life, 0, Math.PI*2);
            ctx.fillStyle = `rgba(254,243,199,${p.life*0.8})`; ctx.fill();
        });
        
        drawBentPlant(ctx, pX, pY, gd.stemAngle, '#4ade80');
        
        ctx.beginPath();
        ctx.arc(pX, pY-60, 70, Math.PI, Math.PI + (Math.PI * healingState.progress/100));
        ctx.strokeStyle = `rgba(74,222,128,0.5)`; ctx.lineWidth = 4; ctx.stroke();
    }

    // -- COLOR (Pale) --
    function initColorGame() {
        const hue = (typeof state !== 'undefined' && state.dna) ? state.dna.colorH : 120;
        healingState.gameData = {
            targetHue: hue, currentHue: 0,
            basePulseSpeed: 0.025, pulseSpeed: 0.025, pulseDirection: 1,
            successfulMatches: 0, requiredMatches: 6, matchWindow: 25,
            lastTapTime: 0, rings: [], saturation: 30, misses: 0, maxMisses: 3, shakeAmount: 0, speedMultiplier: 1
        };
    }

    function updateColorGame(dt) {
        const gd = healingState.gameData;
        gd.speedMultiplier = 1 + (gd.successfulMatches * 0.25);
        gd.pulseSpeed = gd.basePulseSpeed * gd.speedMultiplier;
        gd.currentHue += gd.pulseSpeed * dt * gd.pulseDirection;
        if (gd.currentHue > 360) gd.currentHue -= 360;
        
        gd.rings = gd.rings.filter(r => { r.radius+=3; r.alpha-=0.02; return r.alpha>0; });
        gd.shakeAmount = Math.max(0, gd.shakeAmount - dt*0.01);
        
        if (healingState.touchData.isDown && Date.now() - gd.lastTapTime > 300) {
            gd.lastTapTime = Date.now();
            const diff = Math.abs(gd.currentHue - gd.targetHue);
            const hueDiff = Math.min(diff, 360 - diff);
            
            if (hueDiff < gd.matchWindow) {
                gd.successfulMatches++;
                gd.misses = 0;
                healingState.progress = (gd.successfulMatches / gd.requiredMatches) * 100;
                gd.saturation = 30 + 50 * (healingState.progress/100);
                playHealingSound('progress');
                gd.rings.push({x:healingState.canvas.width/2, y:healingState.canvas.height/2, radius:50, alpha:1, hue:gd.targetHue});
                for(let i=0; i<10; i++) spawnParticle(healingState.canvas.width/2+(Math.random()-0.5)*80, healingState.canvas.height/2+(Math.random()-0.5)*80, 'burst');
            } else {
                gd.misses++; gd.shakeAmount = 1; playHealingSound('fail');
                if (gd.misses >= gd.maxMisses) {
                    gd.successfulMatches = 0; gd.misses = 0; gd.saturation = 30; healingState.progress = 0;
                    gd.rings.push({x:healingState.canvas.width/2, y:healingState.canvas.height/2, radius:30, alpha:1, hue:0, isFailRing:true});
                }
            }
        }
    }

    function renderColorGame(ctx, w, h) {
        const gd = healingState.gameData;
        let cx = w/2, cy = h/2;
        if (gd.shakeAmount > 0) { cx += (Math.random()-0.5)*gd.shakeAmount*10; cy += (Math.random()-0.5)*gd.shakeAmount*10; }
        
        const r = 120, rw = 20;
        for (let a=0; a<360; a+=2) {
            const rad = a*Math.PI/180;
            ctx.beginPath(); ctx.moveTo(cx+Math.cos(rad)*(r-rw), cy+Math.sin(rad)*(r-rw));
            ctx.lineTo(cx+Math.cos(rad)*r, cy+Math.sin(rad)*r);
            ctx.strokeStyle = `hsl(${a}, 70%, 50%)`; ctx.lineWidth = 3; ctx.stroke();
        }
        
        const tRad = gd.targetHue*Math.PI/180;
        ctx.beginPath(); ctx.arc(cx+Math.cos(tRad)*(r+18), cy+Math.sin(tRad)*(r+18), 12, 0, Math.PI*2);
        ctx.fillStyle = `hsl(${gd.targetHue}, 70%, 60%)`; ctx.fill(); ctx.stroke();
        
        const pRad = gd.currentHue*Math.PI/180;
        ctx.beginPath(); ctx.arc(cx+Math.cos(pRad)*r, cy+Math.sin(pRad)*r, 8, 0, Math.PI*2);
        ctx.fillStyle = '#fff'; ctx.fill();
        
        ctx.save(); ctx.translate(cx, cy+20);
        drawPlantIcon(ctx, gd.saturation, gd.targetHue);
        ctx.restore();
        
        gd.rings.forEach(ring => {
            ctx.beginPath(); ctx.arc(ring.x, ring.y, ring.radius, 0, Math.PI*2);
            ctx.strokeStyle = ring.isFailRing ? `rgba(248,113,113,${ring.alpha})` : `hsla(${ring.hue},70%,60%,${ring.alpha})`;
            ctx.lineWidth = 3; ctx.stroke();
        });
        
        for (let i=0; i<gd.requiredMatches; i++) {
            ctx.beginPath(); ctx.arc(cx-50+i*20, h-60, 6, 0, Math.PI*2);
            ctx.fillStyle = i < gd.successfulMatches ? `hsl(${gd.targetHue}, 70%, 60%)` : 'rgba(255,255,255,0.2)'; ctx.fill();
        }
    }

    // -- WHISPER (Dormant) --
    function initWhisperGame() {
        const pentatonic = [1, 1.125, 1.25, 1.5, 1.6875];
        const base = 261.63;
        healingState.gameData = {
            notes: pentatonic.map((m,i) => ({
                freq: base*m, name:['C','D','E','G','A'][i], x:0, y:0, active:false, glow:0, pulsePhase:Math.random()*6
            })),
            activeNotes: new Set(), harmony: 0, wakeLevel: 0, breathPhase: 0,
            sparkles: [], ripples: []
        };
    }

    function updateWhisperGame(dt) {
        const gd = healingState.gameData;
        const w=healingState.canvas.width, h=healingState.canvas.height;
        
        gd.notes.forEach((n,i) => {
            const t = (i+0.5)/5;
            n.x = w*0.15 + t*w*0.7; n.y = h*0.72 + Math.sin(t*Math.PI)*40;
            n.glow = Math.max(0, n.glow - dt*0.004); n.pulsePhase += dt*0.003;
        });
        gd.breathPhase += dt*0.002;
        gd.sparkles = gd.sparkles.filter(s => { s.y-=s.speed; s.life-=0.012; s.x+=Math.sin(s.phase+s.y*0.02)*0.8; return s.life>0; });
        gd.ripples = gd.ripples.filter(r => { r.radius+=2; r.alpha-=0.02; return r.alpha>0; });
        
        const touching = new Set();
        if (healingState.touchData.isDown) {
            const pos = healingState.touchData.currentPos;
            gd.notes.forEach((n,i) => {
                if (Math.hypot(pos.x-n.x, pos.y-n.y) < 50) {
                    touching.add(i);
                    if (!gd.activeNotes.has(i)) {
                        n.active = true; n.glow = 1; gd.activeNotes.add(i);
                        playHealingTone(n.freq, 1.8, 'sine', 0.12);
                        gd.ripples.push({x:n.x, y:n.y, radius:20, alpha:0.8});
                        calculateHarmony(gd);
                    }
                }
            });
        }
        gd.activeNotes.forEach(i => { if (!touching.has(i)) { gd.notes[i].active = false; gd.activeNotes.delete(i); } });
        gd.wakeLevel = healingState.progress/100;
    }

    function calculateHarmony(gd) {
        const count = gd.activeNotes.size;
        if (count === 0) return;
        if (count === 1) { healingState.progress = Math.min(100, healingState.progress+1.5); spawnWakeSparkles(gd, 2); return; }
        
        let score = 0;
        const arr = Array.from(gd.activeNotes).sort();
        for(let i=0; i<arr.length; i++) for(let j=i+1; j<arr.length; j++) {
            const diff = arr[j]-arr[i];
            if (diff===3) score+=0.8; else if (diff===2) score+=0.6; else score+=0.4;
        }
        if (count>=3) score+=0.5;
        gd.harmony = Math.min(1, score);
        healingState.progress = Math.min(100, healingState.progress + (2 + gd.harmony*4));
        spawnWakeSparkles(gd, Math.floor(3+gd.harmony*8));
        if (gd.harmony > 0.5) playHealingSound('progress');
    }

    function spawnWakeSparkles(gd, count) {
        for(let k=0; k<count; k++) gd.sparkles.push({
            x:healingState.canvas.width/2+(Math.random()-0.5)*120, y:healingState.canvas.height/2+60,
            speed:1+Math.random()*2.5, life:1, size:2+Math.random()*4, phase:Math.random()*6
        });
    }

    function renderWhisperGame(ctx, w, h) {
        const gd = healingState.gameData;
        const cx = w/2, cy = h/2 - 20;
        const scale = 1 + Math.sin(gd.breathPhase)*0.02;
        
        ctx.save(); ctx.translate(cx, cy+40); ctx.scale(scale, scale); ctx.globalAlpha = 0.3+gd.wakeLevel*0.7;
        drawDormantPlant(ctx, gd.wakeLevel); ctx.restore();
        
        gd.ripples.forEach(r => {
            ctx.beginPath(); ctx.arc(r.x, r.y, r.radius, 0, Math.PI*2);
            ctx.strokeStyle = `rgba(148,163,184,${r.alpha})`; ctx.lineWidth = 2; ctx.stroke();
        });
        gd.sparkles.forEach(s => {
            ctx.beginPath(); ctx.arc(s.x, s.y, s.size*s.life, 0, Math.PI*2);
            ctx.fillStyle = `rgba(255,255,255,${s.life*0.9})`; ctx.fill();
        });
        
        gd.notes.forEach(n => {
            const size = 32 * (1 + Math.sin(n.pulsePhase)*0.15);
            if (n.glow > 0) {
                const grad = ctx.createRadialGradient(n.x,n.y,0,n.x,n.y,size+20);
                grad.addColorStop(0, `rgba(148,163,184,${n.glow*0.6})`); grad.addColorStop(1,'transparent');
                ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(n.x,n.y,size+20,0,Math.PI*2); ctx.fill();
            }
            ctx.beginPath(); ctx.arc(n.x, n.y, size, 0, Math.PI*2);
            ctx.fillStyle = n.active ? 'rgba(148,163,184,0.9)' : `rgba(148,163,184,${0.25+n.glow*0.3})`;
            ctx.fill();
            ctx.strokeStyle = `rgba(255,255,255,${0.4+n.glow*0.4})`; ctx.stroke();
            ctx.fillStyle = '#fff'; ctx.font = '18px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText(n.name, n.x, n.y);
        });
        
        ctx.beginPath(); ctx.arc(cx, cy+40, 80, -Math.PI*0.7, -Math.PI*0.7+(Math.PI*1.4*healingState.progress/100));
        ctx.strokeStyle = 'rgba(148,163,184,0.5)'; ctx.lineWidth = 4; ctx.stroke();
    }

    // ═══════════════════════════════════════════════════════════════════════
    // HELPERS
    // ═══════════════════════════════════════════════════════════════════════

    function roundRect(ctx, x, y, w, h, r) {
        ctx.beginPath(); ctx.moveTo(x+r, y); ctx.lineTo(x+w-r, y);
        ctx.quadraticCurveTo(x+w, y, x+w, y+r); ctx.lineTo(x+w, y+h-r);
        ctx.quadraticCurveTo(x+w, y+h, x+w-r, y+h); ctx.lineTo(x+r, y+h);
        ctx.quadraticCurveTo(x, y+h, x, y+h-r); ctx.lineTo(x, y+r);
        ctx.quadraticCurveTo(x, y, x+r, y); ctx.closePath();
    }

    function drawDetailedLeaf(ctx, hue, shape, wilt, scale) {
        ctx.save(); ctx.rotate(wilt*0.4); ctx.scale(scale, scale);
        ctx.beginPath();
        if (shape==='heart'||shape==='round') {
            ctx.moveTo(0,40); ctx.bezierCurveTo(-35,20,-40,-20,-20,-35);
            ctx.bezierCurveTo(-10,-45,10,-45,20,-35); ctx.bezierCurveTo(40,-20,35,20,0,40);
        } else {
            ctx.moveTo(0,40); ctx.bezierCurveTo(-30,15,-25,-25,0,-40);
            ctx.bezierCurveTo(25,-25,30,15,0,40);
        }
        const grad = ctx.createLinearGradient(-30,-40,30,40);
        grad.addColorStop(0, `hsl(${hue},45%,${55-wilt*10}%)`);
        grad.addColorStop(1, `hsl(${hue},45%,${30-wilt*10}%)`);
        ctx.fillStyle = grad; ctx.fill();
        ctx.beginPath(); ctx.moveTo(0,40); ctx.quadraticCurveTo(wilt*5,0,0,-35);
        ctx.strokeStyle = `hsl(${hue},35%,${30-wilt*5}%)`; ctx.lineWidth = 2; ctx.stroke();
        ctx.restore();
    }

    function drawBentPlant(ctx, x, y, angle, color) {
        ctx.save(); ctx.translate(x, y);
        const rad = angle*Math.PI/180;
        ctx.beginPath(); ctx.moveTo(0,0); ctx.quadraticCurveTo(Math.sin(rad)*40,-50,Math.sin(rad)*30,-100);
        ctx.strokeStyle = color; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.stroke();
        const tipX = Math.sin(rad)*30, tipY = -100;
        for(let i=0; i<5; i++) {
            const pRad = (i*72-90)*Math.PI/180;
            ctx.beginPath(); ctx.ellipse(tipX+Math.cos(pRad)*15, tipY+Math.sin(pRad)*15, 8, 5, pRad, 0, Math.PI*2);
            ctx.fillStyle = '#f472b6'; ctx.fill();
        }
        ctx.beginPath(); ctx.arc(tipX, tipY, 6, 0, Math.PI*2); ctx.fillStyle = '#fbbf24'; ctx.fill();
        ctx.restore();
    }

    function drawPlantIcon(ctx, sat, hue) {
        const c = `hsl(${hue},${sat}%,45%)`;
        ctx.beginPath(); ctx.moveTo(0,20); ctx.quadraticCurveTo(-5,-10,0,-30);
        ctx.strokeStyle = c; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.stroke();
        [-1,1].forEach(d => {
            ctx.beginPath(); ctx.moveTo(0,0); ctx.quadraticCurveTo(d*25,-10,d*20,-25);
            ctx.strokeStyle = c; ctx.stroke();
        });
    }

    function drawDormantPlant(ctx, wake) {
        const c = `rgba(74,222,128,${0.4+wake*0.6})`;
        ctx.beginPath(); ctx.moveTo(0,30); ctx.quadraticCurveTo(-10,0,0,-20-wake*30);
        ctx.strokeStyle = c; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.stroke();
        const u = wake;
        [-1,1].forEach(d => {
            ctx.beginPath(); ctx.moveTo(0,0);
            ctx.quadraticCurveTo(d*(10+u*20), -10+(1-u)*15, d*(15+u*20), -15-u*10);
            ctx.strokeStyle = c; ctx.lineWidth = 3; ctx.stroke();
        });
        if (wake<0.5) {
            ctx.fillStyle = `rgba(255,255,255,${0.5-wake})`; ctx.font = '14px sans-serif';
            ctx.fillText('z', 20,-30); ctx.font = '10px sans-serif'; ctx.fillText('z', 38,-55);
        }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // INITIALIZATION
    // ═══════════════════════════════════════════════════════════════════════
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => setTimeout(initHealingSystem, 500));
    } else {
        setTimeout(initHealingSystem, 500);
    }

    window.healingState = healingState;
    window.beginHealing = beginHealing;

})();
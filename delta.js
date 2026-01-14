/* ═══════════════════════════════════════════════════════════════
   POCKET SPROUT — POT VIEW LOGIC (DELTA)
   Handles root generation and the water absorption minigame.
   ═══════════════════════════════════════════════════════════════ */

(function () {
  const DEFAULT_STATE = {
    stage: 1,
    water: 50,
    pollution: 0,
    soilContamination: 0,
    growth: 0,
    generation: 1,
    season: 0,
    name: 'Sprout'
  };

  if (typeof window.state !== 'object' || window.state === null) window.state = {};
  for (const [k, v] of Object.entries(DEFAULT_STATE)) {
    if (typeof window.state[k] === 'undefined') window.state[k] = v;
  }
  const S = window.state;

  let pollutionScore = S.pollution || 0;
  let spawnInterval = null;
  let gameActive = true;


const rootSVG = document.getElementById('rootSVG');
const waterLayer = document.getElementById('waterLayer');
const pollutedCountDisplay = document.getElementById('pollutedCount');

// UI Constants (Mirrored from alpha.js / script.js)
const SEASONS = [{name:'Spring',icon:'🌸'},{name:'Summer',icon:'☀️'},{name:'Autumn',icon:'🍂'},{name:'Winter',icon:'❄️'}];
const STAGE_THRESHOLDS = [0, 300, 1000, 2500, 5000, 8000];

// --- Deterministic PRNG ---
let seed = 12345;
function seededRandom() {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
}

function initSeedFromDNA(dna) {
    if (!dna) return 12345;
    const str = `${dna.colorH}-${dna.stemHeight}-${dna.leafCount}-${dna.flowerH}`;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash |= 0; 
    }
    return Math.abs(hash);
}

// --- Load/Save Logic ---

function syncAmbientAudio() {
    // Persist ambient audio across pages by re-applying current S settings.
    // Requires alpha.js (defines `audio`) to be loaded on the page.
    try {
        if (typeof audio === 'undefined') return;
        audio.init();

        // Background music
        if (S.isMusicPlaying) {
            audio.playBackgroundMusic();
        } else {
            audio.stopBackgroundMusic();
        }

        // Rain noise
        if (S.isRainOn) {
            audio.startRainSound();
        } else {
            audio.stopRainSound();
        }
    } catch (e) {
        // Audio might be blocked until a user gesture; that's fine.
        // We'll retry after the next interaction.
    }
}

function loadState() {
    try {
        const saved = localStorage.getItem('pocketSprout');
        if (saved) {
            const parsed = JSON.parse(saved);
            Object.assign(S, parsed);
            pollutionScore = S.pollution || 0;
            if (pollutedCountDisplay) pollutedCountDisplay.textContent = pollutionScore;
        }
    } catch (e) {
        console.error("Failed to load S", e);
    }
}

function saveState() {
    S.pollution = pollutionScore;
    try {
        localStorage.setItem('pocketSprout', JSON.stringify(S));
    } catch (e) {
        console.error("Failed to save S", e);
    }
}

// --- UI Sync Logic ---
function updateStatusPanel() {
    if (!S) return;
    const genBadge = document.getElementById('genBadge');
    if (genBadge) genBadge.textContent = `CYCLE ${S.generation || 1}`;
    
    const nameDisplay = document.getElementById('plantNameDisplay');
    if (nameDisplay) nameDisplay.textContent = S.name || 'Sprout';
    
    const seasonDisplay = document.getElementById('seasonIndicator');
    if (seasonDisplay) {
        const s = SEASONS[(S.season || 0) % 4];
        seasonDisplay.textContent = `${s.icon} ${s.name}`;
    }
    
    const bar = document.getElementById('evolutionBar');
    const growthLabel = document.querySelector('.growth-label');
    if (bar) {
        const stage = S.stage || 1;
        const growth = S.growth || 0;
        
        // Visual feedback for thirsty roots
        if (S.water <= 0) {
            bar.style.width = '100%';
            bar.style.background = '#45475a';
            if (growthLabel) growthLabel.textContent = "DRY SOIL (Thirsty)";
        } else {
            if (growthLabel) growthLabel.textContent = "Evolution";
            bar.style.background = '';
            if (stage < 6) {
                const prev = STAGE_THRESHOLDS[stage - 1] || 0;
                const next = STAGE_THRESHOLDS[stage];
                bar.style.width = Math.min(100, ((growth - prev) / (next - prev)) * 100) + '%';
            } else {
                bar.style.width = '100%';
            }
        }
    }

    const cbar = document.getElementById('contaminationBar');
    if (cbar) {
        const c = Math.max(0, Math.min(100, S.soilContamination || 0));
        cbar.style.width = c + '%';
    }

}

// --- Root Skeleton Generation ---
let rootSkeleton = []; 
let travelPaths = [];  

function buildSkeleton() {
    rootSkeleton = [];
    travelPaths = [];
    seed = initSeedFromDNA(S.dna); 
    const startX = 170, startY = 0;
    const h = S.dna?.colorH || 100;
    const s = (S.dna?.colorS || 60) * 0.6, l = (S.dna?.colorL || 40) * 0.8; 
    const rootColor = `hsl(${h}, ${s}%, ${l}%)`;
    
    const tapWidth = 18;
    const tapLength = 500 + seededRandom() * 100;
    const segmentLen = 10;
    let angle = 90;
    
    let tapPathPoints = [{x: startX, y: 0, s: 1}, {x: startX, y: 20, s: 1}];
    rootSkeleton.push({x1: startX, y1: 0, x2: startX, y2: 20, width: tapWidth, color: rootColor, minStage: 1});

    let currentX = startX, currentY = 20;
    let remaining = tapLength;
    while(remaining > 0) {
        angle += (seededRandom() * 20 - 10);
        angle = angle * 0.7 + 90 * 0.3;
        const rad = (angle * Math.PI) / 180;
        const nextX = currentX + Math.cos(rad) * segmentLen;
        const nextY = currentY + Math.sin(rad) * segmentLen;
        if (nextY > 375) break;

        let depthStage = currentY > 300 ? 5 : (currentY > 240 ? 4 : (currentY > 150 ? 3 : (currentY > 60 ? 2 : 1)));
        const w = tapWidth * (0.35 + 0.65 * (remaining/tapLength));
        rootSkeleton.push({x1: currentX, y1: currentY, x2: nextX, y2: nextY, width: w, color: rootColor, minStage: depthStage});
        
        currentX = nextX; currentY = nextY;
        tapPathPoints.push({x: currentX, y: currentY, s: depthStage});
        remaining -= segmentLen;
    }
    travelPaths.push({ points: tapPathPoints, minStage: 1 });

    const branchCount = 6 + Math.floor(seededRandom() * 4);
    for(let i=0; i < branchCount; i++) {
        const slotSize = tapPathPoints.length / branchCount;
        const idx = Math.floor((i * slotSize) + (seededRandom() * slotSize * 0.8));
        const pt = tapPathPoints[Math.min(idx, tapPathPoints.length - 1)];
        const side = i % 2 === 0 ? 1 : -1;
        const branchAngle = 90 + (side * (70 + seededRandom() * 50));
        const bLen = 150 + seededRandom() * 150;
        const bWidth = tapWidth * 0.55;
        let originStage = pt.y > 240 ? 4 : (pt.y > 60 ? 2 : 1);
        
        growTwistingPath(pt.x, pt.y, branchAngle, bLen, bWidth, rootColor, originStage, 1);
    }
}

function growTwistingPath(startX, startY, startAngle, totalLength, startWidth, color, minStage, depth) {
    let pts = [{x: startX, y: startY, s: minStage}];
    let cursorX = startX, cursorY = startY, currentAngle = startAngle, remaining = totalLength;
    const segLen = 14, twistFactor = depth === 1 ? 25 : 65; 

    while(remaining > 0) {
        if(cursorY > 375 || cursorX < 15 || cursorX > 325) {
            const angleToCenter = Math.atan2(100 - cursorY, 170 - cursorX) * 180 / Math.PI;
            currentAngle = angleToCenter + (seededRandom() * 40 - 20);
            remaining -= segLen * 2; 
            if (remaining <= 0) break;
        }
        currentAngle += (seededRandom() * twistFactor * 2) - twistFactor;
        currentAngle += (90 - currentAngle) * ((minStage >= 5) ? 0.015 : 0.08);
        
        const rad = (currentAngle * Math.PI) / 180;
        const nextX = cursorX + Math.cos(rad) * segLen, nextY = cursorY + Math.sin(rad) * segLen;
        
        let currentSegStage = minStage;
        const dist = totalLength - remaining;
        if (dist > 100) currentSegStage = Math.min(6, minStage + 1);
        if (dist > 200) currentSegStage = Math.min(6, minStage + 1);

        rootSkeleton.push({x1: cursorX, y1: cursorY, x2: nextX, y2: nextY, width: startWidth * (0.4 + 0.6 * (remaining/totalLength)), color: color, minStage: currentSegStage});
        cursorX = nextX; cursorY = nextY;
        pts.push({x: cursorX, y: cursorY, s: currentSegStage});
        remaining -= segLen;
    }
    
    travelPaths.push({ points: pts, minStage: minStage });

    if (depth < 2 && pts.length > 5) {
        let subCount = (minStage >= 4) ? 4 : 2;
        for(let k=0; k<subCount; k++) {
            const sIdx = Math.floor(seededRandom() * pts.length * 0.8);
            const sPt = pts[sIdx];
            const sLen = 60 + seededRandom() * 80;
            growTwistingPath(sPt.x, sPt.y, seededRandom()*360, sLen, startWidth*0.4, color, Math.min(6, minStage+1), depth+1);
        }
    }
}

function initRoots() {
    loadState();
    syncAmbientAudio();
    updateStatusPanel();
    if(rootSVG) {
        rootSVG.innerHTML = '';
        buildSkeleton(); 
        const currentStage = S.stage || 1;
        rootSkeleton.forEach(seg => {
            if(currentStage >= seg.minStage) {
                const thickness = seg.width * (1 + ((currentStage - seg.minStage) * 0.2)); 
                const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
                path.setAttribute("d", `M${seg.x1} ${seg.y1} L${seg.x2} ${seg.y2}`);
                path.setAttribute("stroke", seg.color);
                path.setAttribute("stroke-width", thickness);
                path.setAttribute("stroke-linecap", "round");
                path.setAttribute("opacity", "0.95");
                path.setAttribute("fill", "none"); 
                rootSVG.appendChild(path);
            }
        });
    }
}

// --- Minigame Logic ---

function spawnDroplet() {
    // Fail-safe check for missing waterLayer or game S
    if (!waterLayer || !gameActive) return;
    
    // Explicit return if plant is thirsty (Water <= 0)
    // We check against 0.1 to avoid floating point issues if it's almost zero
    if (S.water !== undefined && S.water <= 0.1) return;

    const currentStage = S.stage || 1;
    const availablePaths = travelPaths.filter(p => p.minStage <= currentStage);
    if (availablePaths.length === 0) return;

    const targetPath = availablePaths[Math.floor(Math.random() * availablePaths.length)];
    const visiblePoints = targetPath.points.filter(p => p.s <= currentStage);
    if (visiblePoints.length < 3) return;

    const isPolluted = Math.random() > (0.85 - (currentStage * 0.02)); 
    const el = document.createElement('div');
    el.className = `water-drop ${isPolluted ? 'polluted' : 'clean'}`;
    
    const tip = visiblePoints[visiblePoints.length - 1];
    el.style.left = tip.x + 'px';
    el.style.top = tip.y + 'px';
    el.style.opacity = "0";
    el.style.transform = "translate(-50%, -50%) scale(0)";
    waterLayer.appendChild(el);

    requestAnimationFrame(() => {
        el.style.transition = "opacity 0.6s ease-out, transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)";
        el.style.opacity = "1";
        el.style.transform = "translate(-50%, -50%) scale(1)";
    });

    let pointIndex = visiblePoints.length - 1;
    let isTapped = false;
    
    // Slightly faster speeds to ensure they are visible and flowing
    const moveSpeed = isPolluted ? 0.04 : 0.07; 
    
    const animate = () => {
        if (!gameActive || isTapped || !el.parentNode) return;

        pointIndex -= moveSpeed;
        if (pointIndex <= 0.05) {
            if (isPolluted) handleMissedPollution(el);
            else el.remove();
            return;
        }

        const idx1 = Math.floor(pointIndex);
        const idx2 = Math.ceil(pointIndex);
        const fraction = pointIndex - idx1;
        const p1 = visiblePoints[idx1];
        const p2 = visiblePoints[idx2] || p1;

        const curX = p1.x + (p2.x - p1.x) * fraction;
        const curY = p1.y + (p2.y - p1.y) * fraction;

        el.style.left = curX + 'px';
        el.style.top = curY + 'px';

        if (pointIndex < 4) {
            const absorbProgress = Math.max(0, pointIndex / 4);
            el.style.transform = `translate(-50%, -50%) scale(${absorbProgress})`;
            el.style.opacity = absorbProgress.toString();
        } else {
            el.style.transform = `translate(-50%, -50%) scale(1)`;
        }

        requestAnimationFrame(animate);
    };

    // Reduced condensation delay for snappier feel
    setTimeout(() => {
        if (gameActive && el.parentNode) requestAnimationFrame(animate);
    }, 600);

    const interaction = (e) => {
        if (isTapped || pointIndex < 2) return; 
        e.preventDefault();
        e.stopPropagation();
        if (isPolluted) {
            isTapped = true;
            const rect = el.getBoundingClientRect();
            const parentRect = waterLayer.getBoundingClientRect();
            collectPollution(el, {
                x: rect.left - parentRect.left + rect.width / 2, 
                y: rect.top - parentRect.top + rect.height / 2
            });
        } else {
            const rect = el.getBoundingClientRect();
            const parentRect = waterLayer.getBoundingClientRect();
            spawnFeedback("Careful!", "#60a5fa", rect.left - parentRect.left + rect.width / 2, rect.top - parentRect.top + rect.height / 2);
            el.style.transition = "opacity 0.2s";
            el.style.opacity = "0.5";
        }
    };

    el.addEventListener('mousedown', interaction);
    el.addEventListener('touchstart', interaction, {passive:false});
}

function collectPollution(el, pt) {
    el.style.transition = "transform 0.4s, opacity 0.4s";
    el.style.transform = "translate(-50%, -50%) scale(2.5)";
    el.style.opacity = "0";
    spawnFeedback("Cleaned!", "#fb923c", pt.x, pt.y);
    setTimeout(() => el.remove(), 400);
    pollutionScore++;
    if (pollutedCountDisplay) pollutedCountDisplay.textContent = pollutionScore;
    saveState();
}

function handleMissedPollution(el) {
    S.soilContamination = Math.min(100, (S.soilContamination || 0) + 1);
    if (rootSVG) {
        rootSVG.classList.remove('root-shudder');
        void rootSVG.offsetWidth; 
        rootSVG.classList.add('root-shudder');
    }
    const rect = el.getBoundingClientRect();
    const parentRect = waterLayer.getBoundingClientRect();
    spawnFeedback("Contaminated!", "#f87171", rect.left - parentRect.left + rect.width / 2, rect.top - parentRect.top + rect.height / 2);
    el.style.transform = "translate(-50%, -50%) scale(0)";
    el.style.opacity = "0";
    setTimeout(() => el.remove(), 400);
    saveState();
}

function spawnFeedback(text, color, x, y) {
    const fb = document.createElement('div');
    fb.textContent = text;
    fb.style.cssText = `position:absolute; left:${x}px; top:${y}px; color:${color}; font-size:11px; font-weight:bold; pointer-events:none; z-index:100; animation: feedbackFloat 1.2s ease-out forwards; white-space:nowrap; text-shadow: 0 1px 4px rgba(0,0,0,0.5); transform: translate(-50%, 0);`;
    waterLayer.appendChild(fb);
    setTimeout(() => fb.remove(), 1200);
}

const styleEl = document.createElement('style');
styleEl.textContent = `
    .root-shudder { animation: rootShudder 0.3s ease-in-out; }
    @keyframes rootShudder {
        0%, 100% { transform: translateX(0); }
        25% { transform: translateX(-2px); }
        50% { transform: translateX(2px); }
        75% { transform: translateX(-1px); }
    }
`;
document.head.appendChild(styleEl);

function initPotView() {
    // If the browser suspended audio on navigation, re-sync on first interaction.
    document.addEventListener('pointerdown', function _resumeAudioOnce() {
        syncAmbientAudio();
        document.removeEventListener('pointerdown', _resumeAudioOnce);
    }, { once: true });

    initRoots();
    if (spawnInterval) clearInterval(spawnInterval);
    const spawnRate = Math.max(400, 1500 - (S.stage * 180));
    spawnInterval = setInterval(spawnDroplet, spawnRate);
    document.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', e => {
            e.preventDefault();
            gameActive = false;
            document.body.classList.add('fade-out');
            setTimeout(() => { window.location.href = link.href; }, 500); 
        });
    });
    document.addEventListener("visibilitychange", () => {
        if (document.hidden) {
            gameActive = false;
            clearInterval(spawnInterval);
            if (waterLayer) waterLayer.innerHTML = '';
        } else {
            gameActive = true;
            loadState();
            syncAmbientAudio();
            updateStatusPanel();
            initRoots();
            if (spawnInterval) clearInterval(spawnInterval); // Ensure only one interval
            const currentSpawnRate = Math.max(400, 1500 - (S.stage * 180));
            spawnInterval = setInterval(spawnDroplet, currentSpawnRate);
        }
    });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initPotView);
else initPotView();
})();

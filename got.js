/**
 * Garden of Time (GoT) - A browsable collection of memories
 * Displays fireflies, ascended plants, and discoveries as flippable index cards
 */

const GOT = {
    isOpen: false,
    currentSection: 'plants', // 'plants', 'fireflies', 'discoveries'
    currentIndex: 0,
    touchStartX: 0,
    touchStartY: 0,

    // Tracks which lore lines have already been shown this session (to avoid repeats)
    usedLore: {
        fireflies: new Set(),
        discoveries: new Set(),
        plants: new Set()
    },
    // Firefly fun facts and lore
    fireflyFacts: {
        0: [ // Ember
            "Ember fireflies are born from the last warm breaths of autumn sunsets.",
            "Their glow can reach temperatures warm enough to thaw morning frost.",
            "Ancient gardeners believed catching an Ember firefly brought luck in love.",
            "They're most active during the golden hour before dusk."
        ],
        1: [ // Citrine
            "Citrine fireflies collect and store starlight in their tiny lanterns.",
            "Their yellow glow has been used to read by on moonless nights.",
            "A gathering of Citrines is called a 'constellation'.",
            "They're attracted to the scent of chamomile and honey."
        ],
        2: [ // Verdant
            "Verdant fireflies only appear where the soil is exceptionally healthy.",
            "Their green light promotes faster leaf growth in nearby plants.",
            "Some say they're the spirits of seeds that never got to sprout.",
            "They taste like fresh mint (not that you should try)."
        ],
        3: [ // Azure
            "Azure fireflies are said to carry memories of rain.",
            "Their blue glow intensifies just before a storm arrives.",
            "They navigate using the earth's magnetic field.",
            "A single Azure can drink three times its weight in morning dew."
        ],
        4: [ // Violet
            "Violet fireflies sleep during full moons - too much competition.",
            "Their purple light is invisible to most predators.",
            "They communicate through patterns only they can perceive.",
            "Ancient texts call them 'twilight's tears'."
        ],
        5: [ // Rose
            "Rose fireflies are hopeless romantics who mate for life.",
            "Their pink glow strengthens the emotional bonds of nearby creatures.",
            "They build tiny nests from flower petals and spider silk.",
            "A Rose firefly's favorite flower? Surprisingly, dandelions."
        ],
        6: [ // Amber
            "Amber fireflies are living fossils, unchanged for millions of years.",
            "Their warm glow contains trace amounts of actual amber resin.",
            "They're excellent listeners (they have no choice - no ears).",
            "Collectors prize them for their calming presence."
        ],
        7: [ // Pearl
            "Pearl fireflies only emerge under specific lunar conditions.",
            "Their white light is actually all colors combined.",
            "They're considered omens of new beginnings.",
            "No two Pearl fireflies have the same glow pattern."
        ]
    },
    
    // Color descriptions for fireflies
    fireflyColorDescriptions: {
        0: "A warm, flickering orange-red like dying embers in a hearth",
        1: "Bright golden yellow, reminiscent of crystallized sunshine",
        2: "Deep forest green with hints of spring meadows",
        3: "Cool cerulean blue like a clear winter sky",
        4: "Rich purple twilight with mysterious undertones",
        5: "Soft pink like cherry blossoms at dawn",
        6: "Warm honey amber with golden highlights",
        7: "Iridescent white with subtle rainbow shimmer"
    },

    // Unique footer quotes for each family
    fireflyQuotes: {
        0: "Born from the last spark of an autumn bonfire.",
        1: "Carrying the memory of the sun into the deepest night.",
        2: "Singing the silent song of roots and reaching branches.",
        3: "Dancing with the rhythm of the rain, even when skies are clear.",
        4: "Keepers of the secrets whispered between midnight blooms.",
        5: "Believing that every garden is a love story waiting to be told.",
        6: "Preserving the golden moments of the past in living light.",
        7: "Lighting the path for new beginnings and fresh starts."
    },
    
    // Discovery unlock stories
    discoveryStories: {
        'first_water': "You learned that even the smallest rain shower can bring tremendous relief. Your plant's first drink was a moment of pure joy.",
        'first_sun': "The moment you gave your plant light, you could almost see it stretch toward the warmth. A simple gift with profound effects.",
        'first_love': "A gentle touch, a moment of attention - your plant responded to kindness in ways you didn't expect.",
        'first_firefly': "A tiny light drifted into your garden, and you realized you weren't alone in caring for this little world.",
        'first_guardian': "Through patience and dedication, you gathered enough kindred spirits to summon something greater.",
        'first_ascension': "Your plant completed its journey, leaving behind a seed of hope. The cycle continues, but the memories remain.",
        'made_rainbow': "Sun and rain together created something magical - a bridge of color across your little sky.",
        'named_plant': "A name transforms a sprout into a friend. You gave your plant an identity, and in return, it gave you purpose.",
        'survived_winter': "Through the harshest season, you kept the flame of life burning. Spring arrived to find you both still standing.",
        'reached_bloom': "The first buds appeared like tiny promises. Your care had finally, visibly, beautifully paid off.",
        'full_bloom': "In full flourish, your plant became a testament to patience. Every petal a letter in a love story you wrote together.",
        'five_generations': "Five cycles of growth, loss, and rebirth. You've built a dynasty of green, each generation carrying forward the legacy.",
        'pot_customized': "You realized that home matters. A personal touch to your plant's dwelling made the whole garden feel more alive.",
        'first_fertilize': "Sometimes love isn't enough - you learned to provide exactly what was needed, when it was needed.",
        'all_families': "The rainbow of fireflies now knows your garden. Each family bringing their own magic to your sanctuary.",
        'sang_to_plant': "Science may debate it, but you know the truth: your plant heard you, and it grew a little taller.",
        'scar_healed': "Scars tell stories, but they don't have to define us. You helped your plant move past its wounds."
    },
    
    // Initialize the Garden of Time
    init() {
        this.normalizeAndDedupeLore();
        this.createOverlay();
        this.bindEvents();
    },
    
    // Create the main overlay HTML
    createOverlay() {
        const overlay = document.createElement('div');
        overlay.id = 'gotOverlay';
        overlay.className = 'got-overlay';
        overlay.innerHTML = `
            <div class="got-container">
                <div class="got-header">
                    <button class="got-close" onclick="GOT.close()" aria-label="Close">×</button>
                    <h1 class="got-title">Garden of Time</h1>
                    <p class="got-subtitle">Memories preserved in amber light</p>
                </div>
                
                <div class="got-tabs">
                    <button class="got-tab active" data-section="plants" onclick="GOT.switchSection('plants')">
                        <span class="got-tab-icon">🌿</span>
                        <span class="got-tab-label">Lineage</span>
                    </button>
                    <button class="got-tab" data-section="fireflies" onclick="GOT.switchSection('fireflies')">
                        <span class="got-tab-icon">✨</span>
                        <span class="got-tab-label">Fireflies</span>
                    </button>
                    <button class="got-tab" data-section="discoveries" onclick="GOT.switchSection('discoveries')">
                        <span class="got-tab-icon">📜</span>
                        <span class="got-tab-label">Discoveries</span>
                    </button>
                </div>
                
                <div class="got-card-area">
                    <button class="got-nav got-nav-prev" onclick="GOT.prevCard()" aria-label="Previous">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M15 18l-6-6 6-6"/>
                        </svg>
                    </button>
                    
                    <div class="got-card-stack" id="gotCardStack">
                        <!-- Cards rendered here -->
                    </div>
                    
                    <button class="got-nav got-nav-next" onclick="GOT.nextCard()" aria-label="Next">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M9 18l6-6-6-6"/>
                        </svg>
                    </button>
                </div>
                
                <div class="got-pagination" id="gotPagination"></div>
                
                <div class="got-empty" id="gotEmpty" style="display:none;">
                    <div class="got-empty-icon">🌱</div>
                    <p class="got-empty-text">Nothing here yet...</p>
                    <p class="got-empty-hint">Keep tending your garden to fill these pages.</p>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
    },
    
    // Bind touch/swipe events
    bindEvents() {
        const stack = document.getElementById('gotCardStack');
        if (!stack) return;
        
        stack.addEventListener('touchstart', (e) => {
            this.touchStartX = e.touches[0].clientX;
            this.touchStartY = e.touches[0].clientY;
        }, { passive: true });
        
        stack.addEventListener('touchend', (e) => {
            const deltaX = e.changedTouches[0].clientX - this.touchStartX;
            const deltaY = e.changedTouches[0].clientY - this.touchStartY;
            
            if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
                if (deltaX > 0) this.prevCard();
                else this.nextCard();
            }
        }, { passive: true });
        
        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (!this.isOpen) return;
            if (e.key === 'ArrowLeft') this.prevCard();
            else if (e.key === 'ArrowRight') this.nextCard();
            else if (e.key === 'Escape') this.close();
        });
    },
    
    // Open the Garden of Time
    open() {
        this.isOpen = true;
        this.currentIndex = 0;
        this.resetLoreSession();
        const overlay = document.getElementById('gotOverlay');
        if (overlay) {
            overlay.classList.add('open');
            this.render();
        }
        // Close the menu if it's open
        const menuOverlay = document.getElementById('menuOverlay');
        if (menuOverlay) menuOverlay.classList.remove('open');
        
        if (typeof pushHistoryState === 'function') pushHistoryState();
    },
    
    // Close the Garden of Time
    close() {
        this.isOpen = false;
        const overlay = document.getElementById('gotOverlay');
        if (overlay) overlay.classList.remove('open');
    },
    
    // Switch between sections
    switchSection(section) {
        this.currentSection = section;
        this.currentIndex = 0;
        
        // Update tab styling
        document.querySelectorAll('.got-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.section === section);
        });
        
        this.render();
    },
    
    // Get data for current section
    getData() {
        switch (this.currentSection) {
            case 'plants':
                return state.history || [];
            case 'fireflies':
                return this.getFireflyData();
            case 'discoveries':
                return this.getDiscoveryData();
            default:
                return [];
        }
    },
    
    // Build firefly card data
    getFireflyData() {
        if (typeof FIREFLY_FAMILIES === 'undefined') return [];
        
        return FIREFLY_FAMILIES.map((family, index) => ({
            family: family,
            index: index,
            count: (state.fireflies && state.fireflies[index]) || 0,
            hasGuardian: typeof hasGuardian === 'function' ? hasGuardian(index) : false
        })).filter(f => f.count > 0 || f.hasGuardian);
    },
    
    // Build discovery card data
    getDiscoveryData() {
        if (!state.discoveries || typeof DISCOVERIES === 'undefined') return [];
        
        return DISCOVERIES.filter(d => state.discoveries.includes(d.id));
    },
    
    // Main render function
    render() {
        const data = this.getData();
        const stack = document.getElementById('gotCardStack');
        const empty = document.getElementById('gotEmpty');
        const pagination = document.getElementById('gotPagination');
        
        if (!stack || !empty || !pagination) return;
        
        if (data.length === 0) {
            stack.style.display = 'none';
            document.querySelector('.got-nav-prev')?.style.setProperty('display', 'none');
            document.querySelector('.got-nav-next')?.style.setProperty('display', 'none');
            pagination.style.display = 'none';
            empty.style.display = 'flex';
            return;
        }
        
        stack.style.display = 'block';
        document.querySelector('.got-nav-prev')?.style.setProperty('display', '');
        document.querySelector('.got-nav-next')?.style.setProperty('display', '');
        pagination.style.display = 'flex';
        empty.style.display = 'none';
        
        // Clamp index
        this.currentIndex = Math.max(0, Math.min(this.currentIndex, data.length - 1));
        
        // Render the current card
        stack.innerHTML = this.renderCard(data[this.currentIndex], this.currentIndex);
        
        // Render pagination dots
        pagination.innerHTML = data.map((_, i) => 
            `<span class="got-dot${i === this.currentIndex ? ' active' : ''}" onclick="GOT.goToCard(${i})"></span>`
        ).join('');
        
        // Update nav button states
        const prevBtn = document.querySelector('.got-nav-prev');
        const nextBtn = document.querySelector('.got-nav-next');
        if (prevBtn) prevBtn.classList.toggle('disabled', this.currentIndex === 0);
        if (nextBtn) nextBtn.classList.toggle('disabled', this.currentIndex === data.length - 1);
        
        // Animate card entrance
        requestAnimationFrame(() => {
            const card = stack.querySelector('.got-card');
            if (card) card.classList.add('visible');
        });

        // FIX: Ensure plant SVG is rendered immediately if in plants section
        if (this.currentSection === 'plants') {
            this.renderPlantSVG();
        }
    },
    
    // Render a single card based on section type
    renderCard(item, index) {
        switch (this.currentSection) {
            case 'plants':
                return this.renderPlantCard(item, index);
            case 'fireflies':
                return this.renderFireflyCard(item);
            case 'discoveries':
                return this.renderDiscoveryCard(item);
            default:
                return '';
        }
    },
    
    // Render an ascended plant card
    renderPlantCard(plant, index) {
        const dna = plant.dna || {};
        const scars = plant.scars || [];
        
        // Build feature descriptions
        const features = [];
        
        // Stem features
        if (dna.stemTexture && dna.stemTexture !== 'smooth') {
            features.push(`${this.capitalize(dna.stemTexture)} stem`);
        }
        if (dna.stemSurface && dna.stemSurface !== 'none') {
            features.push(`${this.capitalize(dna.stemSurface)} on stem`);
        }
        
        // Leaf features
        if (dna.leafShape) {
            features.push(`${this.capitalize(dna.leafShape)} leaves`);
        }
        if (dna.leafEdge && dna.leafEdge !== 'smooth') {
            features.push(`${this.capitalize(dna.leafEdge)} leaf edges`);
        }
        if (dna.leafVariegation && dna.leafVariegation > 0.1) {
            features.push('Variegated foliage');
        }
        
        // Flower features
        if (dna.flowerType) {
            features.push(`${this.capitalize(dna.flowerType)} flower`);
        }
        if (dna.petalCount) {
            features.push(`${dna.petalCount} petals`);
        }
        
        // Scars
        const scarLabels = {
            'wilt': 'Weathered by thirst',
            'bend': 'Shaped by hardship',
            'pale': 'Touched by shadow',
            'dormant': 'Knew deep rest'
        };
        
        const scarDescriptions = scars.map(s => scarLabels[s] || s).filter(Boolean);
        
        // Stats
        const stage = (typeof STAGES !== 'undefined' && STAGES[plant.stage - 1]) || `Stage ${plant.stage}`;
        
        // Color info
        const stemColor = `hsl(${dna.colorH || 120}, ${dna.colorS || 50}%, ${dna.colorL || 40}%)`;
        const flowerColor = dna.flowerColor || `hsl(${dna.flowerH || 0}, ${dna.flowerS || 70}%, ${dna.flowerL || 60}%)`;
        
        // Pot Info
        const potColor = plant.potColor || '#e07a5f';
        const potPattern = plant.potPattern && plant.potPattern !== 'patNone' ? plant.potPattern : null;

        return `
            <div class="got-card got-card-plant">
                <div class="got-card-index">${index + 1} of ${state.history.length}</div>
                
                <div class="got-card-header plant-header">
                    <div class="got-plant-preview" id="gotPlantPreview${index}">
                        <svg viewBox="0 0 200 250" class="got-plant-svg">
                            <defs id="gotPlantDefs${index}"></defs>
                            <g id="gotPlantGroup${index}"></g>
                            <!-- FIX: Pot Layering - Body, Pattern, Soil, then Rim -->
                            <g id="gotPotGroup${index}">
                                <!-- Pot Body -->
                                <path d="M72 197 L128 197 L118 232 L82 232 Z" fill="${potColor}" />
                                <!-- Pot Pattern -->
                                ${potPattern ? `<path d="M72 199 L128 199 L118 232 L82 232 Z" fill="url(#${potPattern})" style="opacity:0.9; mix-blend-mode: overlay;" />` : ''}
                                <!-- Dirt (Soil) - Drawn before rim so it's inside -->
                                <ellipse cx="100" cy="191" rx="24" ry="7" fill="#5d4037" />
                                <!-- Pot Rim -->
                                <path d="M68 189 L132 189 L128 199 L72 199 Z" fill="${potColor}" style="filter:brightness(1.1)" />
                            </g>
                        </svg>
                    </div>
                    <h2 class="got-card-name">${this.escapeHtml(plant.name)}</h2>
                    <div class="got-card-gen">Generation ${plant.gen}</div>
                </div>
                
                <div class="got-card-body">
                    <div class="got-card-section">
                        <div class="got-card-label">Life Summary</div>
                        <div class="got-stat-row">
                            <span>Days Lived</span>
                            <span class="got-stat-value">${plant.days}</span>
                        </div>
                        <div class="got-stat-row">
                            <span>Final Stage</span>
                            <span class="got-stat-value">${stage}</span>
                        </div>
                    </div>
                    
                    <div class="got-card-section">
                        <div class="got-card-label">Colors</div>
                        <div class="got-color-row">
                            <span class="got-color-swatch" style="background:${stemColor}"></span>
                            <span>Foliage</span>
                        </div>
                        <div class="got-color-row">
                            <span class="got-color-swatch" style="background:${flowerColor}"></span>
                            <span>Flower</span>
                        </div>
                    </div>
                    
                    ${features.length > 0 ? `
                    <div class="got-card-section">
                        <div class="got-card-label">Distinguishing Features</div>
                        <div class="got-features">
                            ${features.map(f => `<span class="got-feature-tag">${f}</span>`).join('')}
                        </div>
                    </div>
                    ` : ''}
                    
                    ${scarDescriptions.length > 0 ? `
                    <div class="got-card-section">
                        <div class="got-card-label">Life's Marks</div>
                        <div class="got-scars">
                            ${scarDescriptions.map(s => `<div class="got-scar">${s}</div>`).join('')}
                        </div>
                    </div>
                    ` : ''}
                </div>
                
                <div class="got-card-footer">
                    <div class="got-card-quote">"Every plant that passes leaves seeds of wisdom."</div>
                </div>
            </div>
        `;
    },
    
    // Render a firefly card
    renderFireflyCard(data) {
        const family = data.family;
        const index = data.index;
        const count = data.count;
        const hasGuardian = data.hasGuardian;
        
        const color = typeof getFireflyColor === 'function' 
            ? getFireflyColor(index) 
            : `hsl(${family.hue || 0}, 70%, 60%)`;
        
        const colorDesc = this.fireflyColorDescriptions[index] || 'A beautiful, mysterious glow';
        const facts = this.fireflyFacts[index] || [];
        const randomFact = this.pickUniqueLoreLine('fireflies', facts, `${family.name} fireflies are easiest to spot when the garden is perfectly still.`);
        
        // Fetch specific quote or fallback
        const quote = this.fireflyQuotes[index] || `${family.name} fireflies remember every garden they've visited.`;
        
        const totalFireflies = this.getFireflyData().length;
        const currentNum = this.getFireflyData().findIndex(f => f.index === index) + 1;
        
        return `
            <div class="got-card got-card-firefly" style="--firefly-color: ${color}">
                <div class="got-card-index">${currentNum} of ${totalFireflies}</div>
                
                <div class="got-card-header firefly-header">
                    <div class="got-firefly-orb">
                        <div class="got-firefly-glow"></div>
                        <div class="got-firefly-core"></div>
                    </div>
                    <h2 class="got-card-name">${family.name}</h2>
                    <div class="got-card-subtitle">Family</div>
                </div>
                
                <div class="got-card-body">
                    <div class="got-card-section">
                        <div class="got-card-label">Collection</div>
                        <div class="got-firefly-count">
                            <span class="got-count-num">${count}</span>
                            <span class="got-count-label">gathered</span>
                        </div>
                        ${hasGuardian ? '<div class="got-guardian-badge">👑 Guardian Present</div>' : ''}
                    </div>
                    
                    <div class="got-card-section">
                        <div class="got-card-label">Their Light</div>
                        <p class="got-color-desc">${colorDesc}</p>
                    </div>
                    
                    <div class="got-card-section">
                        <div class="got-card-label">Power</div>
                        <p class="got-power-desc">${family.desc || family.power || 'Unknown power'}</p>
                    </div>
                    
                    <div class="got-card-section">
                        <div class="got-card-label">Did You Know?</div>
                        <p class="got-fact">${randomFact}</p>
                    </div>
                </div>
                
                <div class="got-card-footer">
                    <div class="got-card-quote">"${quote}"</div>
                </div>
            </div>
        `;
    },
    
    // Render a discovery card
    renderDiscoveryCard(discovery) {
        const storyBase = this.discoveryStories[discovery.id] || 'A moment worth remembering.';
        const story = this.pickUniqueLoreLine('discoveries', [storyBase], storyBase);
        const unlocked = state.discoveries || [];
        const currentNum = unlocked.indexOf(discovery.id) + 1;
        const total = unlocked.length;
        
        return `
            <div class="got-card got-card-discovery">
                <div class="got-card-index">${currentNum} of ${total}</div>
                
                <div class="got-card-header discovery-header">
                    <div class="got-discovery-icon">${discovery.icon}</div>
                    <h2 class="got-card-name">${discovery.name}</h2>
                    <div class="got-card-subtitle">Discovery</div>
                </div>
                
                <div class="got-card-body">
                    <div class="got-card-section">
                        <div class="got-card-label">Achievement</div>
                        <p class="got-discovery-desc">${discovery.desc}</p>
                    </div>
                    
                    <div class="got-card-section">
                        <div class="got-card-label">The Story</div>
                        <p class="got-discovery-story">${story}</p>
                    </div>
                </div>
                
                <div class="got-card-footer">
                    <div class="got-discovery-stamp">✓ Discovered</div>
                </div>
            </div>
        `;
    },
    
    // Navigation
    nextCard() {
        const data = this.getData();
        if (this.currentIndex < data.length - 1) {
            this.currentIndex++;
            this.animateCardTransition('next');
        }
    },
    
    prevCard() {
        if (this.currentIndex > 0) {
            this.currentIndex--;
            this.animateCardTransition('prev');
        }
    },
    
    goToCard(index) {
        const data = this.getData();
        if (index >= 0 && index < data.length && index !== this.currentIndex) {
            const direction = index > this.currentIndex ? 'next' : 'prev';
            this.currentIndex = index;
            this.animateCardTransition(direction);
        }
    },
    
    // Animate card transitions
    animateCardTransition(direction) {
        const stack = document.getElementById('gotCardStack');
        if (!stack) return;
        
        const currentCard = stack.querySelector('.got-card');
        if (currentCard) {
            currentCard.classList.add(`exit-${direction}`);
        }
        
        setTimeout(() => {
            this.render();
            
            // Render plant SVG if needed
            if (this.currentSection === 'plants') {
                this.renderPlantSVG();
            }
        }, 150);
    },
    
    // Render the plant SVG for plant cards
    renderPlantSVG() {
        const data = this.getData();
        if (data.length === 0) return;
        
        const plant = data[this.currentIndex];
        const groupId = `gotPlantGroup${this.currentIndex}`;
        
        if (typeof renderPlant === 'function' && plant.dna) {
            setTimeout(() => {
                // Ensure the SVG container exists before trying to render
                if (document.getElementById(groupId)) {
                    renderPlant(groupId, plant.dna, plant.stage, plant.scars || []);
                }
            }, 50);
        }
    },
    

// Lore uniqueness + dedupe helpers
resetLoreSession() {
    // Fresh session each time the overlay opens
    this.usedLore.fireflies = new Set();
    this.usedLore.discoveries = new Set();
    this.usedLore.plants = new Set();
},

normalizeLoreLine(str) {
    return String(str || '')
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .trim();
},

normalizeAndDedupeLore() {
    // Enforce: no duplicate lore lines across firefly families and other entries.
    // We keep the first occurrence and remove later duplicates.
    const seen = new Set();

    // Firefly facts (across ALL families)
    if (this.fireflyFacts && typeof this.fireflyFacts === 'object') {
        Object.keys(this.fireflyFacts).forEach((k) => {
            const arr = Array.isArray(this.fireflyFacts[k]) ? this.fireflyFacts[k] : [];
            const unique = [];
            for (const line of arr) {
                const key = this.normalizeLoreLine(line);
                if (!key) continue;
                if (seen.has(key)) continue;
                seen.add(key);
                unique.push(line);
            }
            this.fireflyFacts[k] = unique;
        });
    }

    // Quotes
    if (this.fireflyQuotes && typeof this.fireflyQuotes === 'object') {
        Object.keys(this.fireflyQuotes).forEach((k) => {
            const line = this.fireflyQuotes[k];
            const key = this.normalizeLoreLine(line);
            if (!key) return;
            if (seen.has(key)) {
                // If a quote duplicates something else, give it a family-specific twist
                this.fireflyQuotes[k] = `${line} (${(this.getFireflyFamilyNameSafe && this.getFireflyFamilyNameSafe(k)) || 'A family'}.)`;
            } else {
                seen.add(key);
            }
        });
    }

    // Discovery stories
    if (this.discoveryStories && typeof this.discoveryStories === 'object') {
        Object.keys(this.discoveryStories).forEach((k) => {
            const line = this.discoveryStories[k];
            const key = this.normalizeLoreLine(line);
            if (!key) return;
            if (seen.has(key)) {
                this.discoveryStories[k] = `${line} (A distinct page in your Garden of Time.)`;
            } else {
                seen.add(key);
            }
        });
    }
},

getFireflyFamilyNameSafe(index) {
    try {
        if (typeof FIREFLY_FAMILIES !== 'undefined' && FIREFLY_FAMILIES[index]) return FIREFLY_FAMILIES[index].name;
    } catch (e) {}
    return null;
},

pickUniqueLoreLine(bucket, candidates, fallback) {
    const set = this.usedLore[bucket] || (this.usedLore[bucket] = new Set());
    const list = Array.isArray(candidates) ? candidates : [];
    // Try a few random draws first
    for (let tries = 0; tries < Math.min(10, list.length); tries++) {
        const line = list[Math.floor(Math.random() * list.length)];
        const key = this.normalizeLoreLine(line);
        if (!key) continue;
        if (set.has(key)) continue;
        set.add(key);
        return line;
    }
    // Deterministic fallback: first unseen
    for (const line of list) {
        const key = this.normalizeLoreLine(line);
        if (!key) continue;
        if (set.has(key)) continue;
        set.add(key);
        return line;
    }
    // If everything is exhausted, return a bucket-specific fallback that will still be unique in practice
    const fb = fallback || 'A quiet truth of the garden.';
    const fbKey = this.normalizeLoreLine(fb);
    if (!set.has(fbKey)) set.add(fbKey);
    return fb;
},

    // Utility functions
    capitalize(str) {
        if (!str) return '';
        return str.charAt(0).toUpperCase() + str.slice(1);
    },
    
    escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => GOT.init());
} else {
    GOT.init();
}

// Export for global access
window.GOT = GOT;
window.openGardenOfTime = () => GOT.open();
window.closeGardenOfTime = () => GOT.close();
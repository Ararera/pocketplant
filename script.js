/* ═══════════════════════════════════════════════════════════════
   POCKET SPROUT — MAIN SCRIPT
   A gentle plant care game
   ═══════════════════════════════════════════════════════════════ */

// ═══════════════════════════════════════════════════════════════
// CONSTANTS & CONFIGURATION
// ═══════════════════════════════════════════════════════════════

const POT_COLORS = ['#e07a5f','#d4a373','#8d99ae','#ef476f','#118ab2','#06d6a0','#ffd166','#a8dadc','#457b9d','#e63946','#f1faee','#2a9d8f','#264653','#f4a261','#e76f51','#cdb4db','#ffc8dd','#ffafcc','#bde0fe','#a2d2ff','#606c38','#283618','#fefae0','#dda15e','#bc6c25','#333333'];
const PATTERN_COLORS = ['rgba(255,255,255,0.5)','rgba(255,255,255,0.3)','rgba(0,0,0,0.2)','#ffd700','#c0c0c0','#cd7f32','#f472b6','#60a5fa','#4ade80'];
const PATTERNS = [{id:'patNone',name:'None',unlockAt:0},{id:'patStripes',name:'///',unlockAt:5},{id:'patHearts',name:'♥',unlockAt:15},{id:'patWaves',name:'〰',unlockAt:30},{id:'patNotes',name:'♪',unlockAt:50},{id:'patChecks',name:'▦',unlockAt:75},{id:'patStars',name:'★',unlockAt:100},{id:'patDiamonds',name:'◆',unlockAt:150},{id:'patLeaves',name:'🌿',unlockAt:200},{id:'patMoons',name:'☽',unlockAt:300}];

const FIREFLY_FAMILIES = [
    {name:'Ember',hue:15,power:'warmth',desc:'Restores sun vitality',effect:'sun'},
    {name:'Citrine',hue:45,power:'growth',desc:'Accelerates growth',effect:'growth'},
    {name:'Verdant',hue:120,power:'vitality',desc:'Boosts overall health',effect:'health'},
    {name:'Aqua',hue:180,power:'hydration',desc:'Restores water',effect:'water'},
    {name:'Azure',hue:210,power:'calm',desc:'Slows decay',effect:'slow'},
    {name:'Violet',hue:270,power:'dreams',desc:'Increases luck',effect:'luck'},
    {name:'Rose',hue:330,power:'love',desc:'Fills with affection',effect:'love'},
    {name:'Pearl',hue:0,sat:15,power:'mystery',desc:'Random powerful effects',effect:'random'}
];

const GUARDIAN_THRESHOLD = 10;
const SEASONS = [{name:'Spring',icon:'🌸',growth:1.1},{name:'Summer',icon:'☀️',growth:1.2},{name:'Autumn',icon:'🍂',growth:0.9},{name:'Winter',icon:'❄️',growth:0.7}];
const MOON_PHASES = [{name:'New Moon',icon:'🌑',phase:100},{name:'Waxing Crescent',icon:'🌒',phase:75},{name:'First Quarter',icon:'🌓',phase:50},{name:'Waxing Gibbous',icon:'🌔',phase:25},{name:'Full Moon',icon:'🌕',phase:0},{name:'Waning Gibbous',icon:'🌖',phase:-25},{name:'Last Quarter',icon:'🌗',phase:-50},{name:'Waning Crescent',icon:'🌘',phase:-75}];
const STAGES = ['Shoot','Seedling','Sprout','Budding','Bloom','Flourish'];
const STAGE_THRESHOLDS = [0,300,1000,2500,5000,8000];
const MOODS = {thriving:{text:'basking contentedly',color:'#4ade80',threshold:75},content:{text:'swaying gently',color:'#a3e635',threshold:55},restless:{text:'reaching for light',color:'#facc15',threshold:35},struggling:{text:'wilting slowly',color:'#fb923c',threshold:15},dormant:{text:'in deep slumber',color:'#f87171',threshold:0}};
const PLANT_STATES = {thriving:{min:80,label:"Thriving",color:"#4ade80"},content:{min:60,label:"Content",color:"#a3e635"},restless:{min:40,label:"Restless",color:"#facc15"},strained:{min:20,label:"Strained",color:"#fb923c"},dormant:{min:0,label:"Dormant",color:"#f87171"}};
const INHERITABLE_TRAITS = [{id:'resilience',name:'Resilient',desc:'Slower stat decay'},{id:'bloomSpeed',name:'Quick Bloomer',desc:'Faster growth'},{id:'leafiness',name:'Lush',desc:'More leaves'},{id:'colorVibrancy',name:'Vibrant',desc:'Richer colors'},{id:'flowerPower',name:'Floriferous',desc:'More flowers'},{id:'fireflyAffinity',name:'Firefly Friend',desc:'Attracts more fireflies'}];
const CONFIG = {decayRate:{water:0.035,sun:0.035,love:0.02},growthRate:0.35,tickRate:1000,threshold:40,deathTimeLimit:12*60*60*1000,offlineDecayFactor:0.08,singCooldown:300000,fertilizeCooldown:180000,maxFireflyPerFamily:50,debugTapThreshold:20};
const DREAMS = ["dreamed of distant mountains","listened to rain and remembered forests","felt roots intertwining with the past","saw gardens yet to bloom","remembered its first sunrise","heard whispers from sleeping seeds","imagined dancing with fireflies","felt the heartbeat of the earth","dreamed of butterfly wings","whispered secrets to the moon"];

// ═══════════════════════════════════════════════════════════════
// GAME STATE
// ═══════════════════════════════════════════════════════════════

let state = {water:50,sun:50,love:50,growth:0,stage:1,isSunLampOn:false,isRainOn:false,day:1,generation:1,name:"Sprout",season:0,dna:null,potColor:POT_COLORS[0],potPattern:'patNone',potPatternColor:'rgba(255,255,255,0.5)',timeAtZero:0,isDead:false,history:[],lastSave:Date.now(),growthMultiplier:1,singCooldownUntil:0,fertilizeCooldownUntil:0,fireflies:{},totalFireflies:0,activeGuardians:[],buffs:[],scars:[],crisisCount:0,inheritedTraits:[],lastDream:null,isMusicPlaying:false};
let els = {}, selectedFamily = null, activeBigFireflies = [];

// ═══════════════════════════════════════════════════════════════
// AUDIO ENGINE
// ═══════════════════════════════════════════════════════════════

const audio = {
    ctx:null,rainOsc:null,rainGain:null,isRainPlaying:false,bgTimer:null,isMusicPlaying:false,
    init(){if(!this.ctx)this.ctx=new(window.AudioContext||window.webkitAudioContext)()},
    play(freq,type,dur,vol=0.05){if(!this.ctx)this.init();if(this.ctx.state==='suspended')this.ctx.resume();const o=this.ctx.createOscillator(),g=this.ctx.createGain();o.type=type;o.frequency.value=freq;g.gain.setValueAtTime(0.01,this.ctx.currentTime);g.gain.linearRampToValueAtTime(vol,this.ctx.currentTime+0.05);g.gain.exponentialRampToValueAtTime(0.001,this.ctx.currentTime+dur);o.connect(g);g.connect(this.ctx.destination);o.start();o.stop(this.ctx.currentTime+dur)},
    startRainSound(){if(!this.ctx)this.init();if(this.ctx.state==='suspended')this.ctx.resume();this.stopRainSound();this.isRainPlaying=true;const buf=this.ctx.createBuffer(1,this.ctx.sampleRate*2,this.ctx.sampleRate);const d=buf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*0.1;this.rainOsc=this.ctx.createBufferSource();this.rainOsc.buffer=buf;this.rainOsc.loop=true;this.rainGain=this.ctx.createGain();this.rainGain.gain.value=0;this.rainOsc.connect(this.rainGain);this.rainGain.connect(this.ctx.destination);this.rainOsc.start();this.rainGain.gain.linearRampToValueAtTime(0.05,this.ctx.currentTime+2)},
    stopRainSound(){this.isRainPlaying=false;if(this.rainGain&&this.rainOsc){try{this.rainGain.gain.linearRampToValueAtTime(0,this.ctx.currentTime+0.5);const o=this.rainOsc;setTimeout(()=>{try{o.stop()}catch(e){}},600)}catch(e){}}this.rainOsc=null;this.rainGain=null},
    toggleRainSound(on){if(on&&!this.isRainPlaying)this.startRainSound();else if(!on&&this.isRainPlaying)this.stopRainSound()},
    water(){this.play(800,'sine',0.2)},sun(){this.play(300,'triangle',0.5)},love(){this.play(150,'sine',0.5)},chime(){this.play(600,'sine',0.1);this.play(800,'sine',0.2)},
    song:[{f:262,d:3},{f:0,d:2},{f:392,d:2},{f:0,d:3},{f:311,d:2},{f:262,d:2},{f:0,d:4},{f:196,d:3},{f:0,d:1},{f:262,d:2},{f:311,d:3},{f:0,d:2},{f:392,d:2},{f:349,d:2},{f:311,d:4},{f:0,d:3}],
    playBackgroundMusic(){if(!this.ctx)this.init();if(this.ctx.state==='suspended')this.ctx.resume();if(this.isMusicPlaying)return;this.isMusicPlaying=true;let i=0;const play=()=>{if(!this.isMusicPlaying)return;const n=this.song[i%this.song.length];if(n.f>0)this.play(n.f,'sine',n.d*0.4,0.03);i++;this.bgTimer=setTimeout(play,n.d*400)};play()},
    stopBackgroundMusic(){this.isMusicPlaying=false;if(this.bgTimer)clearTimeout(this.bgTimer)}
};

// ═══════════════════════════════════════════════════════════════
// INITIALIZATION
// ═══════════════════════════════════════════════════════════════

function init(){
    cacheElements();loadState();
    if(!state.dna)state.dna=generateDNA();
    initPatterns();setupWorld();setupWeather();
    renderPlant('plantGroup',state.dna,state.stage);
    renderPotPreview();updateTimeOfDay();updateMoonPhase();updateSeason();updateUI();
    if(state.isRainOn)applyTheme();
    processOfflineProgress();
    startGameLoop();setupEventListeners();
    setInterval(()=>{updateTimeOfDay();updateMoonPhase()},60000);
    audio.init();
}

function cacheElements(){
    ['skyLayer','starsContainer','moonElement','moonlightBeam','seasonalContainer','rainContainer','rainbowContainer','statusArea','genBadge','plantNameDisplay','plantMoodDisplay','seasonIndicator','evolutionBar','menuOverlay','fireflyOverlay','potOverlay','helpOverlay','harvestOverlay','deathOverlay','archiveOverlay','resetOverlay','welcomeToast','toastBody','plantHero','plantGraphics','potGroup','plantGroup','vitals','ringWater','ringSun','ringLove','nameInput','menuGen','menuAge','menuStage','menuHealth','menuProgressBar','menuScars','menuScarList','menuInherited','menuInheritedList','greenhouseList','btnHarvest','btnSing','btnFertilize','btnMusic','btnReset','btnRain','btnSun','btnMenu','fireflyFamilyGrid','familyDetailPanel','detailOrb','detailFamilyName','detailFamilyPower','detailFireflyCount','releaseBtn','guardianProgressText','potColorGrid','potPatternGrid','patternColorGrid','potPreviewGroup','harvestPlantGroup','inheritedTraitDisplay','archivePlantGroup','archivePotGroup','archiveTitle','archiveStats','debugPanel','debugLog','debugState'].forEach(id=>els[id]=document.getElementById(id));
}

function setupEventListeners(){
    document.addEventListener("visibilitychange",handleVisibility);
    window.addEventListener("pagehide",saveState);
    window.addEventListener("beforeunload",()=>saveState());
    const pot=document.getElementById('potGroup');
    if(pot){
        pot.addEventListener('mousedown',()=>handlePress(true));
        pot.addEventListener('mouseup',()=>handlePress(false));
        pot.addEventListener('mouseleave',()=>handlePress(false));
        pot.addEventListener('touchstart',e=>{e.preventDefault();handlePress(true)},{passive:false});
        pot.addEventListener('touchend',e=>{e.preventDefault();handlePress(false)});
    }
    setInterval(()=>{checkSingCooldown();checkFertilizeCooldown()},1000);
    checkSingCooldown();checkFertilizeCooldown();
    window.addEventListener('popstate',handleBackButton);
    if(!history.state||!history.state.pocketSprout){history.replaceState({pocketSprout:true,depth:0},'')}
    pushHistoryState();
    // Position moonbeam after layout settles
    requestAnimationFrame(() => {
        requestAnimationFrame(positionMoonbeam);
    });
    window.addEventListener('resize', () => requestAnimationFrame(positionMoonbeam));
}

function pushHistoryState(){const depth=(history.state?.depth||0)+1;history.pushState({pocketSprout:true,depth:depth},'')}

// Position moonbeam from moon center to pot center
function positionMoonbeam(){
    const moon = document.getElementById('moonElement');
    const beam = document.getElementById('moonlightBeam');
    const potGroup = document.getElementById('potGroup');
    if(!moon || !beam || !potGroup) return;
    
    // Get moon center position
    const moonRect = moon.getBoundingClientRect();
    const moonCenterX = moonRect.left + moonRect.width / 2;
    const moonCenterY = moonRect.top + moonRect.height / 2;
    
    // Get pot center position
    const potRect = potGroup.getBoundingClientRect();
    const potCenterX = potRect.left + potRect.width / 2;
    const potCenterY = potRect.top + potRect.height / 2;
    
    // Calculate vector from moon to pot
    const dx = potCenterX - moonCenterX;
    const dy = potCenterY - moonCenterY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Calculate angle: atan2(x, y) gives angle from positive Y axis (pointing down)
    // Positive angle = clockwise rotation, negative = counter-clockwise
    // Since pot is typically to the LEFT of moon, dx is negative, so angle will be negative
    const angleRad = Math.atan2(dx, dy);
    const angleDeg = angleRad * (180 / Math.PI);
    
    // Position beam: top-left corner at moon center, then shift left by half width
    beam.style.left = moonCenterX + 'px';
    beam.style.top = moonCenterY + 'px';
    beam.style.height = (distance + 80) + 'px';
    beam.style.transform = `translateX(-50%) rotate(${angleDeg}deg)`;
}

function initPatterns(){
    const defs=document.getElementById('plantDefs');
    if(defs){
        defs.innerHTML+=`<pattern id="patNone" width="10" height="10" patternUnits="userSpaceOnUse"></pattern><pattern id="patStripes" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="4" height="8" fill="var(--pot-pat-color)"/></pattern><pattern id="patHearts" width="16" height="16" patternUnits="userSpaceOnUse"><path d="M8 5C8 3 6 2 4 3 2 4 2 7 4 9L8 13 12 9C14 7 14 4 12 3 10 2 8 3 8 5" fill="var(--pot-pat-color)" transform="scale(0.8)translate(2,2)"/></pattern><pattern id="patWaves" width="20" height="10" patternUnits="userSpaceOnUse"><path d="M0 5Q5 0 10 5T20 5" fill="none" stroke="var(--pot-pat-color)" stroke-width="2"/></pattern><pattern id="patNotes" width="16" height="16" patternUnits="userSpaceOnUse"><circle cx="6" cy="10" r="3" fill="var(--pot-pat-color)"/><path d="M9 10V3H14" fill="none" stroke="var(--pot-pat-color)" stroke-width="1.5"/></pattern><pattern id="patChecks" width="12" height="12" patternUnits="userSpaceOnUse"><rect width="6" height="6" fill="var(--pot-pat-color)"/><rect x="6" y="6" width="6" height="6" fill="var(--pot-pat-color)"/></pattern><pattern id="patStars" width="20" height="20" patternUnits="userSpaceOnUse"><polygon points="10,2 12,8 18,8 13,12 15,18 10,14 5,18 7,12 2,8 8,8" fill="var(--pot-pat-color)" transform="scale(0.7)translate(4,4)"/></pattern><pattern id="patDiamonds" width="14" height="14" patternUnits="userSpaceOnUse"><polygon points="7,1 13,7 7,13 1,7" fill="var(--pot-pat-color)" transform="scale(0.7)translate(3,3)"/></pattern><pattern id="patLeaves" width="14" height="14" patternUnits="userSpaceOnUse"><path d="M7 2Q10 5 7 11 4 5 7 2" fill="var(--pot-pat-color)"/></pattern><pattern id="patMoons" width="16" height="16" patternUnits="userSpaceOnUse"><path d="M10 3A5 5 0 1 1 10 13A4 4 0 1 0 10 3" fill="var(--pot-pat-color)"/></pattern>`;
    }
    ['previewDefs','harvestDefs','archiveDefs'].forEach(id=>{const d=document.getElementById(id);if(d&&defs)d.innerHTML=defs.innerHTML});
}

// ═══════════════════════════════════════════════════════════════
// TIME & ENVIRONMENT
// ═══════════════════════════════════════════════════════════════

function getTimeOfDay(){const h=new Date().getHours();if(h>=5&&h<7)return'dawn';if(h>=7&&h<10)return'morning';if(h>=10&&h<16)return'day';if(h>=16&&h<18)return'afternoon';if(h>=18&&h<20)return'dusk';if(h>=20&&h<22)return'evening';return'night'}
function isDaytime(){return['dawn','morning','day','afternoon','dusk'].includes(getTimeOfDay())}
function updateTimeOfDay(){const t=getTimeOfDay();document.body.className=document.body.className.replace(/time-\w+/g,'');document.body.classList.add('time-'+t);updateSeasonalVisuals()}
function getMoonPhase(){const n=new Date(),jd=Math.floor(365.25*n.getFullYear())+Math.floor(30.6*(n.getMonth()+1))+n.getDate()-694039.09,p=jd/29.53058867;return MOON_PHASES[Math.floor((p-Math.floor(p))*8)%8]}
function updateMoonPhase(){const p=getMoonPhase();const me=document.getElementById('moonElement');if(me)me.style.setProperty('--moon-phase',p.phase+'%');updateSeason()}
function isNewMoon(){return getMoonPhase().name==='New Moon'}
function updateSeason(){const s=SEASONS[state.season%4];const i=document.getElementById('seasonIndicator');if(i)i.textContent=`${s.icon} ${s.name}`;updateSeasonalVisuals()}

function updateSeasonalVisuals(){
    const c=document.getElementById('seasonalContainer');if(!c)return;
    const sn=SEASONS[state.season%4].name;
    const currentKey=sn+(sn==='Summer'?isDaytime():'');
    if(c.dataset.season===currentKey)return;
    c.dataset.season=currentKey;c.innerHTML='';
    if(sn==='Spring'){for(let i=0;i<10;i++){const b=document.createElement('div');b.className='seasonal-blossom';b.style.left=(Math.random()*120-10)+'%';b.style.animationDelay=(Math.random()*-30)+'s';b.style.animationDuration=(18+Math.random()*12)+'s';c.appendChild(b)}}
    else if(sn==='Summer'){if(isDaytime()){for(let i=0;i<3;i++){const b=document.createElement('div');b.className='seasonal-beam';b.style.left=(20+Math.random()*60)+'%';b.style.animationDelay=(Math.random()*-5)+'s';c.appendChild(b)}}}
    else if(sn==='Autumn'){for(let i=0;i<10;i++){const l=document.createElement('div');l.className='seasonal-leaf';l.style.left=(Math.random()*120-20)+'%';l.style.animationDelay=(Math.random()*-25)+'s';l.style.animationDuration=(15+Math.random()*10)+'s';l.style.backgroundColor=['#e67e22','#d35400','#f1c40f'][Math.floor(Math.random()*3)];c.appendChild(l)}}
    else if(sn==='Winter'){for(let i=0;i<40;i++){const s=document.createElement('div');s.className='seasonal-snow';s.style.left=Math.random()*100+'%';s.style.animationDelay=(Math.random()*-20)+'s';s.style.animationDuration=(10+Math.random()*5)+'s';c.appendChild(s)}}
}

function setupWorld(){const c=Math.min(80,20+state.generation*8),s=document.getElementById('starsContainer');if(s){s.innerHTML='';for(let i=0;i<c;i++){const star=document.createElement('div');star.className='star';star.style.cssText=`left:${Math.random()*100}%;top:${Math.random()*60}%;--dur:${3+Math.random()*4}s;--delay:${Math.random()*5}s;--brightness:${0.4+Math.random()*0.6}`;s.appendChild(star)}}}
function setupWeather(){const r=document.getElementById('rainContainer');if(r){r.innerHTML='';for(let i=0;i<60;i++){const d=document.createElement('div');d.className='raindrop';d.style.cssText=`left:${Math.random()*100}%;animation-delay:${Math.random()*2}s;animation-duration:${0.6+Math.random()*0.4}s`;r.appendChild(d)}}}

// ═══════════════════════════════════════════════════════════════
// DNA & PLANT GENERATION
// ═══════════════════════════════════════════════════════════════

function generateDNA(parent=null){
    const wild=Math.random()>0.75,baseH=wild?Math.random()*360:80+Math.random()*80;
    const dna={colorH:parent?lerp(parent.colorH,baseH,0.3):baseH,colorS:45+Math.random()*35,colorL:35+Math.random()*20,flowerH:Math.random()*360,flowerS:60+Math.random()*30,flowerL:55+Math.random()*20,stemCurve:parent?parent.stemCurve*0.3+(Math.random()-0.5)*40:(Math.random()-0.5)*30,stemHeight:70+Math.random()*30,leafCount:Math.floor(3+Math.random()*3),leafNodes:Math.floor(3+Math.random()*3),leafSize:0.8+Math.random()*0.4,leafScale:0.9+Math.random()*0.3,leafAngle:35+Math.random()*30,leafShape:['round','pointed','heart','oak'][Math.floor(Math.random()*4)],leanDirection:Math.random()>0.5?1:-1,branchSpread:20+Math.random()*15,flowerCount:Math.floor(1+Math.random()*3),petalCount:Math.floor(4+Math.random()*5),petalShape:['round','pointed','wavy'][Math.floor(Math.random()*3)],resilience:parent?.resilience||(0.8+Math.random()*0.4),bloomSpeed:parent?.bloomSpeed||(0.9+Math.random()*0.2),fireflyChance:parent?.fireflyChance||0.05};
    state.inheritedTraits.forEach(tid=>{const t=INHERITABLE_TRAITS.find(x=>x.id===tid);if(t){if(tid==='resilience')dna.resilience=Math.min(2,(dna.resilience||1)+0.2);if(tid==='bloomSpeed')dna.bloomSpeed=Math.min(1.5,(dna.bloomSpeed||1)+0.1);if(tid==='leafiness')dna.leafNodes=Math.min(6,(dna.leafNodes||4)+1);if(tid==='colorVibrancy')dna.colorS=Math.min(80,(dna.colorS||50)+10);if(tid==='flowerPower')dna.flowerCount=Math.min(4,(dna.flowerCount||1)+1);if(tid==='fireflyAffinity')dna.fireflyChance=Math.min(0.15,(dna.fireflyChance||0.05)+0.03)}});
    dna.flowerColor=`hsl(${dna.flowerH},${dna.flowerS}%,${dna.flowerL}%)`;return dna;
}
function lerp(a,b,t){return a+(b-a)*t}
function createSVGElement(tag){return document.createElementNS("http://www.w3.org/2000/svg",tag)}

// ═══════════════════════════════════════════════════════════════
// PLANT RENDERING
// ═══════════════════════════════════════════════════════════════

function renderPlant(containerId,dna,stage,scarsOverride=null){
    const g=document.getElementById(containerId);if(!g||!dna)return;g.innerHTML='';
    const scars=scarsOverride||state.scars||[];
    const hasWilt=scars.includes('wilt'),hasBend=scars.includes('bend'),hasPale=scars.includes('pale');
    let cH=dna.colorH,cS=dna.colorS,cL=dna.colorL;
    if(hasPale){cS=Math.max(20,cS-30);cL=Math.min(70,cL+15)}
    const stemColor=`hsl(${cH},${cS}%,${cL}%)`,leafColor=`hsl(${cH},${cS}%,${cL+10}%)`,flowerColor=dna.flowerColor;
    const lean=dna.leanDirection||1,bendOff=hasBend?lean*15:0,wiltAng=hasWilt?20:0;
    
    // Plant base position (grows from dirt mound)
    const baseY=189;
    const stemH=dna.stemHeight*(0.3+stage*0.175);
    const curve=(dna.stemCurve||0)+bendOff;
    
    // Bezier curve points for stem
    const stemStartX=100,stemStartY=baseY;
    const stemCtrlX=100+curve,stemCtrlY=baseY-stemH/2;
    const stemEndX=100+curve/2,stemEndY=baseY-stemH;
    
    // Helper: get point on quadratic bezier at t (0-1)
    function getPointOnStem(t){
        const x=(1-t)*(1-t)*stemStartX+2*(1-t)*t*stemCtrlX+t*t*stemEndX;
        const y=(1-t)*(1-t)*stemStartY+2*(1-t)*t*stemCtrlY+t*t*stemEndY;
        return{x,y};
    }
    
    // Draw stem (stage 1+)
    if(stage>=1){
        const stem=createSVGElement('path');
        stem.setAttribute('d',`M${stemStartX} ${stemStartY} Q${stemCtrlX} ${stemCtrlY} ${stemEndX} ${stemEndY}`);
        stem.setAttribute('stroke',stemColor);
        stem.setAttribute('stroke-width',3+stage*0.5);
        stem.setAttribute('fill','none');
        stem.setAttribute('stroke-linecap','round');
        g.appendChild(stem);
    }
    
    // Draw leaves (stage 2+)
    if(stage>=2){
        const lc=Math.min(dna.leafCount||3,stage);
        for(let i=0;i<lc;i++){
            const t=0.25+(i/lc)*0.5;
            const pt=getPointOnStem(t);
            const side=i%2===0?-1:1;
            const ang=(dna.leafAngle||45)*side+(hasWilt?wiltAng*side:0);
            renderLeaf(g,pt.x,pt.y,ang,dna.leafSize||1,leafColor,dna.leafShape||'round');
        }
    }
    
    // Draw bud (stage 3)
    if(stage===3){
        const bud=createSVGElement('ellipse');
        bud.setAttribute('cx',stemEndX);
        bud.setAttribute('cy',stemEndY);
        bud.setAttribute('rx',6);
        bud.setAttribute('ry',8);
        bud.setAttribute('fill',`hsl(${dna.flowerH},${dna.flowerS*0.5}%,${dna.flowerL-10}%)`);
        g.appendChild(bud);
    }
    
    // Draw flowers (stage 4+)
    if(stage>=4){
        const flowerScale=stage>=5?1.3:1;
        // Main flower at stem top
        renderFlower(g,stemEndX,stemEndY-5,dna.petalCount||5,dna.petalShape||'round',flowerColor,flowerScale);
        
        // Branch flowers (stage 5+ with multiple flowers)
        if(dna.flowerCount>=2&&stage>=5){
            const branchPt1=getPointOnStem(0.55);
            const branch1EndX=branchPt1.x+lean*-30;
            const branch1EndY=branchPt1.y-25;
            const branch1=createSVGElement('path');
            branch1.setAttribute('d',`M${branchPt1.x} ${branchPt1.y} Q${branchPt1.x+lean*-15} ${branchPt1.y-12} ${branch1EndX} ${branch1EndY}`);
            branch1.setAttribute('stroke',stemColor);
            branch1.setAttribute('stroke-width',2);
            branch1.setAttribute('fill','none');
            branch1.setAttribute('stroke-linecap','round');
            g.appendChild(branch1);
            renderFlower(g,branch1EndX,branch1EndY-3,dna.petalCount||5,dna.petalShape||'round',flowerColor,0.75);
        }
        if(dna.flowerCount>=3&&stage>=5){
            const branchPt2=getPointOnStem(0.70);
            const branch2EndX=branchPt2.x+lean*25;
            const branch2EndY=branchPt2.y-18;
            const branch2=createSVGElement('path');
            branch2.setAttribute('d',`M${branchPt2.x} ${branchPt2.y} Q${branchPt2.x+lean*12} ${branchPt2.y-9} ${branch2EndX} ${branch2EndY}`);
            branch2.setAttribute('stroke',stemColor);
            branch2.setAttribute('stroke-width',2);
            branch2.setAttribute('fill','none');
            branch2.setAttribute('stroke-linecap','round');
            g.appendChild(branch2);
            renderFlower(g,branch2EndX,branch2EndY-3,dna.petalCount||5,dna.petalShape||'round',flowerColor,0.65);
        }
    }
}

function renderLeaf(g,x,y,angle,scale,color,shape){
    const leaf=createSVGElement('path'),sz=scale*15;
    const paths={
        pointed:`M0,0 Q${-sz*0.5},${-sz} 0,${-sz*1.5} Q${sz*0.5},${-sz} 0,0`,
        heart:`M0,0 C${-sz*0.8},${-sz*0.3} ${-sz*0.8},${-sz} 0,${-sz*1.2} C${sz*0.8},${-sz} ${sz*0.8},${-sz*0.3} 0,0`,
        oak:`M0,0 Q${-sz*0.3},${-sz*0.4} ${-sz*0.5},${-sz*0.5} Q${-sz*0.3},${-sz*0.8} 0,${-sz*1.2} Q${sz*0.3},${-sz*0.8} ${sz*0.5},${-sz*0.5} Q${sz*0.3},${-sz*0.4} 0,0`,
        round:`M0,0 Q${-sz*0.7},${-sz*0.7} 0,${-sz*1.3} Q${sz*0.7},${-sz*0.7} 0,0`
    };
    leaf.setAttribute('d',paths[shape]||paths.round);
    leaf.setAttribute('fill',color);
    leaf.setAttribute('transform',`translate(${x},${y}) rotate(${angle})`);
    g.appendChild(leaf);
}

function renderFlower(g,x,y,count,shape,color,scale){
    const fg=createSVGElement('g');
    fg.setAttribute('transform',`translate(${x},${y})`);
    const sz=12*scale;
    const paths={
        pointed:`M0,0 Q${sz*0.3},${-sz*0.7} 0,${-sz} Q${-sz*0.3},${-sz*0.7} 0,0`,
        wavy:`M0,0 C${sz*0.4},${-sz*0.3} ${sz*0.2},${-sz*0.7} 0,${-sz} C${-sz*0.2},${-sz*0.7} ${-sz*0.4},${-sz*0.3} 0,0`,
        round:`M0,0 Q${sz*0.5},${-sz*0.5} 0,${-sz} Q${-sz*0.5},${-sz*0.5} 0,0`
    };
    for(let i=0;i<count;i++){
        const p=createSVGElement('path');
        p.setAttribute('d',paths[shape]||paths.round);
        p.setAttribute('fill',color);
        p.setAttribute('transform',`rotate(${(360/count)*i})`);
        p.style.opacity='0.9';
        fg.appendChild(p);
    }
    const c=createSVGElement('circle');
    c.setAttribute('r',4*scale);
    c.setAttribute('fill','#fbbf24');
    fg.appendChild(c);
    g.appendChild(fg);
}

function renderPotPreview(){
    const g=document.getElementById('potPreviewGroup');
    if(g){
        g.innerHTML='';
        const body=createSVGElement('path');
        body.setAttribute('d','M72 30L128 30L118 70L82 70Z');
        body.setAttribute('fill',state.potColor);
        g.appendChild(body);
        const rim=createSVGElement('path');
        rim.setAttribute('d','M68 25L132 25L130 35L70 35Z');
        rim.setAttribute('fill',state.potColor);
        rim.style.filter='brightness(1.1)';
        g.appendChild(rim);
        if(state.potPattern&&state.potPattern!=='patNone'){
            const pat=createSVGElement('path');
            pat.setAttribute('d','M72 35L128 35L118 70L82 70Z');
            pat.setAttribute('fill',`url(#${state.potPattern})`);
            pat.style.opacity=0.9;
            g.appendChild(pat);
        }
    }
    updateMainPot();
}

function updateMainPot(){
    document.documentElement.style.setProperty('--pot-color',state.potColor);
    document.documentElement.style.setProperty('--pot-pat-color',state.potPatternColor);
    const p=document.getElementById('potPatternPath');
    if(p)p.setAttribute('fill',state.potPattern?`url(#${state.potPattern})`:'none');
}

// ═══════════════════════════════════════════════════════════════
// GAME LOOP
// ═══════════════════════════════════════════════════════════════

let lastTickTime=Date.now(),saveDebounceTimer=null;
function startGameLoop(){setInterval(gameTick,CONFIG.tickRate)}

function gameTick(){
    if(state.isDead||document.visibilityState!=='visible')return;
    lastTickTime=Date.now();
    decay();checkDeath();grow();processBuffs();processGuardians();attemptSpawnFirefly();
    if(!saveDebounceTimer){saveDebounceTimer=setTimeout(()=>{saveState();saveDebounceTimer=null},5000)}
    render();
}

function decay(){
    const res=state.dna?.resilience||1,slow=state.buffs.find(b=>b.type==='slow')?0.5:1;
    if(state.isRainOn){state.water=Math.min(100,state.water+0.2);if(state.water>=95&&Math.random()>0.95)spawnFloatingText("Too Wet!","#ff6b6b")}
    else{state.water=Math.max(0,state.water-(CONFIG.decayRate.water/res)*slow)}
    if(state.isSunLampOn){
        if(isDaytime())state.sun=Math.min(100,state.sun+0.5);
        else if(!isNewMoon())state.sun=Math.min(100,state.sun+0.2);
        if(state.sun>90){state.water=Math.max(0,state.water-0.2);if(Math.random()>0.97)spawnFloatingText("Scorching!","orange")}
    }else{state.sun=Math.max(0,state.sun-(CONFIG.decayRate.sun/res)*slow)}
    state.love=Math.max(0,state.love-(CONFIG.decayRate.love/res)*slow*0.5);
}

function checkDeath(){
    const crisis=state.water<=10&&state.sun<=10&&state.love<=10;
    if(crisis){
        state.timeAtZero+=CONFIG.tickRate;
        const hrs=state.timeAtZero/(1000*60*60);
        if(hrs>=1&&!state.scars.includes('wilt')){state.scars.push('wilt');spawnFloatingText("Leaves wilting...","#f87171");renderPlant('plantGroup',state.dna,state.stage)}
        if(hrs>=3&&!state.scars.includes('bend')){state.scars.push('bend');spawnFloatingText("Stem bending...","#f87171");renderPlant('plantGroup',state.dna,state.stage)}
        if(hrs>=6&&!state.scars.includes('pale')){state.scars.push('pale');spawnFloatingText("Colors fading...","#f87171");renderPlant('plantGroup',state.dna,state.stage)}
        if(hrs>=9&&!state.scars.includes('dormant')){state.scars.push('dormant');els.plantHero.classList.add('dormant-plant');spawnFloatingText("Entering dormancy...","#f87171")}
        if(state.timeAtZero>=CONFIG.deathTimeLimit)triggerDeath();
    }else{
        if(state.timeAtZero>0)state.timeAtZero=Math.max(0,state.timeAtZero-CONFIG.tickRate*0.5);
        if(state.scars.includes('dormant')&&getAverageVitality()>50)els.plantHero.classList.remove('dormant-plant');
    }
}

function triggerDeath(){state.isDead=true;els.plantHero.classList.add('dead-plant');els.deathOverlay.classList.add('open');saveState()}

function grow(){
    const happy=state.water>CONFIG.threshold&&state.sun>CONFIG.threshold&&state.love>CONFIG.threshold;
    const seasonG=SEASONS[state.season%4].growth,bloom=state.dna?.bloomSpeed||1,dormPen=state.scars.includes('dormant')?0.5:1;
    if(happy)state.growth+=CONFIG.growthRate*state.growthMultiplier*seasonG*bloom*dormPen;
    let next=1;
    for(let i=1;i<STAGE_THRESHOLDS.length;i++)if(state.growth>=STAGE_THRESHOLDS[i])next=i+1;
    if(next>state.stage){
        state.stage=next;
        els.plantHero.classList.add('evolving');
        setTimeout(()=>els.plantHero.classList.remove('evolving'),2000);
        renderPlant('plantGroup',state.dna,state.stage);
        spawnFloatingText("✨ EVOLVED!","white");
        audio.chime();
    }
}

function processBuffs(){
    state.buffs=state.buffs.filter(b=>{
        b.remaining--;
        if(b.type==='water')state.water=Math.min(100,state.water+b.strength);
        if(b.type==='sun')state.sun=Math.min(100,state.sun+b.strength);
        if(b.type==='love')state.love=Math.min(100,state.love+b.strength);
        if(b.type==='growth')state.growth+=b.strength;
        if(b.type==='health'){state.water=Math.min(100,state.water+b.strength*0.3);state.sun=Math.min(100,state.sun+b.strength*0.3);state.love=Math.min(100,state.love+b.strength*0.3)}
        return b.remaining>0;
    });
}

function processGuardians(){
    state.activeGuardians.forEach(i=>{
        const f=FIREFLY_FAMILIES[i];
        if(f.effect==='water')state.water=Math.min(100,state.water+0.02);
        if(f.effect==='sun')state.sun=Math.min(100,state.sun+0.02);
        if(f.effect==='love')state.love=Math.min(100,state.love+0.02);
        if(f.effect==='growth')state.growth+=0.1;
        if(f.effect==='health'){state.water=Math.min(100,state.water+0.01);state.sun=Math.min(100,state.sun+0.01);state.love=Math.min(100,state.love+0.01)}
    });
}

// ═══════════════════════════════════════════════════════════════
// UI RENDERING
// ═══════════════════════════════════════════════════════════════

function render(){
    if(els.ringWater)els.ringWater.style.strokeDashoffset=283*(1-state.water/100);
    if(els.ringSun)els.ringSun.style.strokeDashoffset=264*(1-state.sun/100);
    if(els.ringLove)els.ringLove.style.strokeDashoffset=245*(1-state.love/100);
    if(els.genBadge)els.genBadge.textContent=`CYCLE ${state.generation}`;
    if(els.plantNameDisplay)els.plantNameDisplay.textContent=state.name;
    const mood=getMood();
    if(els.plantMoodDisplay){els.plantMoodDisplay.textContent=mood.text;els.plantMoodDisplay.style.color=mood.color}
    if(els.btnSun)els.btnSun.classList.toggle('sun-active',state.isSunLampOn);
    if(els.btnRain)els.btnRain.classList.toggle('rain-active',state.isRainOn);
    if(els.evolutionBar){
        if(state.stage<6){const prev=STAGE_THRESHOLDS[state.stage-1]||0,next=STAGE_THRESHOLDS[state.stage];els.evolutionBar.style.width=Math.min(100,((state.growth-prev)/(next-prev))*100)+'%'}
        else{els.evolutionBar.style.width='100%'}
    }
    const scale=Math.min(1.4,1+(state.growth/6000));
    if(els.plantGraphics)els.plantGraphics.style.transform=`scale(${scale})`;
    if(els.menuOverlay&&els.menuOverlay.classList.contains('open'))updateMenuStats();
    updateSeason();
}

function getMood(){const avg=getAverageVitality();for(const[k,m]of Object.entries(MOODS))if(avg>=m.threshold)return m;return MOODS.dormant}
function getPlantState(){const avg=getAverageVitality();if(avg>=80)return PLANT_STATES.thriving;if(avg>=60)return PLANT_STATES.content;if(avg>=40)return PLANT_STATES.restless;if(avg>=20)return PLANT_STATES.strained;return PLANT_STATES.dormant}
function getAverageVitality(){return(state.water+state.sun+state.love)/3}
function updateUI(){render();updateMenuStats()}

function updateMenuStats(){
    if(els.nameInput&&document.activeElement!==els.nameInput)els.nameInput.value=state.name;
    if(els.menuGen)els.menuGen.textContent=state.generation;
    if(els.menuAge)els.menuAge.textContent=state.day+" Days";
    if(els.menuStage)els.menuStage.textContent=STAGES[state.stage-1]||'Seed';
    const ps=getPlantState();
    if(els.menuHealth){els.menuHealth.textContent=ps.label;els.menuHealth.style.color=ps.color}
    if(els.menuProgressBar){
        if(state.stage<6){const prev=STAGE_THRESHOLDS[state.stage-1]||0,next=STAGE_THRESHOLDS[state.stage];els.menuProgressBar.style.width=Math.min(100,((state.growth-prev)/(next-prev))*100)+'%'}
        else{els.menuProgressBar.style.width='100%'}
    }
    if(els.menuScars&&els.menuScarList){
        if(state.scars.length>0){els.menuScars.style.display='flex';els.menuScarList.textContent=state.scars.map(s=>({wilt:'Wilted',bend:'Bent',pale:'Faded',dormant:'Dormant'}[s]||s)).join(', ')}
        else{els.menuScars.style.display='none'}
    }
    if(els.menuInherited&&els.menuInheritedList){
        if(state.inheritedTraits.length>0){els.menuInherited.style.display='flex';els.menuInheritedList.textContent=state.inheritedTraits.map(id=>{const t=INHERITABLE_TRAITS.find(x=>x.id===id);return t?t.name:id}).join(', ')}
        else{els.menuInherited.style.display='none'}
    }
    if(els.btnHarvest)els.btnHarvest.classList.toggle('visible',state.stage>=5);
    if(els.greenhouseList){
        els.greenhouseList.innerHTML='';
        [...state.history].reverse().forEach((h,i)=>{
            const item=document.createElement('div');
            item.className='greenhouse-item';
            const col=h.dna?.flowerColor||`hsl(${h.dna?.flowerH||0},50%,50%)`;
            item.innerHTML=`<span><span class="gh-dot" style="background:${col}"></span>${h.name}</span><span style="opacity:0.5">Cycle ${h.gen}</span>`;
            item.onclick=()=>viewArchive(state.history.length-1-i);
            els.greenhouseList.appendChild(item);
        });
    }
}

// ═══════════════════════════════════════════════════════════════
// INTERACTIONS
// ═══════════════════════════════════════════════════════════════

function interact(type,e){
    if(state.isDead)return;
    if(e)e.stopPropagation();
    if(type==='rain'){
        state.isRainOn=!state.isRainOn;
        spawnFloatingText(state.isRainOn?"☁️ Rain ON":"☁️ Rain OFF","var(--accent-water)");
        applyTheme();
    }else if(type==='sun'){
        if(isDaytime()){
            state.isSunLampOn=!state.isSunLampOn;
            spawnFloatingText(state.isSunLampOn?"☀️ ON":"🌑 OFF","var(--accent-sun)");
        }else{
            if(isNewMoon()){spawnFloatingText("New Moon - No light","#888");return}
            state.isSunLampOn=!state.isSunLampOn;
            spawnFloatingText(state.isSunLampOn?"🌙 Moonlight ON":"🌙 OFF","#fef9c3");
            const beam=document.getElementById('moonlightBeam');
            if(beam)beam.classList.toggle('active',state.isSunLampOn);
        }
        audio.sun();
        applyTheme();
    }else if(type==='love'){
        if(state.love>=100){spawnFloatingText("Fully Loved!","var(--accent-love)");return}
        state.love=Math.min(100,state.love+15);
        spawnFloatingText("❤️","var(--accent-love)");
        audio.love();
        els.plantHero.classList.remove('plant-bloop');
        void els.plantHero.offsetWidth;
        els.plantHero.classList.add('plant-bloop');
        setTimeout(()=>els.plantHero.classList.remove('plant-bloop'),500);
    }
    render();
}

function applyTheme(){
    document.body.classList.toggle('sun-mode',state.isSunLampOn&&isDaytime());
    const rc=document.getElementById('rainContainer');
    if(rc)rc.classList.toggle('active',state.isRainOn);
    const rb=document.getElementById('rainbowContainer');
    if(rb)rb.classList.toggle('visible',state.isSunLampOn&&state.isRainOn);
    audio.toggleRainSound(state.isRainOn);
    // Update moonbeam
    const beam=document.getElementById('moonlightBeam');
    if(beam&&!isDaytime())beam.classList.toggle('active',state.isSunLampOn);
}

function animateJiggle(){els.plantHero.classList.remove('plant-jiggle');void els.plantHero.offsetWidth;els.plantHero.classList.add('plant-jiggle')}

let pressTimer=null,isPressed=false;
function handlePress(down){
    if(state.isDead)return;
    if(down){
        isPressed=true;
        pressTimer=setTimeout(()=>{els.vitals.classList.add('active')},300);
    }else{
        if(!isPressed)return;
        isPressed=false;
        clearTimeout(pressTimer);
        if(els.vitals.classList.contains('active'))els.vitals.classList.remove('active');
        else interact('love');
    }
}

// ═══════════════════════════════════════════════════════════════
// FIREFLIES
// ═══════════════════════════════════════════════════════════════

function getFireflyColor(i){const f=FIREFLY_FAMILIES[i];return`hsl(${f.hue},${f.sat||70}%,60%)`}

function attemptSpawnFirefly(){
    if(els.menuOverlay&&els.menuOverlay.classList.contains('open'))return;
    if(Math.random()<(state.dna?.fireflyChance||0.05)){spawnVisualFirefly(Math.floor(Math.random()*8),false)}
    FIREFLY_FAMILIES.forEach((_,i)=>{if(hasGuardian(i)&&!activeBigFireflies.includes(i)&&Math.random()<0.008){spawnVisualFirefly(i,true)}});
}

function spawnVisualFirefly(fam,isGuardian){
    const col=getFireflyColor(fam);
    const ff=document.createElement('div');
    ff.className='firefly'+(isGuardian?' guardian':'');
    ff.dataset.family=fam;
    ff.style.setProperty('--firefly-color',col);
    ff.style.background=col;
    ff.style.boxShadow=`0 0 ${isGuardian?20:8}px ${col}`;
    ff.style.left=(10+Math.random()*80)+'%';
    ff.style.top=(15+Math.random()*50)+'%';
    ff.style.opacity='0';
    ff.style.transform='scale(0.5)';
    requestAnimationFrame(()=>{
        ff.style.transition='opacity 0.8s ease-out, transform 0.8s ease-out';
        ff.style.opacity='1';
        ff.style.transform='scale(1)';
    });
    const handleTap=(e)=>{e.preventDefault();e.stopPropagation();if(isGuardian){activateGuardian(fam,ff)}else{collectFirefly(fam,ff)}};
    ff.addEventListener('click',handleTap);
    ff.addEventListener('touchend',handleTap,{passive:false});
    document.body.appendChild(ff);
    if(!isGuardian){setTimeout(()=>{if(ff.parentNode){ff.style.transition='opacity 1s ease-out, transform 1s ease-out';ff.style.opacity='0';ff.style.transform='scale(0.3)';setTimeout(()=>ff.remove(),1000)}},11000)}
}

function collectFirefly(fam,el){
    el.style.transition='opacity 0.3s, transform 0.3s';
    el.style.opacity='0';
    el.style.transform='scale(1.5)';
    setTimeout(()=>el.remove(),300);
    audio.chime();
    if(!state.fireflies[fam])state.fireflies[fam]=0;
    if(state.fireflies[fam]<CONFIG.maxFireflyPerFamily){
        state.fireflies[fam]++;
        state.totalFireflies++;
        spawnFloatingText(`+${FIREFLY_FAMILIES[fam].name}!`,getFireflyColor(fam));
        if(state.fireflies[fam]===GUARDIAN_THRESHOLD){spawnFloatingText(`🏆 ${FIREFLY_FAMILIES[fam].name} Guardian!`,getFireflyColor(fam))}
    }else{spawnFloatingText("Max collected!","#fff")}
    state.growth+=2;
}

function hasGuardian(i){return(state.fireflies[i]||0)>=GUARDIAN_THRESHOLD}

function activateGuardian(fam,el){
    if(activeBigFireflies.includes(fam))return;
    activeBigFireflies.push(fam);
    if(!state.activeGuardians.includes(fam)){state.activeGuardians.push(fam)}
    spawnFloatingText(`${FIREFLY_FAMILIES[fam].name} Guardian Active!`,getFireflyColor(fam));
    el.classList.add('guardian-active');
    el.style.pointerEvents='none';
    setTimeout(()=>{
        el.style.transition='opacity 2s ease-out, transform 2s ease-out';
        el.style.opacity='0';
        el.style.transform='scale(0.3)';
        setTimeout(()=>{el.remove();activeBigFireflies=activeBigFireflies.filter(x=>x!==fam);state.activeGuardians=state.activeGuardians.filter(x=>x!==fam)},2000);
    },58000);
}

function releaseFirefly(){
    if(selectedFamily===null||!state.fireflies[selectedFamily]||state.fireflies[selectedFamily]<1)return;
    state.fireflies[selectedFamily]--;
    state.totalFireflies--;
    const f=FIREFLY_FAMILIES[selectedFamily];
    let bt=f.effect,bs=0.5,dur=30;
    if(bt==='random'){bt=['water','sun','love','growth','health'][Math.floor(Math.random()*5)];bs=1;dur=45}
    state.buffs.push({type:bt,strength:bs,remaining:dur});
    spawnFloatingText(`${f.power} released!`,getFireflyColor(selectedFamily));
    renderSanctuary();
}

// ═══════════════════════════════════════════════════════════════
// MENUS & OVERLAYS
// ═══════════════════════════════════════════════════════════════

function toggleMenu(){els.menuOverlay.classList.toggle('open');if(els.menuOverlay.classList.contains('open'))updateMenuStats()}

function openFireflyLog(){els.menuOverlay.classList.remove('open');els.fireflyOverlay.classList.add('open');selectedFamily=null;renderSanctuary()}
function closeFireflyLog(){els.fireflyOverlay.classList.remove('open');els.menuOverlay.classList.add('open')}

function renderSanctuary(){
    const grid=document.getElementById('fireflyFamilyGrid');if(!grid)return;
    grid.innerHTML='';
    FIREFLY_FAMILIES.forEach((f,i)=>{
        const cnt=state.fireflies[i]||0;
        const isG=cnt>=GUARDIAN_THRESHOLD;
        const col=getFireflyColor(i);
        const card=document.createElement('div');
        card.className='family-card'+(selectedFamily===i?' selected':'');
        card.style.setProperty('--family-color',col);
        card.innerHTML=`<div class="family-orb" style="background:${col}"></div><div class="family-name">${f.name}</div><div class="family-count">${cnt}</div><div class="family-power">${isG?'👑':f.power}</div>`;
        card.onclick=()=>{selectedFamily=i;renderSanctuary()};
        grid.appendChild(card);
    });
    const det=document.getElementById('familyDetailPanel');
    if(selectedFamily!==null&&det){
        det.style.display='block';
        const f=FIREFLY_FAMILIES[selectedFamily],cnt=state.fireflies[selectedFamily]||0,col=getFireflyColor(selectedFamily);
        det.style.setProperty('--family-color',col);
        document.getElementById('detailOrb').style.cssText=`background:${col};box-shadow:0 0 20px ${col}`;
        document.getElementById('detailFamilyName').textContent=f.name+' Family';
        document.getElementById('detailFamilyPower').textContent=f.desc;
        document.getElementById('detailFireflyCount').textContent=`You have ${cnt} fireflies`;
        const btn=document.getElementById('releaseBtn');
        btn.disabled=cnt<1;
        btn.textContent=cnt>0?`Release One (${cnt} left)`:'None to release';
    }else if(det){det.style.display='none'}
    const gt=document.getElementById('guardianProgressText');
    if(gt){
        const gs=FIREFLY_FAMILIES.filter((_,i)=>hasGuardian(i));
        gt.textContent=gs.length>0?`Guardians unlocked: ${gs.map(f=>f.name).join(', ')}`:`Collect ${GUARDIAN_THRESHOLD} of any family to summon their Guardian.`;
    }
}

function openPotDesigner(){els.menuOverlay.classList.remove('open');els.potOverlay.classList.add('open');renderPotDesigner()}
function closePotDesigner(){els.potOverlay.classList.remove('open');els.menuOverlay.classList.add('open');saveState()}

function renderPotDesigner(){
    const cg=document.getElementById('potColorGrid');
    if(cg){cg.innerHTML='';POT_COLORS.forEach(c=>{const d=document.createElement('div');d.className='color-dot'+(state.potColor===c?' selected':'');d.style.background=c;d.onclick=()=>{state.potColor=c;renderPotDesigner();renderPotPreview()};cg.appendChild(d)})}
    const pg=document.getElementById('potPatternGrid');
    if(pg){pg.innerHTML='';PATTERNS.forEach(p=>{const unlocked=state.totalFireflies>=p.unlockAt;const btn=document.createElement('button');btn.className='pattern-btn'+(state.potPattern===p.id?' selected':'')+(!unlocked?' locked':'');btn.textContent=unlocked?p.name:`🔒 ${p.unlockAt}`;btn.disabled=!unlocked;btn.onclick=()=>{if(unlocked){state.potPattern=p.id;renderPotDesigner();renderPotPreview()}};pg.appendChild(btn)})}
    const pcg=document.getElementById('patternColorGrid');
    if(pcg){pcg.innerHTML='';PATTERN_COLORS.forEach(c=>{const d=document.createElement('div');d.className='color-dot'+(state.potPatternColor===c?' selected':'');d.style.background=c;d.onclick=()=>{state.potPatternColor=c;renderPotDesigner();renderPotPreview()};pcg.appendChild(d)})}
}

function openHelp(){els.menuOverlay.classList.remove('open');els.helpOverlay.classList.add('open')}
function closeHelp(){els.helpOverlay.classList.remove('open');els.menuOverlay.classList.add('open')}

function harvestPlant(){
    if(state.stage<5)return;
    els.menuOverlay.classList.remove('open');
    els.harvestOverlay.classList.add('open');
    renderPlant('harvestPlantGroup',state.dna,state.stage);
    const trait=INHERITABLE_TRAITS[Math.floor(Math.random()*INHERITABLE_TRAITS.length)];
    document.getElementById('inheritedTraitDisplay').textContent=`${trait.name}: ${trait.desc}`;
    document.getElementById('inheritedTraitDisplay').dataset.traitId=trait.id;
}
function closeHarvestModal(){els.harvestOverlay.classList.remove('open');els.menuOverlay.classList.add('open')}

function confirmHarvest(){
    state.history.push({name:state.name,gen:state.generation,days:state.day,dna:{...state.dna},stage:state.stage,scars:[...state.scars],potColor:state.potColor,potPattern:state.potPattern});
    const tid=document.getElementById('inheritedTraitDisplay').dataset.traitId;
    if(!state.inheritedTraits.includes(tid))state.inheritedTraits.push(tid);
    const oldName=state.name;
    state.generation++;state.day=1;state.stage=1;state.growth=0;state.water=50;state.sun=50;state.love=50;state.scars=[];state.timeAtZero=0;state.name='Sprout';state.season=(state.season+1)%4;state.dna=generateDNA(state.dna);
    els.harvestOverlay.classList.remove('open');
    spawnFloatingText(`A seed from ${oldName} takes root...`,'var(--accent-growth)');
    setupWorld();renderPlant('plantGroup',state.dna,state.stage);updateSeason();updateUI();saveState();
}

function viewArchive(i){
    if(i<0||i>=state.history.length)return;
    const a=state.history[i];
    els.menuOverlay.classList.remove('open');
    els.archiveOverlay.classList.add('open');
    document.getElementById('archiveTitle').textContent=a.name;
    renderPlant('archivePlantGroup',a.dna,a.stage,a.scars||[]);
    const stats=document.getElementById('archiveStats');
    stats.innerHTML=`<div class="archive-stat"><span>Generation</span><span>${a.gen}</span></div><div class="archive-stat"><span>Days Lived</span><span>${a.days}</span></div><div class="archive-stat"><span>Stage</span><span>${STAGES[a.stage-1]||'Unknown'}</span></div>${a.scars?.length?`<div class="archive-stat"><span>Scars</span><span>${a.scars.join(', ')}</span></div>`:''}`;
}
function closeArchive(){els.archiveOverlay.classList.remove('open');els.menuOverlay.classList.add('open')}

function openResetConfirm(){els.menuOverlay.classList.remove('open');els.resetOverlay.classList.add('open')}
function closeResetOverlay(){els.resetOverlay.classList.remove('open');els.menuOverlay.classList.add('open')}
function finalizeReset(){resetGame(false);els.resetOverlay.classList.remove('open')}
function updateName(n){state.name=n.trim()||'Sprout';updateUI();saveState()}

// ═══════════════════════════════════════════════════════════════
// ACTIONS (Sing, Fertilize, Music)
// ═══════════════════════════════════════════════════════════════

function singToPlant(){
    if(Date.now()<state.singCooldownUntil)return;
    state.singCooldownUntil=Date.now()+CONFIG.singCooldown;
    checkSingCooldown();toggleMenu();
    spawnFloatingText("🎵 Singing...","#748ffc");
    let needed=STAGE_THRESHOLDS[state.stage]||1000;
    if(state.stage<4)needed=STAGE_THRESHOLDS[state.stage+1]-STAGE_THRESHOLDS[state.stage];
    const boost=needed*0.1;
    state.growth+=boost;
    setTimeout(()=>spawnFloatingText(`+${Math.floor(boost)} Growth!`,"#4ade80"),500);
    els.plantHero.classList.add('sing-glow');
    setTimeout(()=>els.plantHero.classList.remove('sing-glow'),3000);
    let i=0;const notes=[261,329,392,523];
    const iv=setInterval(()=>{if(i>=notes.length){clearInterval(iv);return}audio.play(notes[i],'triangle',0.3);i++},300);
}

function fertilizePlant(){
    if(Date.now()<state.fertilizeCooldownUntil)return;
    state.fertilizeCooldownUntil=Date.now()+CONFIG.fertilizeCooldown;
    checkFertilizeCooldown();toggleMenu();
    spawnFloatingText("🌿 Fertilized!","#795548");
    state.growthMultiplier=2;
    setTimeout(()=>{state.growthMultiplier=1},60000);
    state.growth+=50;
}

function checkSingCooldown(){
    const r=state.singCooldownUntil-Date.now();
    if(els.btnSing){
        if(r>0){els.btnSing.disabled=true;els.btnSing.textContent=`🎵 Sing (${Math.ceil(r/60000)}m)`}
        else{els.btnSing.disabled=false;els.btnSing.textContent='🎵 Sing to Plant'}
    }
}

function checkFertilizeCooldown(){
    const r=state.fertilizeCooldownUntil-Date.now();
    if(els.btnFertilize){
        if(r>0){els.btnFertilize.disabled=true;els.btnFertilize.textContent=`🌿 Fertilize (${Math.ceil(r/60000)}m)`}
        else{els.btnFertilize.disabled=false;els.btnFertilize.textContent='🌿 Fertilize'}
    }
}

function toggleBackgroundMusic(){
    state.isMusicPlaying=!state.isMusicPlaying;
    if(state.isMusicPlaying){audio.playBackgroundMusic();els.btnMusic.classList.add('active');els.btnMusic.textContent='🎶 Music ON'}
    else{audio.stopBackgroundMusic();els.btnMusic.classList.remove('active');els.btnMusic.textContent='🎶 Background Music'}
}

// ═══════════════════════════════════════════════════════════════
// SAVE/LOAD & OFFLINE
// ═══════════════════════════════════════════════════════════════

function processOfflineProgress(){
    const now=Date.now(),diff=(now-state.lastSave)/1000;
    if(diff<60)return;
    const hrs=diff/3600;
    const wasHappy=state.water>40&&state.sun>40&&state.love>40;
    if(!state.isRainOn)state.water=Math.max(0,state.water-diff*CONFIG.offlineDecayFactor);
    if(!state.isSunLampOn)state.sun=Math.max(0,state.sun-diff*CONFIG.offlineDecayFactor);
    state.love=Math.max(0,state.love-diff*CONFIG.offlineDecayFactor*0.5);
    if(wasHappy)state.growth+=diff*0.15;
    state.day+=Math.floor(diff/14400);
    let nested=null;
    if(hrs>=2&&Math.random()<0.4){const fi=Math.floor(Math.random()*8);if(!state.fireflies[fi])state.fireflies[fi]=0;state.fireflies[fi]++;state.totalFireflies++;nested=FIREFLY_FAMILIES[fi]}
    let dream=null;
    if(hrs>=1){const di=Math.floor(Math.random()*DREAMS.length);if(di!==state.lastDream){dream=DREAMS[di];state.lastDream=di}}
    if(diff>600){
        let tc='';
        if(dream)tc+=`<div style="font-style:italic;margin-bottom:10px;opacity:0.9;">While away, your plant ${dream}</div>`;
        tc+=`<div style="font-size:0.8rem;opacity:0.7;">You were away for ${hrs>=1?`${Math.floor(hrs)}h ${Math.floor((diff%3600)/60)}m`:`${Math.floor(diff/60)}m`}</div>`;
        const ps=getPlantState();
        tc+=`<div style="margin:8px 0;">Your plant is <span style="color:${ps.color};font-weight:bold;">${ps.label}</span></div>`;
        if(nested)tc+=`<div style="color:${getFireflyColor(FIREFLY_FAMILIES.indexOf(nested))};">🦋 A ${nested.name} firefly nested nearby!</div>`;
        if(wasHappy)tc+=`<div style="opacity:0.7;font-size:0.85rem;margin-top:5px;">Growth continued while you were away 🌱</div>`;
        document.getElementById('toastBody').innerHTML=tc;
        els.welcomeToast.classList.add('visible');
    }
    state.lastSave=now;saveState();
}

function closeToast(){els.welcomeToast.classList.remove('visible')}

function handleVisibility(){
    if(document.visibilityState==='visible'){
        processOfflineProgress();
        if(audio.ctx)audio.ctx.resume();
        if(state.isRainOn){audio.startRainSound()}
        document.body.classList.remove('paused');
        state.activeGuardians.forEach(i=>{if(!document.querySelector(`.guardian[data-family="${i}"]`)){spawnVisualFirefly(i,true)}});
        // Reposition moonbeam after visibility change
        setTimeout(positionMoonbeam, 100);
    }else{
        saveState();
        if(audio.isRainPlaying){audio.stopRainSound()}
        document.body.classList.add('paused');
    }
}

function saveState(){state.lastSave=Date.now();try{localStorage.setItem('pocketSprout',JSON.stringify(state))}catch(e){}}
function loadState(){try{const s=localStorage.getItem('pocketSprout');if(s)state={...state,...JSON.parse(s)}}catch(e){}}

function resetGame(preserveHistory=true){
    if(preserveHistory&&state.name!=='Sprout'&&!state.isDead){state.history.push({name:state.name,gen:state.generation,days:state.day,dna:{...state.dna},stage:state.stage,scars:[...state.scars],potColor:state.potColor,potPattern:state.potPattern})}
    const hist=preserveHistory?state.history:[];
    const tf=preserveHistory?state.totalFireflies:0;
    const ff=preserveHistory?state.fireflies:{};
    const it=preserveHistory?state.inheritedTraits:[];
    const gen=preserveHistory?state.generation+1:1;
    state={water:50,sun:50,love:50,growth:0,stage:1,isSunLampOn:false,isRainOn:false,day:1,generation:gen,name:"Sprout",season:state.season||0,dna:generateDNA(),potColor:POT_COLORS[0],potPattern:'patNone',potPatternColor:'rgba(255,255,255,0.5)',timeAtZero:0,isDead:false,history:hist,lastSave:Date.now(),growthMultiplier:1,singCooldownUntil:0,fertilizeCooldownUntil:0,fireflies:ff,totalFireflies:tf,activeGuardians:[],buffs:[],scars:[],crisisCount:0,inheritedTraits:it,lastDream:null,isMusicPlaying:false};
    els.deathOverlay.classList.remove('open');
    els.plantHero.classList.remove('dead-plant','dormant-plant');
    audio.stopRainSound();
    setupWorld();renderPlant('plantGroup',state.dna,state.stage);renderPotPreview();updateUI();saveState();
}

// ═══════════════════════════════════════════════════════════════
// BACK BUTTON & NAVIGATION
// ═══════════════════════════════════════════════════════════════

function handleBackButton(e){
    if(!e.state||!e.state.pocketSprout){history.pushState({pocketSprout:true,depth:1},'');return}
    const overlays=[
        {el:els.fireflyOverlay,close:closeFireflyLog},
        {el:els.potOverlay,close:closePotDesigner},
        {el:els.harvestOverlay,close:closeHarvestModal},
        {el:els.archiveOverlay,close:closeArchive},
        {el:els.helpOverlay,close:closeHelp},
        {el:els.resetOverlay,close:closeResetOverlay},
        {el:els.menuOverlay,close:toggleMenu}
    ];
    for(const o of overlays){if(o.el&&o.el.classList.contains('open')){o.close();break}}
    pushHistoryState();
}

// ═══════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════

function spawnFloatingText(text,color){
    const el=document.createElement('div');
    el.className='floating-text';
    el.textContent=text;
    el.style.color=color;
    el.style.left='50%';
    el.style.top='40%';
    el.style.transform='translateX(-50%)';
    document.body.appendChild(el);
    setTimeout(()=>el.remove(),2000);
}

// ═══════════════════════════════════════════════════════════════
// DEBUG PANEL
// ═══════════════════════════════════════════════════════════════

let debugTapCount=0,debugTapTimer=null;
function handleDebugTap(){debugTapCount++;clearTimeout(debugTapTimer);debugTapTimer=setTimeout(()=>debugTapCount=0,3000);if(debugTapCount>=CONFIG.debugTapThreshold){toggleDebug();debugTapCount=0}}
function toggleDebug(){els.debugPanel.classList.toggle('open');if(els.debugPanel.classList.contains('open'))updateDebugState()}
function debugLog(m){const l=document.getElementById('debugLog');if(l)l.innerHTML=`[${new Date().toLocaleTimeString()}] ${m}<br>`+l.innerHTML}
function updateDebugState(){const s=document.getElementById('debugState');if(s)s.textContent=JSON.stringify(state,null,2)}
function debugMaxStats(){state.water=100;state.sun=100;state.love=100;render();debugLog('Max stats')}
function debugGrow(){state.growth+=1000;render();debugLog('+1000 growth')}
function debugEvolve(){if(state.stage<5){state.stage++;renderPlant('plantGroup',state.dna,state.stage);debugLog(`Stage ${state.stage}`)}else{debugLog('Max stage')}}
function debugKill(){triggerDeath();debugLog('Killed')}
function debugUnlockFireflies(){FIREFLY_FAMILIES.forEach((_,i)=>{state.fireflies[i]=CONFIG.maxFireflyPerFamily});state.totalFireflies=8*CONFIG.maxFireflyPerFamily;debugLog('All fireflies')}
function debugAddFirefly(){const i=Math.floor(Math.random()*8);if(!state.fireflies[i])state.fireflies[i]=0;state.fireflies[i]++;state.totalFireflies++;debugLog(`+${FIREFLY_FAMILIES[i].name}`)}
function debugCycleTime(){const ts=['night','dawn','morning','day','afternoon','dusk','evening'],c=ts.findIndex(t=>document.body.classList.contains('time-'+t)),n=(c+1)%ts.length;document.body.className=document.body.className.replace(/time-\w+/g,'');document.body.classList.add('time-'+ts[n]);debugLog('Time: '+ts[n])}
function debugCycleSeason(){state.season=(state.season+1)%4;updateSeason();debugLog('Season: '+SEASONS[state.season].name)}
function debugCycleMoon(){const m=document.getElementById('moonElement');if(m){const ps=[0,25,50,75,100,-75,-50,-25],c=ps.indexOf(parseInt(m.style.getPropertyValue('--moon-phase'))||0),n=(c+1)%ps.length;m.style.setProperty('--moon-phase',ps[n]+'%');debugLog('Moon cycled')}}
function debugAddScar(){const st=['wilt','bend','pale','dormant'],av=st.filter(s=>!state.scars.includes(s));if(av.length>0){const s=av[Math.floor(Math.random()*av.length)];state.scars.push(s);renderPlant('plantGroup',state.dna,state.stage);updateUI();debugLog('Scar: '+s)}else{debugLog('All scars')}}
function debugResetGame(){localStorage.removeItem('pocketSprout');location.reload()}

// ═══════════════════════════════════════════════════════════════
// STARTUP
// ═══════════════════════════════════════════════════════════════

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();

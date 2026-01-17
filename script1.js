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
// --- Seasons ---
// The world runs on a repeating 14-day arc ("Pocket time"; 1 in-game day = 4 hours real time).
// Seasons are mapped onto that arc so they can meaningfully change play.
const ARC_LENGTH_DAYS = 14;
// Arc days 1-3 Spring, 4-7 Summer, 8-10 Autumn, 11-14 Winter.
const ARC_SEASON_BY_DAY = [
    0,0,0,  // 1-3
    1,1,1,1,// 4-7
    2,2,2,  // 8-10
    3,3,3,3 // 11-14
];

const SEASONS = [
    {
        key:'spring',name:'Spring',icon:'🌸',
        growth:1.08,
        decay:{water:0.92,sun:0.94,love:0.90},
        recovery:{water:1.08,sun:1.05,love:1.10},
        fireflies:1.10,
        vibe:{tag:'awakening'}
    },
    {
        key:'summer',name:'Summer',icon:'☀️',
        growth:1.18,
        decay:{water:1.18,sun:0.90,love:1.00},
        recovery:{water:0.92,sun:1.10,love:0.98},
        fireflies:1.35,
        vibe:{tag:'abundance'}
    },
    {
        key:'autumn',name:'Autumn',icon:'🍂',
        growth:0.92,
        decay:{water:0.98,sun:1.02,love:1.05},
        recovery:{water:1.00,sun:1.00,love:0.98},
        fireflies:1.00,
        vibe:{tag:'maturation'}
    },
    {
        key:'winter',name:'Winter',icon:'❄️',
        growth:0.72,
        decay:{water:0.82,sun:1.10,love:1.12},
        recovery:{water:0.88,sun:0.92,love:1.08},
        fireflies:0.75,
        vibe:{tag:'stillness'}
    }
];

function getArcDay(){
    // Keep it stable even if someone manages to get day to 0.
    const d=Math.max(1, state?.day||1);
    return ((d-1)%ARC_LENGTH_DAYS)+1;
}

function getSeasonIndex(){
    // Back-compat: allow a manual override for debugging.
    if(state && typeof state.seasonOverride==='number') return ((state.seasonOverride%4)+4)%4;
    const ad=getArcDay();
    return ARC_SEASON_BY_DAY[ad-1] ?? 0;
}

function getSeason(){
    return SEASONS[getSeasonIndex()];
}

function getSeasonLabel(){
    const s=getSeason();
    return `${s.icon} ${s.name}`;
}
const MOON_PHASES = [{name:'New Moon',icon:'🌑',phase:100},{name:'Waxing Crescent',icon:'🌒',phase:75},{name:'First Quarter',icon:'🌓',phase:50},{name:'Waxing Gibbous',icon:'🌔',phase:25},{name:'Full Moon',icon:'🌕',phase:0},{name:'Waning Gibbous',icon:'🌖',phase:-25},{name:'Last Quarter',icon:'🌗',phase:-50},{name:'Waning Crescent',icon:'🌘',phase:-75}];
const STAGES = ['Shoot','Seedling','Sprout','Budding','Bloom','Flourish'];
const STAGE_THRESHOLDS = [0,300,1000,2500,5000,8000];
const MOODS = {thriving:{text:'basking contentedly',color:'#4ade80',threshold:75},content:{text:'swaying gently',color:'#a3e635',threshold:55},restless:{text:'reaching for light',color:'#facc15',threshold:35},struggling:{text:'wilting slowly',color:'#fb923c',threshold:15},dormant:{text:'in deep slumber',color:'#f87171',threshold:0}};
const PLANT_STATES = {thriving:{min:80,label:"Thriving",color:"#4ade80"},content:{min:60,label:"Content",color:"#a3e635"},restless:{min:40,label:"Restless",color:"#facc15"},strained:{min:20,label:"Strained",color:"#fb923c"},dormant:{min:0,label:"Dormant",color:"#f87171"}};
const INHERITABLE_TRAITS = [
    {id:'resilience',name:'Resilient',desc:'Slower stat decay'},
    {id:'bloomSpeed',name:'Quick Bloomer',desc:'Faster growth'},
    {id:'leafiness',name:'Lush',desc:'More leaves'},
    {id:'colorVibrancy',name:'Vibrant',desc:'Richer colors'},
    {id:'flowerPower',name:'Floriferous',desc:'More flowers'},
    {id:'fireflyAffinity',name:'Firefly Friend',desc:'Attracts more fireflies'}
];
// Rebalanced for real-time play: slower baseline decay, slower recovery when low,
// and offline time is meaningfully harsher than active time.
const CONFIG = {
    decayRate:{water:0.014,sun:0.014,love:0.010},
    growthRate:0.26,
    tickRate:1000,
    threshold:40,
    deathTimeLimit:12*60*60*1000,
    offlineDecayFactor:1.55,
    singCooldown:300000,
    fertilizeCooldown:180000,
    maxFireflyPerFamily:50,
    debugTapThreshold:20
};
const DREAMS = ["dreamed of distant mountains","listened to rain and remembered forests","felt roots intertwining with the past","saw gardens yet to bloom","remembered its first sunrise","heard whispers from sleeping seeds","imagined dancing with fireflies","felt the heartbeat of the earth","dreamed of butterfly wings","whispered secrets to the moon"];
let state = {
    water:50,sun:50,love:50,
    growth:0,stage:1,
    isSunLampOn:false,isRainOn:false,
    day:1,generation:1,name:"Sprout",season:0,
    dna:null,
    potColor:POT_COLORS[0],potPattern:'patNone',potPatternColor:'rgba(255,255,255,0.5)',
    timeAtZero:0,
    // Per-stat neglect trackers (milliseconds spent under thresholds).
    neglect:{water:0,sun:0,love:0,crisis:0},
    isDead:false,
    history:[],
    lastSave:Date.now(),
    growthMultiplier:1,
    singCooldownUntil:0,
    fertilizeCooldownUntil:0,
    fireflies:{},totalFireflies:0,activeGuardians:[],
    buffs:[],
    scars:[],
    crisisCount:0,
    inheritedTraits:[],
    lastDream:null,
    isMusicPlaying:false
};
let els = {}, selectedFamily = null, activeBigFireflies = [];
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
function initPatterns(){
    const defs=document.getElementById('plantDefs');
    if(defs){
        defs.innerHTML+=`<pattern id="patNone" width="10" height="10" patternUnits="userSpaceOnUse"></pattern><pattern id="patStripes" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="4" height="8" fill="var(--pot-pat-color)"/></pattern><pattern id="patHearts" width="16" height="16" patternUnits="userSpaceOnUse"><path d="M8 5C8 3 6 2 4 3 2 4 2 7 4 9L8 13 12 9C14 7 14 4 12 3 10 2 8 3 8 5" fill="var(--pot-pat-color)" transform="scale(0.8)translate(2,2)"/></pattern><pattern id="patWaves" width="20" height="10" patternUnits="userSpaceOnUse"><path d="M0 5Q5 0 10 5T20 5" fill="none" stroke="var(--pot-pat-color)" stroke-width="2"/></pattern><pattern id="patNotes" width="16" height="16" patternUnits="userSpaceOnUse"><circle cx="6" cy="10" r="3" fill="var(--pot-pat-color)"/><path d="M9 10V3H14" fill="none" stroke="var(--pot-pat-color)" stroke-width="1.5"/></pattern><pattern id="patChecks" width="12" height="12" patternUnits="userSpaceOnUse"><rect width="6" height="6" fill="var(--pot-pat-color)"/><rect x="6" y="6" width="6" height="6" fill="var(--pot-pat-color)"/></pattern><pattern id="patStars" width="20" height="20" patternUnits="userSpaceOnUse"><polygon points="10,2 12,8 18,8 13,12 15,18 10,14 5,18 7,12 2,8 8,8" fill="var(--pot-pat-color)" transform="scale(0.7)translate(4,4)"/></pattern><pattern id="patDiamonds" width="14" height="14" patternUnits="userSpaceOnUse"><polygon points="7,1 13,7 7,13 1,7" fill="var(--pot-pat-color)" transform="scale(0.7)translate(3,3)"/></pattern><pattern id="patLeaves" width="14" height="14" patternUnits="userSpaceOnUse"><path d="M7 2Q10 5 7 11 4 5 7 2" fill="var(--pot-pat-color)"/></pattern><pattern id="patMoons" width="16" height="16" patternUnits="userSpaceOnUse"><path d="M10 3A5 5 0 1 1 10 13A4 4 0 1 0 10 3" fill="var(--pot-pat-color)"/></pattern>`;
    }
    ['previewDefs','harvestDefs','archiveDefs'].forEach(id=>{const d=document.getElementById(id);if(d&&defs)d.innerHTML=defs.innerHTML});
}
function getTimeOfDay(){const h=new Date().getHours();if(h>=5&&h<7)return'dawn';if(h>=7&&h<10)return'morning';if(h>=10&&h<16)return'day';if(h>=16&&h<18)return'afternoon';if(h>=18&&h<20)return'dusk';if(h>=20&&h<22)return'evening';return'night'}
function isDaytime(){return['dawn','morning','day','afternoon','dusk'].includes(getTimeOfDay())}
function updateTimeOfDay(){const t=getTimeOfDay();document.body.className=document.body.className.replace(/time-\w+/g,'');document.body.classList.add('time-'+t);updateSeasonalVisuals()}
function getMoonPhase(){const n=new Date(),jd=Math.floor(365.25*n.getFullYear())+Math.floor(30.6*(n.getMonth()+1))+n.getDate()-694039.09,p=jd/29.53058867;return MOON_PHASES[Math.floor((p-Math.floor(p))*8)%8]}
function updateMoonPhase(){const p=getMoonPhase();const me=document.getElementById('moonElement');if(me)me.style.setProperty('--moon-phase',p.phase+'%');updateSeason()}
function isNewMoon(){return getMoonPhase().name==='New Moon'}
function updateSeason(){
    const s=getSeason();
    const i=document.getElementById('seasonIndicator');
    if(i){
        const ad=getArcDay();
        // Keep it compact, but give the player a sense of where they are in the 14-day arc.
        i.textContent=`${s.icon} ${s.name} · Day ${ad}/${ARC_LENGTH_DAYS}`;
    }
    updateSeasonalVisuals();
}
function updateSeasonalVisuals(){
    const c=document.getElementById('seasonalContainer');if(!c)return;
    const sn=getSeason().name;
    const currentKey=sn+(sn==='Summer'?isDaytime():'');
    if(c.dataset.season===currentKey)return;
    c.dataset.season=currentKey;c.innerHTML='';
    if(sn==='Spring'){for(let i=0;i<10;i++){const b=document.createElement('div');b.className='seasonal-blossom';b.style.left=(Math.random()*120-10)+'%';b.style.animationDelay=(Math.random()*-30)+'s';b.style.animationDuration=(18+Math.random()*12)+'s';c.appendChild(b)}}
    else if(sn==='Summer'){if(isDaytime()){for(let i=0;i<3;i++){const b=document.createElement('div');b.className='seasonal-beam';b.style.left=(20+Math.random()*60)+'%';b.style.animationDelay=(Math.random()*-5)+'s';c.appendChild(b)}}}
    else if(sn==='Autumn'){for(let i=0;i<10;i++){const l=document.createElement('div');l.className='seasonal-leaf';l.style.left=(Math.random()*120-20)+'%';l.style.animationDelay=(Math.random()*-25)+'s';l.style.animationDuration=(15+Math.random()*10)+'s';l.style.backgroundColor=['#e67e22','#d35400','#f1c40f'][Math.floor(Math.random()*3)];c.appendChild(l)}}
    else if(sn==='Winter'){
        for(let i=0;i<40;i++){const s=document.createElement('div');s.className='seasonal-snow';s.style.left=Math.random()*100+'%';s.style.animationDelay=(Math.random()*-20)+'s';s.style.animationDuration=(10+Math.random()*5)+'s';c.appendChild(s)}
        // Rare aurora event (set by seasonalEventsTick).
        const au=state.seasonEvents?.flags?.auroraUntil;
        if(au && Date.now()<au){
            for(let i=0;i<4;i++){
                const a=document.createElement('div');
                a.className='seasonal-aurora';
                a.style.left=(5+Math.random()*80)+'%';
                a.style.animationDelay=(Math.random()*-6)+'s';
                a.style.animationDuration=(10+Math.random()*6)+'s';
                a.style.setProperty('--h', String(160+Math.random()*120));
                c.appendChild(a);
            }
        }
    }
}
function setupWorld(){const c=Math.min(80,20+state.generation*8),s=document.getElementById('starsContainer');if(s){s.innerHTML='';for(let i=0;i<c;i++){const star=document.createElement('div');star.className='star';star.style.cssText=`left:${Math.random()*100}%;top:${Math.random()*60}%;--dur:${3+Math.random()*4}s;--delay:${Math.random()*5}s;--brightness:${0.4+Math.random()*0.6}`;s.appendChild(star)}}}
function setupWeather(){const r=document.getElementById('rainContainer');if(r){r.innerHTML='';for(let i=0;i<60;i++){const d=document.createElement('div');d.className='raindrop';d.style.cssText=`left:${Math.random()*100}%;animation-delay:${Math.random()*2}s;animation-duration:${0.6+Math.random()*0.4}s`;r.appendChild(d)}}}
function generateDNA(parent=null){
    const wild=Math.random()>0.75,baseH=wild?Math.random()*360:80+Math.random()*80;
    const leafShapes=['round','pointed','heart','oak','lance','teardrop','maple'];
    const dna={
        // Stable seed so per-leaf variations stay consistent for this plant.
        seed: (parent?.seed ? (parent.seed * 1664525 + 1013904223) >>> 0 : (Math.random()*0xFFFFFFFF)>>>0),
        colorH:parent?lerp(parent.colorH,baseH,0.3):baseH,
        colorS:45+Math.random()*35,
        colorL:35+Math.random()*20,
        flowerH:Math.random()*360,
        flowerS:60+Math.random()*30,
        flowerL:55+Math.random()*20,
        stemCurve:parent?parent.stemCurve*0.3+(Math.random()-0.5)*40:(Math.random()-0.5)*30,
        stemHeight:70+Math.random()*30,
        leafCount:Math.floor(3+Math.random()*3),
        leafNodes:Math.floor(3+Math.random()*3),
        leafSize:0.78+Math.random()*0.45,
        leafSizeVar:0.12+Math.random()*0.22,
        leafScale:0.9+Math.random()*0.3,
        leafAngle:35+Math.random()*30,
        leafShape:leafShapes[Math.floor(Math.random()*leafShapes.length)],
        leanDirection:Math.random()>0.5?1:-1,
        branchSpread:20+Math.random()*15,
        flowerCount:Math.floor(1+Math.random()*3),
        petalCount:Math.floor(4+Math.random()*5),
        petalShape:['round','pointed','wavy'][Math.floor(Math.random()*3)],
        resilience:parent?.resilience||(0.8+Math.random()*0.4),
        bloomSpeed:parent?.bloomSpeed||(0.9+Math.random()*0.2),
        fireflyChance:parent?.fireflyChance||0.05
    };
    state.inheritedTraits.forEach(tid=>{const t=INHERITABLE_TRAITS.find(x=>x.id===tid);if(t){if(tid==='resilience')dna.resilience=Math.min(2,(dna.resilience||1)+0.2);if(tid==='bloomSpeed')dna.bloomSpeed=Math.min(1.5,(dna.bloomSpeed||1)+0.1);if(tid==='leafiness')dna.leafNodes=Math.min(6,(dna.leafNodes||4)+1);if(tid==='colorVibrancy')dna.colorS=Math.min(80,(dna.colorS||50)+10);if(tid==='flowerPower')dna.flowerCount=Math.min(4,(dna.flowerCount||1)+1);if(tid==='fireflyAffinity')dna.fireflyChance=Math.min(0.15,(dna.fireflyChance||0.05)+0.03)}});
    dna.flowerColor=`hsl(${dna.flowerH},${dna.flowerS}%,${dna.flowerL}%)`;return dna;
}
function lerp(a,b,t){return a+(b-a)*t}
function createSVGElement(tag){return document.createElementNS("http://www.w3.org/2000/svg",tag)}
function renderPlant(containerId,dna,stage,scarsOverride=null){
    const g=document.getElementById(containerId);if(!g||!dna)return;g.innerHTML='';

    // Layering: stems first, then leaves, then flowers.
    // This avoids late-stage stems drawing over leaves.
    const stemsG=createSVGElement('g');
    stemsG.setAttribute('data-layer','stems');
    const leavesG=createSVGElement('g');
    leavesG.setAttribute('data-layer','leaves');
    const flowersG=createSVGElement('g');
    flowersG.setAttribute('data-layer','flowers');
    g.appendChild(stemsG);
    g.appendChild(leavesG);
    g.appendChild(flowersG);
    const scars=scarsOverride||state.scars||[];
    const hasWilt=scars.includes('wilt'),hasBend=scars.includes('bend'),hasPale=scars.includes('pale');
    let cH=dna.colorH,cS=dna.colorS,cL=dna.colorL;
    if(hasPale){cS=Math.max(20,cS-30);cL=Math.min(70,cL+15)}
    const stemColor=`hsl(${cH},${cS}%,${cL}%)`,leafColor=`hsl(${cH},${cS}%,${cL+10}%)`,flowerColor=dna.flowerColor;
    const lean=dna.leanDirection||1,bendOff=hasBend?lean*15:0,wiltAng=hasWilt?20:0;
    const baseY=189;
    const stemH=dna.stemHeight*(0.3+stage*0.175);
    const curve=(dna.stemCurve||0)+bendOff;
    const stemStartX=100,stemStartY=baseY;
    const stemCtrlX=100+curve,stemCtrlY=baseY-stemH/2;
    const stemEndX=100+curve/2,stemEndY=baseY-stemH;
    function getPointOnStem(t){
        const x=(1-t)*(1-t)*stemStartX+2*(1-t)*t*stemCtrlX+t*t*stemEndX;
        const y=(1-t)*(1-t)*stemStartY+2*(1-t)*t*stemCtrlY+t*t*stemEndY;
        return{x,y};
    }
    if(stage>=1){
        const stem=createSVGElement('path');
        stem.setAttribute('d',`M${stemStartX} ${stemStartY} Q${stemCtrlX} ${stemCtrlY} ${stemEndX} ${stemEndY}`);
        stem.setAttribute('stroke',stemColor);
        stem.setAttribute('stroke-width',3+stage*0.5);
        stem.setAttribute('fill','none');
        stem.setAttribute('stroke-linecap','round');
        stemsG.appendChild(stem);
    }
    if(stage>=2){
        const lc=Math.min(dna.leafCount||3,stage);
        for(let i=0;i<lc;i++){
            const t=0.25+(i/lc)*0.5;
            const pt=getPointOnStem(t);
            const side=i%2===0?-1:1;
            const ang=(dna.leafAngle||45)*side+(hasWilt?wiltAng*side:0);
            renderLeaf(leavesG,pt.x,pt.y,ang,dna.leafSize||1,leafColor,dna.leafShape||'round',dna,i);
        }
    }
    if(stage===3){
        const bud=createSVGElement('ellipse');
        bud.setAttribute('cx',stemEndX);
        bud.setAttribute('cy',stemEndY);
        bud.setAttribute('rx',6);
        bud.setAttribute('ry',8);
        bud.setAttribute('fill',`hsl(${dna.flowerH},${dna.flowerS*0.5}%,${dna.flowerL-10}%)`);
        flowersG.appendChild(bud);
    }
    if(stage>=4){
        const flowerScale=stage>=5?1.3:1;
        renderFlower(flowersG,stemEndX,stemEndY-5,dna.petalCount||5,dna.petalShape||'round',flowerColor,flowerScale);
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
            stemsG.appendChild(branch1);
            // A small pair of leaves near the branch tip.
            renderLeaf(leavesG,branch1EndX,branch1EndY+6,(dna.leafAngle||45)*-1,dna.leafSize||1,leafColor,dna.leafShape||'round',dna,101);
            renderLeaf(leavesG,branch1EndX,branch1EndY+6,(dna.leafAngle||45)*1,dna.leafSize||1,leafColor,dna.leafShape||'round',dna,102);
            renderFlower(flowersG,branch1EndX,branch1EndY-3,dna.petalCount||5,dna.petalShape||'round',flowerColor,0.75);
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
            stemsG.appendChild(branch2);
            renderLeaf(leavesG,branch2EndX,branch2EndY+6,(dna.leafAngle||45)*-1,dna.leafSize||1,leafColor,dna.leafShape||'round',dna,201);
            renderLeaf(leavesG,branch2EndX,branch2EndY+6,(dna.leafAngle||45)*1,dna.leafSize||1,leafColor,dna.leafShape||'round',dna,202);
            renderFlower(flowersG,branch2EndX,branch2EndY-3,dna.petalCount||5,dna.petalShape||'round',flowerColor,0.65);
        }
    }
}
function seedRand(seed){
    // Deterministic 0..1
    let t = (seed >>> 0) + 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), 1 | t);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
function renderLeaf(g,x,y,angle,scale,color,shape,dna=null,leafIndex=0){
    const leaf=createSVGElement('path'),sz=scale*15;
    // Per-leaf size & occasional shape drift for natural variety.
    const baseSeed = (dna?.seed || 0) ^ ((leafIndex + 1) * 2654435761);
    const r1 = seedRand(baseSeed);
    const r2 = seedRand(baseSeed ^ 0x9e3779b9);
    const sizeMul = 1 + ((r1 - 0.5) * 2) * (dna?.leafSizeVar || 0.18);
    const finalSz = Math.max(7, sz * sizeMul);
    const shapeLocal = (r2 < 0.18 && dna) ? (['round','pointed','heart','oak','lance','teardrop','maple'][Math.floor(seedRand(baseSeed ^ 0xBEEF)*7)]) : shape;
    const paths={
        pointed:`M0,0 Q${-finalSz*0.5},${-finalSz} 0,${-finalSz*1.5} Q${finalSz*0.5},${-finalSz} 0,0`,
        heart:`M0,0 C${-finalSz*0.8},${-finalSz*0.3} ${-finalSz*0.8},${-finalSz} 0,${-finalSz*1.2} C${finalSz*0.8},${-finalSz} ${finalSz*0.8},${-finalSz*0.3} 0,0`,
        oak:`M0,0 Q${-finalSz*0.3},${-finalSz*0.4} ${-finalSz*0.55},${-finalSz*0.55} Q${-finalSz*0.25},${-finalSz*0.85} 0,${-finalSz*1.25} Q${finalSz*0.25},${-finalSz*0.85} ${finalSz*0.55},${-finalSz*0.55} Q${finalSz*0.3},${-finalSz*0.4} 0,0`,
        round:`M0,0 Q${-finalSz*0.7},${-finalSz*0.7} 0,${-finalSz*1.3} Q${finalSz*0.7},${-finalSz*0.7} 0,0`,
        lance:`M0,0 Q${-finalSz*0.25},${-finalSz*0.9} 0,${-finalSz*1.7} Q${finalSz*0.25},${-finalSz*0.9} 0,0`,
        teardrop:`M0,0 C${-finalSz*0.65},${-finalSz*0.2} ${-finalSz*0.35},${-finalSz*1.05} 0,${-finalSz*1.35} C${finalSz*0.35},${-finalSz*1.05} ${finalSz*0.65},${-finalSz*0.2} 0,0`,
        maple:`M0,0 Q${-finalSz*0.15},${-finalSz*0.3} ${-finalSz*0.55},${-finalSz*0.55} Q${-finalSz*0.25},${-finalSz*0.75} ${-finalSz*0.35},${-finalSz*1.05} Q0,${-finalSz*0.9} ${finalSz*0.35},${-finalSz*1.05} Q${finalSz*0.25},${-finalSz*0.75} ${finalSz*0.55},${-finalSz*0.55} Q${finalSz*0.15},${-finalSz*0.3} 0,0`
    };
    leaf.setAttribute('d',paths[shapeLocal]||paths.round);
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
let lastTickTime=Date.now(),saveDebounceTimer=null;
function startGameLoop(){setInterval(gameTick,CONFIG.tickRate)}
function gameTick(){
    if(state.isDead||document.visibilityState!=='visible')return;
    lastTickTime=Date.now();
    seasonalEventsTick();
    decay();
    checkNeglect();
    grow();
    processBuffs();
    processGuardians();
    attemptSpawnFirefly();
    if(!saveDebounceTimer){saveDebounceTimer=setTimeout(()=>{saveState();saveDebounceTimer=null},5000)}
    render();
}

function ensureSeasonEvents(){
    if(!state.seasonEvents){
        state.seasonEvents={arcDay:null, lastTimeOfDay:null, cooldowns:{}, flags:{}};
    }
    if(!state.seasonEvents.cooldowns) state.seasonEvents.cooldowns={};
    if(!state.seasonEvents.flags) state.seasonEvents.flags={};
}

function cdReady(key, ms){
    ensureSeasonEvents();
    const now=Date.now();
    const last=state.seasonEvents.cooldowns[key]||0;
    if(now-last < ms) return false;
    state.seasonEvents.cooldowns[key]=now;
    return true;
}

function seasonalEventsTick(){
    ensureSeasonEvents();
    const s=getSeason();
    const ad=getArcDay();
    const tod=getTimeOfDay();

    // One-time beat when the arc day changes.
    if(state.seasonEvents.arcDay!==ad){
        state.seasonEvents.arcDay=ad;
        const msgBySeason={
            spring:"A soft beginning.",
            summer:"Warmth gathers.",
            autumn:"The plant remembers.",
            winter:"Quiet holds the world."
        };
        spawnFloatingText(getSeasonLabel(),"rgba(255,255,255,0.9)",msgBySeason[s.key]);
    }

    // Beat on dusk/dawn transitions (season can lean on these).
    if(state.seasonEvents.lastTimeOfDay!==tod){
        const prev=state.seasonEvents.lastTimeOfDay;
        state.seasonEvents.lastTimeOfDay=tod;

        // Summer: a firefly festival can spark at dusk.
        if(s.key==='summer' && tod==='dusk' && cdReady('summerFestival', 6*60*60*1000)){
            state.seasonEvents.flags.festivalSpawns=3+Math.floor(Math.random()*3); // consumed in attemptSpawnFirefly()
            spawnFloatingText("Firefly evening","#a78bfa","The air is alive.");
        }

        // Winter: rare aurora on deep night transitions.
        if(s.key==='winter' && (tod==='evening'||tod==='night') && cdReady('winterAurora', 18*60*60*1000)){
            if(Math.random()<0.18){
                state.seasonEvents.flags.auroraUntil=Date.now()+ (6*60*1000);
                spawnFloatingText("Aurora","#93c5fd","The sky breathes color.");
                updateSeasonalVisuals();
            }
        }

        // Spring: dawn sometimes grants a gentle recovery.
        if(s.key==='spring' && tod==='dawn' && cdReady('springDawnGift', 3*60*60*1000)){
            if(Math.random()<0.35){
                state.water=Math.min(100,state.water+6);
                state.love=Math.min(100,state.love+5);
                spawnFloatingText("Dawn dew","#86efac","A little help.");
            }
        }
    }

    // Ongoing micro-events (subtle, rare; they should feel like weather, not chores).
    const avg=(state.water+state.sun+state.love)/3;
    const v=vitality01();

    if(s.key==='spring'){
        // Blossom blessing: small growth lift when already cared for.
        if(avg>60 && Math.random()<0.0008 && cdReady('springBlossom', 25*60*1000)){
            state.buffs.push({type:'growth',strength:0.55,remaining:60});
            state.buffs.push({type:'love',strength:0.08,remaining:60});
            spawnFloatingText("Blossom blessing","#fda4af","Growth comes easily.");
        }
        // Gentle shower: if thirsty and not raining, a brief free drink.
        if(state.water<30 && !state.isRainOn && Math.random()<0.0009 && cdReady('springShower', 40*60*1000)){
            state.water=Math.min(100,state.water+12);
            spawnFloatingText("A brief shower","#93c5fd","Soil drinks quietly.");
        }
    }

    if(s.key==='summer'){
        // Heatwave: makes sunlight harsher for a short time.
        if(isDaytime() && state.isSunLampOn && state.water<55 && Math.random()<0.001 && cdReady('summerHeatwave', 35*60*1000)){
            state.seasonEvents.flags.heatwaveUntil=Date.now()+ (2*60*1000);
            spawnFloatingText("Heatwave","#fbbf24","Water vanishes faster.");
        }
        // Noon bloom: a reward for balanced high vitals.
        if(tod==='day' && v>0.72 && balance01()>0.8 && Math.random()<0.0007 && cdReady('summerNoonBloom', 50*60*1000)){
            state.growth += 55;
            spawnFloatingText("A sudden bloom","#4ade80","The plant unfolds.");
        }
    }

    if(s.key==='autumn'){
        // Golden calm: slow decay for a while.
        if(Math.random()<0.0009 && cdReady('autumnCalm', 35*60*1000)){
            state.buffs.push({type:'slow',strength:0,remaining:120});
            spawnFloatingText("Golden calm","#fcd34d","Everything slows.");
        }
        // Memory leaf: if you have lineage, a small love gift.
        if(state.history && state.history.length>0 && Math.random()<0.0008 && cdReady('autumnMemory', 60*60*1000)){
            state.love=Math.min(100,state.love+10);
            spawnFloatingText("A fallen leaf","#fb923c","It remembers your care.");
        }
    }

    if(s.key==='winter'){
        // Stillness: when moonlight is on at night, decay slows.
        if(!isDaytime() && state.isSunLampOn && !isNewMoon() && Math.random()<0.0008 && cdReady('winterStillness', 45*60*1000)){
            state.buffs.push({type:'slow',strength:0,remaining:150});
            spawnFloatingText("Still night","#e9d5ff","Silence protects.");
        }
        // Frost nip: if sun is low for long, it can pale leaves without full crisis.
        if(avg<30 && state.sun<18 && Math.random()<0.0006 && cdReady('winterFrost', 90*60*1000)){
            state.sun=Math.max(0,state.sun-3);
            state.love=Math.max(0,state.love-2);
            spawnFloatingText("Frost","#bfdbfe","A hard edge.");
        }
    }
}
function recoveryMultiplier(v){
    // Recovery is slower when the plant is struggling, so neglect has lasting weight.
    if(v<=10) return 0.35;
    if(v<=30) return 0.6;
    return 1;
}
function decay(){
    const res=Math.max(0.5, state.dna?.resilience||1);
    const slow=state.buffs.find(b=>b.type==='slow')?0.5:1;
    const season=getSeason();
    const d=season.decay||{water:1,sun:1,love:1};
    const r=season.recovery||{water:1,sun:1,love:1};

    // Water
    if(state.isRainOn){
        // Spring rain is generous; summer rain is a little less effective (heat evaporates).
        const base=0.18;
        const gain=base*recoveryMultiplier(state.water)*r.water;
        state.water=Math.min(100,state.water+gain);
        if(state.water>=96&&Math.random()>0.97)spawnFloatingText("Too wet.","#93c5fd");
    }else{
        // Summer dries faster; winter holds moisture.
        let extra=1;
        // Heatwave event (summer) temporarily intensifies drying.
        if(state.seasonEvents?.flags?.heatwaveUntil && Date.now()<state.seasonEvents.flags.heatwaveUntil) extra*=1.6;
        state.water=Math.max(0,state.water-((CONFIG.decayRate.water/res)*slow*d.water*extra));
    }

    // Sun / Moonlight
    if(state.isSunLampOn){
        const isDay=isDaytime();
        const canMoon=!isDay && !isNewMoon();
        if(isDay || canMoon){
            const baseGain=isDay?0.34:0.16;
            const gain=baseGain*recoveryMultiplier(state.sun)*r.sun;
            state.sun=Math.min(100,state.sun+gain);
        }
        // Gentle dehydration if pushing light too high.
        if(state.sun>92){
            // In summer, intense light is harsher.
            const heat = (season.key==='summer')?1.35:1;
            state.water=Math.max(0,state.water-(0.12*heat));
            if(Math.random()>0.985)spawnFloatingText("A little intense.","#fbbf24");
        }
    }else{
        state.sun=Math.max(0,state.sun-((CONFIG.decayRate.sun/res)*slow*d.sun));
    }

    // Love decays slowly but steadily.
    // Winter makes distance heavier; spring makes tenderness linger.
    state.love=Math.max(0,state.love-((CONFIG.decayRate.love/res)*slow*d.love));
}

function checkNeglect(){
    const LOW=20, CRIT=10;
    const tick=CONFIG.tickRate;

    // Track time spent under "low" thresholds (with recovery that isn't instant).
    const under=(v)=>v<LOW;
    const recover=(ms)=>Math.max(0, ms - tick*0.75);

    state.neglect.water = under(state.water) ? (state.neglect.water + tick) : recover(state.neglect.water);
    state.neglect.sun   = under(state.sun)   ? (state.neglect.sun   + tick) : recover(state.neglect.sun);
    state.neglect.love  = under(state.love)  ? (state.neglect.love  + tick) : recover(state.neglect.love);

    const crisis = (state.water<=CRIT && state.sun<=CRIT && state.love<=CRIT);
    state.neglect.crisis = crisis ? (state.neglect.crisis + tick) : recover(state.neglect.crisis);

    // Single-stat neglect leaves lasting traces.
    const wH = state.neglect.water / 3600000;
    const sH = state.neglect.sun   / 3600000;
    const lH = state.neglect.love  / 3600000;
    const cH = state.neglect.crisis/ 3600000;

    let rerender=false;

    if(wH>=6 && !state.scars.includes('wilt')){
        state.scars.push('wilt');
        spawnFloatingText("Thirst left a mark.","#93c5fd");
        rerender=true;
    }
    if(sH>=6 && !state.scars.includes('pale')){
        state.scars.push('pale');
        spawnFloatingText("Light-starved.","#fde68a");
        rerender=true;
    }
    if(lH>=6 && !state.scars.includes('dormant')){
        state.scars.push('dormant');
        els.plantHero.classList.add('dormant-plant');
        spawnFloatingText("It withdrew into quiet.","#fca5a5");
        rerender=true;
    }

    // Deep crisis gradually bends, then (much later) kills.
    if(cH>=2 && !state.scars.includes('bend')){
        state.scars.push('bend');
        spawnFloatingText("The stem weakened.","#fca5a5");
        rerender=true;
    }

    if(crisis){
        state.timeAtZero += tick;
        if(state.timeAtZero >= CONFIG.deathTimeLimit) triggerDeath();
    }else{
        // Slowly forgive crisis time, but don't erase the story instantly.
        state.timeAtZero = Math.max(0, state.timeAtZero - tick*0.6);
        if(state.scars.includes('dormant') && getAverageVitality()>55 && state.love>40){
            els.plantHero.classList.remove('dormant-plant');
        }
    }

    if(rerender) renderPlant('plantGroup',state.dna,state.stage);
}
function triggerDeath(){state.isDead=true;els.plantHero.classList.add('dead-plant');els.deathOverlay.classList.add('open');saveState()}
function clamp01(v){return Math.max(0,Math.min(1,v))}
function vitality01(){return clamp01((state.water+state.sun+state.love)/300)}
function balance01(){
    const mx=Math.max(state.water,state.sun,state.love);
    const mn=Math.min(state.water,state.sun,state.love);
    return clamp01(1-((mx-mn)/100));
}
function careFactor01(){
    const v=vitality01();
    const b=balance01();
    return clamp01(0.15 + (v*0.70) + (b*0.15));
}
function grow(){
    if(state.isDead) return;
    const seasonG=getSeason().growth;
    const bloom=state.dna?.bloomSpeed||1;
    const dormantPenalty=state.scars.includes('dormant')?0.55:1;

    // Growth is continuous, but meaningfully shaped by care and balance.
    const care=careFactor01();
    const base=CONFIG.growthRate*state.growthMultiplier*seasonG*bloom*dormantPenalty;
    state.growth += base*care;
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
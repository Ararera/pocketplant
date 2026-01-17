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
let state = {water:50,sun:50,love:50,growth:0,stage:1,isSunLampOn:false,isRainOn:false,day:1,generation:1,name:"Sprout",season:0,dna:null,potColor:POT_COLORS[0],potPattern:'patNone',potPatternColor:'rgba(255,255,255,0.5)',timeAtZero:0,isDead:false,history:[],lastSave:Date.now(),growthMultiplier:1,singCooldownUntil:0,fertilizeCooldownUntil:0,fireflies:{},totalFireflies:0,activeGuardians:[],buffs:[],scars:[],crisisCount:0,inheritedTraits:[],lastDream:null,isMusicPlaying:false};
let els = {}, selectedFamily = null, activeBigFireflies = [];
const audio = {
    ctx:null,rainOsc:null,rainGain:null,isRainPlaying:false,bgTimer:null,isMusicPlaying:false,
    init(){if(!this.ctx)this.ctx=new(window.AudioContext||window.webkitAudioContext)()},
    play(freq,type,dur,vol=0.05){if(!this.ctx)this.init();if(this.ctx.state==='suspended')this.ctx.resume();const o=this.ctx.createOscillator(),g=this.ctx.createGain();o.type=type;o.frequency.value=freq;g.gain.setValueAtTime(0.01,this.ctx.currentTime);g.gain.linearRampToValueAtTime(vol,this.ctx.currentTime+0.05);g.gain.exponentialRampToValueAtTime(0.001,this.ctx.currentTime+dur);o.connect(g);g.connect(this.ctx.destination);o.start();o.stop(this.ctx.currentTime+dur)},
    startRainSound(){if(!this.ctx)this.init();if(this.ctx.state==='suspended')this.ctx.resume();this.stopRainSound();this.isRainPlaying=true;const buf=this.ctx.createBuffer(1,this.ctx.sampleRate*2,this.ctx.sampleRate);const d=buf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*0.1;this.rainOsc=this.ctx.createBufferSource();this.rainOsc.buffer=buf;this.rainOsc.loop=true;this.rainGain=this.ctx.createGain();this.rainGain.gain.value=0;this.rainOsc.connect(this.rainGain);this.rainGain.connect(this.ctx.destination);this.rainOsc.start();this.rainGain.gain.linearRampToValueAtTime(0.05,this.ctx.currentTime+2)},
    stopRainSound(){this.isRainPlaying=false;if(this.rainGain&&this.rainOsc){try{this.rainGain.gain.linearRampToValueAtTime(0,this.ctx.currentTime+0.5);const o=this.rainOsc;setTimeout(()=>{try{o.stop()}catch(e){}},600)}catch(e){}}this.rainOsc=null;this.rainGain=null},
    toggleRainSound(on){if(on&&!this.isRainPlaying)this.startRainSound();else if(!on&&this.isRainPlaying)this.stopRainSound()},
    water(){this.play(800,'sine',0.2)},sun(){this.play(300,'triangle',0.5)},love(){this.play(150,'sine',0.5)},chime(){this.play(600,'sine',0.1);this.play(800,'sine',0.2)},

    // --- Zen background music (6-minute looping chord piece) ---
    // Chord pad + sparse bell tones. The loop is exactly 360 seconds.
    // Any variation is deterministic (seeded) so the loop repeats seamlessly.

    bgTimers:[],

    _mulberry32(seed){
        let t=seed>>>0;
        return function(){
            t+=0x6D2B79F5;
            let r=Math.imul(t^(t>>>15),1|t);
            r^=r+Math.imul(r^(r>>>7),61|r);
            return ((r^(r>>>14))>>>0)/4294967296;
        };
    },

    _midiToFreq(m){
        return 440*Math.pow(2,(m-69)/12);
    },

    _playPadChordAt(t,chordMidi,dur,amp){
        // Soft pad: sine stack -> lowpass -> gain envelope
        const ctx=this.ctx;
        const g=ctx.createGain();
        const f=ctx.createBiquadFilter();
        f.type='lowpass';
        f.frequency.setValueAtTime(1200,t);
        f.Q.setValueAtTime(0.7,t);

        g.gain.setValueAtTime(0.0001,t);
        g.gain.linearRampToValueAtTime(amp,t+1.8);
        g.gain.setValueAtTime(amp,t+dur-1.4);
        g.gain.linearRampToValueAtTime(0.0001,t+dur);

        f.connect(g);
        g.connect(ctx.destination);

        chordMidi.forEach((m,i)=>{
            const o=ctx.createOscillator();
            o.type='sine';
            o.frequency.setValueAtTime(this._midiToFreq(m),t);
            // Gentle detune & spread
            o.detune.setValueAtTime((i-(chordMidi.length-1)/2)*2.0 + (Math.random()-0.5)*3.0,t);
            o.connect(f);
            o.start(t);
            o.stop(t+dur+0.1);
        });
    },

    _playBellAt(t,midi,amp){
        const ctx=this.ctx;
        const o=ctx.createOscillator();
        const g=ctx.createGain();
        const f=ctx.createBiquadFilter();

        o.type='triangle';
        o.frequency.setValueAtTime(this._midiToFreq(midi),t);

        f.type='bandpass';
        f.frequency.setValueAtTime(1600,t);
        f.Q.setValueAtTime(2.2,t);

        g.gain.setValueAtTime(0.0001,t);
        g.gain.linearRampToValueAtTime(amp,t+0.02);
        g.gain.exponentialRampToValueAtTime(0.0001,t+2.2);

        o.connect(f);
        f.connect(g);
        g.connect(ctx.destination);

        o.start(t);
        o.stop(t+2.3);
    },

    playBackgroundMusic(){
        if(!this.ctx)this.init();
        if(this.ctx.state==='suspended')this.ctx.resume();
        if(this.isMusicPlaying)return;
        this.isMusicPlaying=true;

        // Clear any previous timers
        this.bgTimers.forEach(id=>clearTimeout(id));
        this.bgTimers=[];

        const LOOP_SECONDS=360; // 6 minutes exactly

        // A slow harmonic “walk” that returns home cleanly.
        // Represented as MIDI chord stacks (mostly 9ths/sus/11ths).
        const CHORDS=[
            [48,55,62,64],       // Cmaj9-ish (C2 G2 D3 E3)
            [45,52,59,62],       // Am9 (A1 E2 B2 D3)
            [41,48,55,60],       // Fmaj7/9 color
            [43,50,57,62],       // Gsus2/9 color
            [38,45,52,55,60],    // Dm11-ish (D1 A1 E2 G2 C3)
            [48,55,60,64],       // Cmaj7
            [45,52,57,62],       // Am7/9
            [41,48,53,60],       // Fmaj9
            [43,50,55,62],       // Gsus
            [48,55,62,64],       // Cmaj9 return
        ];

        // 45 chord events * 8 seconds = 360 seconds
        const STEP=8;
        const STEPS=int(LOOP_SECONDS/STEP);

        function int(x){return x|0}

        const makeEvents=(seed)=>{
            const rand=this._mulberry32(seed);
            const ev=[];
            for(let i=0;i<STEPS;i++){
                const tt=i*STEP;
                const chord=CHORDS[i%CHORDS.length];

                // Choose a gentle inversion sometimes (deterministically per loop)
                let stack=chord.slice();
                if(rand()<0.35){
                    // rotate lowest note up an octave
                    stack=[...stack.slice(1), stack[0]+12];
                }
                if(rand()<0.20){
                    // add a high color tone occasionally
                    stack=stack.concat([stack[stack.length-1]+7]);
                }

                ev.push({t:tt, type:'chord', midi:stack});

                // Sparse bells: 0–2 per step
                const bellCount = (rand()<0.25) + (rand()<0.12);
                for(let b=0;b<bellCount;b++){
                    const off = 1.1 + rand()*5.2;
                    const bellPool=[72,74,76,79,81,83];
                    const note = bellPool[int(rand()*bellPool.length)];
                    ev.push({t:tt+off, type:'bell', midi:[note]});
                }
            }
            return ev;
        };

        const scheduleLoop = () => {
            if(!this.isMusicPlaying)return;

            // Seed resets each loop -> same 6-minute piece every time.
            const events=makeEvents(1337);
            const startAt=this.ctx.currentTime+0.05;

            // Schedule all events for this loop (setTimeout ensures cancellation works)
            for(const e of events){
                const when = startAt + e.t;
                const delayMs = Math.max(0,(when-this.ctx.currentTime)*1000);
                const id=setTimeout(()=>{
                    if(!this.isMusicPlaying)return;
                    try{
                        if(e.type==='chord') this._playPadChordAt(when,e.midi,7.2,0.028);
                        else this._playBellAt(when,e.midi[0],0.022);
                    }catch(_){/* ignore */}
                },delayMs);
                this.bgTimers.push(id);
            }

            // Re-arm next loop
            const loopId=setTimeout(()=>{
                // Keep it clean: clear timers from the previous loop before rescheduling
                this.bgTimers.forEach(id=>clearTimeout(id));
                this.bgTimers=[];
                scheduleLoop();
            },(LOOP_SECONDS+0.15)*1000);
            this.bgTimers.push(loopId);
        };

        scheduleLoop();
    },

    stopBackgroundMusic(){
        this.isMusicPlaying=false;
        this.bgTimers.forEach(id=>clearTimeout(id));
        this.bgTimers=[];
    }
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
function generateDNA(parent=null){
    const wild=Math.random()>0.75,baseH=wild?Math.random()*360:80+Math.random()*80;
    const dna={colorH:parent?lerp(parent.colorH,baseH,0.3):baseH,colorS:45+Math.random()*35,colorL:35+Math.random()*20,flowerH:Math.random()*360,flowerS:60+Math.random()*30,flowerL:55+Math.random()*20,stemCurve:parent?parent.stemCurve*0.3+(Math.random()-0.5)*40:(Math.random()-0.5)*30,stemHeight:70+Math.random()*30,leafCount:Math.floor(3+Math.random()*3),leafNodes:Math.floor(3+Math.random()*3),leafSize:0.8+Math.random()*0.4,leafScale:0.9+Math.random()*0.3,leafAngle:35+Math.random()*30,leafShape:['round','pointed','heart','oak'][Math.floor(Math.random()*4)],leanDirection:Math.random()>0.5?1:-1,branchSpread:20+Math.random()*15,flowerCount:Math.floor(1+Math.random()*3),petalCount:Math.floor(4+Math.random()*5),petalShape:['round','pointed','wavy'][Math.floor(Math.random()*3)],resilience:parent?.resilience||(0.8+Math.random()*0.4),bloomSpeed:parent?.bloomSpeed||(0.9+Math.random()*0.2),fireflyChance:parent?.fireflyChance||0.05};
    state.inheritedTraits.forEach(tid=>{const t=INHERITABLE_TRAITS.find(x=>x.id===tid);if(t){if(tid==='resilience')dna.resilience=Math.min(2,(dna.resilience||1)+0.2);if(tid==='bloomSpeed')dna.bloomSpeed=Math.min(1.5,(dna.bloomSpeed||1)+0.1);if(tid==='leafiness')dna.leafNodes=Math.min(6,(dna.leafNodes||4)+1);if(tid==='colorVibrancy')dna.colorS=Math.min(80,(dna.colorS||50)+10);if(tid==='flowerPower')dna.flowerCount=Math.min(4,(dna.flowerCount||1)+1);if(tid==='fireflyAffinity')dna.fireflyChance=Math.min(0.15,(dna.fireflyChance||0.05)+0.03)}});
    dna.flowerColor=`hsl(${dna.flowerH},${dna.flowerS}%,${dna.flowerL}%)`;return dna;
}
function lerp(a,b,t){return a+(b-a)*t}
function createSVGElement(tag){return document.createElementNS("http://www.w3.org/2000/svg",tag)}
function renderPlant(containerId,dna,stage,scarsOverride=null){
    const g=document.getElementById(containerId);if(!g||!dna)return;g.innerHTML='';
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
        g.appendChild(stem);
    }
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
    if(stage===3){
        const bud=createSVGElement('ellipse');
        bud.setAttribute('cx',stemEndX);
        bud.setAttribute('cy',stemEndY);
        bud.setAttribute('rx',6);
        bud.setAttribute('ry',8);
        bud.setAttribute('fill',`hsl(${dna.flowerH},${dna.flowerS*0.5}%,${dna.flowerL-10}%)`);
        g.appendChild(bud);
    }
    if(stage>=4){
        const flowerScale=stage>=5?1.3:1;
        renderFlower(g,stemEndX,stemEndY-5,dna.petalCount||5,dna.petalShape||'round',flowerColor,flowerScale);
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
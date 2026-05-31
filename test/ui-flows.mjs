// Headless test of Tier-1 UI flows: onboarding gate, death->respawn, confirm.
const store={};const noop=()=>{};
function makeEl(){const el={children:[],dataset:{},style:{},classList:{add:noop,remove:noop,toggle:noop,contains:()=>false},appendChild(c){this.children.push(c);return c;},remove:noop,addEventListener:noop,removeEventListener:noop,setAttribute:noop,getContext:()=>new Proxy({},{get:()=>noop}),getBoundingClientRect:()=>({left:0,top:0,width:960,height:600}),querySelector:()=>makeEl(),querySelectorAll:()=>[],click:noop,width:960,height:600,set onclick(v){},set onchange(v){},set oninput(v){},set innerHTML(v){this.children=[];},set textContent(v){}};return el;}
globalThis.localStorage={getItem:(k)=>(k in store?store[k]:null),setItem:(k,v)=>{store[k]=String(v);},removeItem:(k)=>{delete store[k];}};
Object.defineProperty(globalThis,'navigator',{value:{maxTouchPoints:0},configurable:true});
globalThis.window={addEventListener:noop,removeEventListener:noop,devicePixelRatio:1,AudioContext:undefined};
globalThis.document={createElement:makeEl,body:makeEl(),getElementById:makeEl,querySelector:()=>makeEl(),addEventListener:noop,removeEventListener:noop,hidden:false};
globalThis.Image=class{set src(v){}};globalThis.performance={now:()=>Date.now()};globalThis.requestAnimationFrame=noop;
const {Game}=await import('../src/Game.js');
const {Progress}=await import('../src/persistence/Progress.js');
const {Settings}=await import('../src/persistence/Settings.js');
const {Audio}=await import('../src/systems/Audio.js');
const {MODE}=await import('../src/core/constants.js');
let pass=0;const ok=(m)=>{console.log('  ✓ '+m);pass++;};
const settings=new Settings();
const mk=()=>new Game({canvas:makeEl(),hudRoot:makeEl(),sprites:{},progress:new Progress(),settings,audio:new Audio({sound:false,music:false}),onExit:()=>{}});
// Onboarding gates on settings.seenTutorial
const g=mk();g.newWorld('stone',MODE.SURVIVAL);
let onboardShown=false;g.hud.showOnboarding=(done)=>{onboardShown=true;g._onboardDone=done;};
g.start();
if(!onboardShown)throw new Error('onboarding not shown on first run');
if(!g.paused)throw new Error('game should pause during onboarding');
g._onboardDone();// finish
if(!settings.get('seenTutorial'))throw new Error('seenTutorial not persisted');
if(g.paused)throw new Error('game should resume after onboarding');
ok('onboarding shows once, pauses, persists, resumes');
// Second run: no onboarding
const g2=mk();g2.newWorld('stone',MODE.SURVIVAL);let shown2=false;g2.hud.showOnboarding=()=>{shown2=true;};g2.start();
if(shown2)throw new Error('onboarding shown again after seen');
ok('onboarding does not repeat once seen');
// Death -> death screen with cause + stats
const g3=mk();g3.newWorld('stone',MODE.SURVIVAL);g3.start();
let death=null;g3.hud.showDeath=(info)=>{death=info;};
g3._damagePlayer(999,'a T-Rex');
g3.update(0.016);
if(!g3.dead)throw new Error('dead flag not set');
if(!death||!/T-Rex/.test(death.cause))throw new Error('death cause not passed: '+JSON.stringify(death&&death.cause));
if(typeof death.stats.mined!=='number')throw new Error('death stats missing');
ok('death triggers screen with cause + run stats');
// Respawn restores player and unpauses
g3._respawn();
if(g3.dead||!g3.player.alive||g3.player.health!==100)throw new Error('respawn did not revive');
ok('respawn revives player and clears death state');
// Confirm dialog invokes onYes
const g4=mk();g4.newWorld('stone',MODE.SURVIVAL);g4.start();
let captured=null;g4.hud.confirm=(t,b,onYes)=>{captured=onYes;};
let exited=false;g4.exit=()=>{exited=true;};
g4._hudHandlers().onMainMenu();
if(!captured)throw new Error('confirm not invoked for main menu');
captured();if(!exited)throw new Error('confirm onYes did not run exit');
ok('destructive action routes through confirm dialog');
console.log(`\nAll ${pass} Tier-1 UI checks passed.`);

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
// Era intro shows on a fresh era, then chains into onboarding.
const g=mk();g.newWorld('stone',MODE.SURVIVAL);
let introShown=false;g.hud.showEraIntro=(era,done)=>{introShown=true;done();};// auto-advance the reveal
let onboardShown=false;g.hud.showOnboarding=(done)=>{onboardShown=true;g._onboardDone=done;};
g.start();
if(!introShown)throw new Error('era intro not shown on fresh era');
if(!onboardShown)throw new Error('onboarding not shown after intro');
if(!g.paused)throw new Error('game should pause during onboarding');
g._onboardDone();// finish
if(!settings.get('seenTutorial'))throw new Error('seenTutorial not persisted');
if(g.paused)throw new Error('game should resume after onboarding');
ok('era intro → onboarding shows once, pauses, persists, resumes');
// Second run: intro still shows (per fresh era) but onboarding does not repeat.
const g2=mk();g2.newWorld('stone',MODE.SURVIVAL);g2.hud.showEraIntro=(era,done)=>done();let shown2=false;g2.hud.showOnboarding=()=>{shown2=true;};g2.start();
if(shown2)throw new Error('onboarding shown again after seen');
ok('onboarding does not repeat once seen');
// Death -> death screen with cause + stats
const g3=mk();g3.newWorld('stone',MODE.SURVIVAL);g3.hud.showEraIntro=(era,done)=>done();g3.start();
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
const g4=mk();g4.newWorld('stone',MODE.SURVIVAL);g4.hud.showEraIntro=(era,done)=>done();g4.start();
let captured=null;g4.hud.confirm=(t,b,onYes)=>{captured=onYes;};
let exited=false;g4.exit=()=>{exited=true;};
g4._hudHandlers().onMainMenu();
if(!captured)throw new Error('confirm not invoked for main menu');
captured();if(!exited)throw new Error('confirm onYes did not run exit');
ok('destructive action routes through confirm dialog');
// The Mine/Build toggle is reachable as a HUD action (the on-screen button that
// players without an easy right-click — e.g. Mac trackpads — were missing).
const g5=mk();g5.newWorld('stone',MODE.SURVIVAL);g5.hud.showEraIntro=(era,done)=>done();g5.start();
if(typeof g5.hud.h.onToggleBuild!=='function')throw new Error('HUD has no build-toggle handler');
const beforeMode=g5.buildMode;g5.hud.h.onToggleBuild();
if(g5.buildMode===beforeMode)throw new Error('build toggle did not flip build mode');
ok('HUD Mine/Build toggle is wired (clickable build for trackpad users)');

// Desktop Inventory/Craft/Journal are reachable as clickable HUD actions, not
// keyboard-only — the same discoverability fix as the build button.
for(const h of ['onToggleInventory','onToggleCrafting','onToggleJournal']){
  if(typeof g5.hud.h[h]!=='function')throw new Error('HUD missing handler '+h+' for desktop action buttons');
}
ok('Desktop Inventory/Craft/Journal actions are wired to HUD handlers');

// First-cell guidance names the exact next action — including HOW to build, the
// step where new (and Mac) players were getting stuck.
const g6=mk();g6.newWorld('cell',MODE.SURVIVAL);g6.hud.showEraIntro=(era,done)=>done();g6.start();
g6.prelife.active=false;g6.player.form='cell';
let step=g6.hud._cellNextStep(g6);
if(!/absorb/i.test(step||''))throw new Error('first cell step should be to absorb: '+step);
g6.inventory.add('nutrient_blob',3);g6.inventory.add('mineral_vent',1);g6.crafted.add('lipid_membrane');
g6.objectives.evaluate(g6);
step=g6.hud._cellNextStep(g6);
if(!/Build/.test(step||''))throw new Error('cell guidance should tell the player to Build the membrane: '+step);
ok('First Cell guidance names the next action and the Build control');

// The first-ever cell run starts before life and becomes a cell only after the
// player brings together two molecules and one source of vent energy.
const gPre=mk();gPre.settings.set('seenPrelife',false);gPre.newWorld('cell',MODE.SURVIVAL);
if(!gPre.prelife.active||gPre.player.form!=='spark')throw new Error('fresh origin should begin before life');
gPre.hud.showEraIntro=(era,done)=>done();gPre.hud.bigToast=noop;
gPre._notePrelifeAbsorb('nutrient_blob');gPre._notePrelifeAbsorb('nutrient_blob');gPre._notePrelifeAbsorb('mineral_vent');
if(gPre.prelife.active||gPre.player.form!=='cell')throw new Error('ingredients should create the First Cell');
if(!gPre.settings.get('seenPrelife'))throw new Error('completed prologue should persist');
ok('Before Life prologue teaches movement and creates the First Cell');

// Every modal is a true pause, the map is actually visible, and Escape closes
// the active modal instead of leaving the game invisibly paused.
const g7=mk();g7.newWorld('cell',MODE.SURVIVAL);g7.hud.showEraIntro=(era,done)=>done();g7.start();
let mapShown=false;g7.hud.showMap=(show)=>{mapShown=show;};
g7._toggleMap();
if(!g7.mapOpen||!g7.paused||!mapShown)throw new Error('map should open visibly and pause the game');
g7._onPause();
if(g7.mapOpen||g7.paused)throw new Error('Escape should close the map and resume');
g7._pause();g7._toggleInventory();
if(!g7.invOpen||!g7.paused)throw new Error('inventory opened from pause must keep the simulation paused');
g7._toggleInventory();
if(g7.invOpen||g7.paused)throw new Error('closing inventory should resume');
ok('map and menus have one visible, consistent pause flow');

console.log(`\nAll ${pass} Tier-1 UI checks passed.`);

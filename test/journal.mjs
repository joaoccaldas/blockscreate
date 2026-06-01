/**
 * Tier-2 UI: Journal (clues/discoveries/structures + timeline branch) and the
 * Era-Intro reveal. Verifies the data wiring and toggle flow headlessly.
 */
const store={};const noop=()=>{};
function makeEl(){const e={children:[],dataset:{},style:{},classList:{add:noop,remove:noop,toggle:noop,contains:()=>false},appendChild(c){this.children.push(c);return c;},remove:noop,addEventListener:noop,removeEventListener:noop,getContext:()=>new Proxy({},{get:()=>noop}),getBoundingClientRect:()=>({left:0,top:0,width:960,height:600}),querySelector:()=>makeEl(),querySelectorAll:()=>[],width:960,height:600,set innerHTML(v){this.children=[];},set textContent(v){},set onclick(v){},set onchange(v){},set oninput(v){}};return e;}
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
const mk=()=>new Game({canvas:makeEl(),hudRoot:makeEl(),sprites:{},progress:new Progress(),settings:new Settings(),audio:new Audio({sound:false,music:false}),onExit:noop});

// Journal data accessors expose the full catalog (locked + unlocked).
const g=mk();g.newWorld('stone',MODE.SURVIVAL);
if(!g.clues.all().length)throw new Error('clues.all() empty');
if(!g.discoveries.all().length)throw new Error('discoveries.all() empty');
if(!g.structures.all().length)throw new Error('structures.all() empty');
ok('journal sources expose full catalogs');

// renderJournal runs without throwing and toggle pauses/resumes.
let journalRendered=false;g.hud.renderJournal=()=>{journalRendered=true;};
g._toggleJournal();
if(!g.journalOpen||!journalRendered||!g.paused)throw new Error('journal did not open/pause/render');
g._toggleJournal();
if(g.journalOpen||g.paused)throw new Error('journal did not close/resume');
ok('journal toggles open (pause+render) and closed (resume)');

// branchCounts reflects discovered clues.
g.clues.discover('fossil_bed');
const bc=g.clues.branchCounts();
if(!bc.saurian_echo)throw new Error('branchCounts missing discovered clue branch');
ok('timeline branch counts track discovered clues');

// Era intro shows on fresh era and chains to onboarding via _introThenOnboard.
const g2=mk();g2.newWorld('stone',MODE.SURVIVAL);
let intro=null;g2.hud.showEraIntro=(era,done)=>{intro=era;done();};
g2.settings.set('seenTutorial','cell,land');// skip onboarding
g2.start();
if(!intro||intro.id!=='stone')throw new Error('era intro not shown for fresh stone era');
ok('era intro reveals the entered era');

console.log(`\nAll ${pass} journal/era-intro checks passed.`);

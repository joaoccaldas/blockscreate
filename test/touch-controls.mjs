const noop=()=>{};
const made=[];
function el(tag){const e={tag,children:[],dataset:{},style:{},_html:'',classList:{add:noop,remove:noop,toggle:noop,contains:()=>false},appendChild(c){this.children.push(c);return c;},remove:noop,addEventListener:noop,removeEventListener:noop,querySelector:(s)=>el('q'),querySelectorAll(sel){return this._buttons||[];},getBoundingClientRect:()=>({left:0,top:0,width:960,height:600}),set innerHTML(v){this._html=v;this._buttons=(v.match(/data-act="[a-z]+"/g)||[]).map(m=>{const act=m.match(/"([a-z]+)"/)[1];return {dataset:{act},classList:{add:noop,remove:noop},addEventListener:noop,style:{}};});},get innerHTML(){return this._html;},set textContent(v){},set onclick(v){},set onchange(v){},set oninput(v){},width:960,height:600};return e;}
globalThis.document={createElement:(t)=>{const e=el(t);made.push(e);return e;},body:el('body'),getElementById:()=>el('x'),querySelector:()=>el('q')};
globalThis.MODE={SURVIVAL:'survival',CREATIVE:'creative'};
const {HUD}=await import('../src/ui/HUD.js');
function actsFor(eraId,mode){
  made.length=0;
  const root=el('root');
  const hud=new HUD(root,{handlers:{},settings:{get:()=>false},isTouch:true,mode,eraId});
  const tc=made.find(e=>e._buttons&&e._buttons.length);
  return (tc?tc._buttons:[]).map(b=>b.dataset.act);
}
const cell=actsFor('cell','survival');
const land=actsFor('stone','survival');
const creative=actsFor('stone','creative');
console.log('cell controls:',cell.join(','));
console.log('land controls:',land.join(','));
console.log('creative controls:',creative.join(','));
if(!cell.includes('up')||!cell.includes('down'))throw new Error('cell era missing up/down swim buttons');
if(cell.includes('jump'))throw new Error('cell era should not have jump');
if(!land.includes('jump'))throw new Error('land era missing jump');
if(land.includes('fly'))throw new Error('survival land should not have fly');
if(!creative.includes('fly'))throw new Error('creative should have fly');
for(const set of [cell,land,creative]){
  if(!set.includes('inv')||!set.includes('craft'))throw new Error('missing quick inventory/craft buttons');
}
console.log('TOUCH CONTROLS OK');

function startGame(config={}){
  state.selectedLevel=config.level||state.selectedLevel;state.selectedCat=config.cat||state.selectedCat;state.playerName=config.name||state.playerName;runSeed=config.seed||Date.now();
  state.duration=LEVELS[state.selectedLevel].time;state.timeRemaining=state.duration;state.finishers=[];state.started=false;state.paused=false;state.lastTickSecond=null;
  buildWorld(state.selectedLevel,runSeed);openScreen('howTo');state.mode='tutorial';
  $('howTitle').textContent=`Escape ${LEVELS[state.selectedLevel].title}`;
}

async function beginRace(startAt=null){
  await audio.start(state.selectedLevel).catch(()=>{});openScreen(null);$('hud').classList.add('visible');if(isTouch)$('mobileControls').classList.add('visible');
  state.mode='playing';state.startAt=startAt||performance.now()+2800;state.started=false;
  for(const label of ['3','2','1','GO!']){await showCountdown(label,label==='GO!'?550:650);}
  state.startAt=performance.now();state.started=true;state.timeRemaining=state.duration;updateHud();
  try{if(!isTouch)$('game').requestPointerLock?.();}catch{}
}

function showCountdown(label,duration){return new Promise(resolve=>{$('countdown').textContent=label;$('countdown').classList.remove('visible');void $('countdown').offsetWidth;$('countdown').classList.add('visible');setTimeout(()=>{$('countdown').classList.remove('visible');resolve();},duration);});}

function launchFromNetwork(payload){
  if(!payload)return;state.multiplayer=true;state.selectedLevel=payload.level||'cozy';state.selectedCat=multiplayer.local.cat;state.playerName=multiplayer.local.name;runSeed=payload.seed||Date.now();
  state.duration=LEVELS[state.selectedLevel].time;state.timeRemaining=state.duration;state.finishers=[];buildWorld(state.selectedLevel,runSeed);openScreen('howTo');state.mode='tutorial';$('howTitle').textContent=`Escape ${LEVELS[state.selectedLevel].title}`;
}

function openScreen(id){document.querySelectorAll('.screen').forEach(el=>el.classList.remove('visible'));if(id)$(id)?.classList.add('visible');}
function showToast(text){$('toast').textContent=text;$('toast').classList.add('visible');clearTimeout(state.toastTimer);state.toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),1700);}
function addRaceFeed(message){if(!message)return;const item=document.createElement('div');item.className='feed-item';item.textContent=message;$('raceFeed').prepend(item);setTimeout(()=>item.remove(),4500);}

function renderRoster(players){
  $('playerRoster').innerHTML=players.map(p=>`<div class="roster-item"><span>${escapeHtml(p.name)} · ${escapeHtml(p.cat)}</span><span>${p.host?'HOST':'READY'}</span></div>`).join('');
  $('startRoomBtn').disabled=!multiplayer.isHost||players.length<1;
}
function profile(){state.playerName=($('playerName').value.trim()||'Mochi').slice(0,16);return{name:state.playerName,cat:state.selectedCat};}

function setupUI(){
  document.querySelectorAll('.cat-choice').forEach(btn=>btn.addEventListener('click',()=>{document.querySelectorAll('.cat-choice').forEach(b=>b.classList.remove('selected'));btn.classList.add('selected');state.selectedCat=btn.dataset.cat;$('playerName').value=btn.querySelector('b').textContent;}));
  document.querySelectorAll('.level-choice').forEach(btn=>btn.addEventListener('click',()=>{document.querySelectorAll('.level-choice').forEach(b=>b.classList.remove('selected'));btn.classList.add('selected');state.selectedLevel=btn.dataset.level;}));
  $('soloBtn').addEventListener('click',()=>{state.multiplayer=false;multiplayer.destroy();startGame({level:state.selectedLevel,...profile()});});
  $('hostBtn').addEventListener('click',async()=>{
    try{await audio.start(state.selectedLevel);state.multiplayer=true;openScreen('lobby');$('lobbyStatus').textContent='Opening a room…';const id=await multiplayer.host(profile());const url=new URL(location.href);url.searchParams.set('room',id);$('roomLink').value=url.toString();$('lobbyStatus').textContent='Share this link. The host controls the starting bell.';history.replaceState({},'',url);}
    catch(err){openScreen('menu');showToast(err.message||'Could not create room.');}
  });
  $('joinBtn').addEventListener('click',()=>openScreen('joinModal'));
  $('joinConfirmBtn').addEventListener('click',async()=>{
    $('joinError').textContent='';try{await audio.start(state.selectedLevel);state.multiplayer=true;await multiplayer.join($('joinCode').value,profile());openScreen('lobby');$('lobbyStatus').textContent='Connected. Waiting for the host to start…';$('roomLink').value=$('joinCode').value;}
    catch(err){$('joinError').textContent=err.message||'Could not join room.';}
  });
  $('copyRoomBtn').addEventListener('click',async()=>{try{await navigator.clipboard.writeText($('roomLink').value);showToast('Room link copied');}catch{showToast('Select and copy the link manually');}});
  $('startRoomBtn').addEventListener('click',()=>{multiplayer.startRace({level:state.selectedLevel,seed:Date.now()>>>0});});
  document.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',()=>openScreen('menu')));
  $('beginBtn').addEventListener('click',()=>beginRace());
  $('pauseBtn').addEventListener('click',togglePause);$('resumeBtn').addEventListener('click',togglePause);
  $('restartBtn').addEventListener('click',()=>{state.paused=false;startGame({level:state.selectedLevel,cat:state.selectedCat,name:state.playerName,seed:runSeed});});
  $('quitBtn').addEventListener('click',quitToMenu);$('menuBtn').addEventListener('click',quitToMenu);
  $('againBtn').addEventListener('click',()=>startGame({level:state.selectedLevel,cat:state.selectedCat,name:state.playerName,seed:Date.now()}));
  $('muteBtn').addEventListener('click',()=>{audio.setMuted(!audio.muted);$('muteBtn').textContent=audio.muted?'×':'♫';});
  if(isTouch)setupTouchControls();
  const room=new URLSearchParams(location.search).get('room');if(room){$('joinCode').value=room;setTimeout(()=>openScreen('joinModal'),900);}
}

function togglePause(){if(state.mode!=='playing'&&state.mode!=='paused')return;state.paused=!state.paused;state.mode=state.paused?'paused':'playing';if(state.paused){document.exitPointerLock?.();openScreen('pauseMenu');}else{openScreen(null);$('hud').classList.add('visible');if(isTouch)$('mobileControls').classList.add('visible');state.startAt=performance.now()-(state.duration-state.timeRemaining)*1000;}}
function quitToMenu(){state.started=false;state.paused=false;state.mode='menu';$('hud').classList.remove('visible');$('mobileControls').classList.remove('visible');multiplayer.destroy();state.multiplayer=false;history.replaceState({},'',location.pathname);openScreen('menu');buildMenuBackdrop();}

function setupInput(){
  addEventListener('keydown',e=>{input.keys.add(e.code);if(e.code==='Space'){e.preventDefault();input.jumpQueued=true;}if(e.code==='ShiftLeft'||e.code==='ShiftRight')input.pounceQueued=true;if(e.code==='KeyR')input.rescueQueued=true;if(e.code==='Escape'&&state.mode==='playing')togglePause();});
  addEventListener('keyup',e=>input.keys.delete(e.code));
  $('game').addEventListener('mousedown',e=>{input.pointerDown=true;input.pointerX=e.clientX;input.pointerY=e.clientY;if(state.mode==='playing'&&!document.pointerLockElement)$('game').requestPointerLock?.();});
  addEventListener('mouseup',()=>input.pointerDown=false);
  addEventListener('mousemove',e=>{
    if(state.mode!=='playing')return;
    if(document.pointerLockElement){state.cameraYaw-=e.movementX*.0024;state.cameraPitch=clamp(state.cameraPitch-e.movementY*.0018,.08,.82);}
    else if(input.pointerDown){state.cameraYaw-=(e.clientX-input.pointerX)*.006;state.cameraPitch=clamp(state.cameraPitch-(e.clientY-input.pointerY)*.004,.08,.82);input.pointerX=e.clientX;input.pointerY=e.clientY;}
  });
  $('game').addEventListener('wheel',e=>{state.cameraPitch=clamp(state.cameraPitch+Math.sign(e.deltaY)*.03,.08,.82);},{passive:true});
}

function setupTouchControls(){
  const joy=$('joystick'),stick=$('stick');let active=null;const center={x:58,y:58};
  const move=e=>{const t=[...e.changedTouches].find(v=>v.identifier===active);if(!t)return;const r=joy.getBoundingClientRect();let x=t.clientX-r.left-center.x,y=t.clientY-r.top-center.y;const len=Math.hypot(x,y),max=38;if(len>max){x=x/len*max;y=y/len*max;}stick.style.transform=`translate(${x}px,${y}px)`;input.touchX=x/max;input.touchY=y/max;};
  joy.addEventListener('touchstart',e=>{active=e.changedTouches[0].identifier;move(e);},{passive:false});joy.addEventListener('touchmove',e=>{e.preventDefault();move(e);},{passive:false});joy.addEventListener('touchend',e=>{if([...e.changedTouches].some(t=>t.identifier===active)){active=null;input.touchX=input.touchY=0;stick.style.transform='';}},{passive:false});
  $('mobileJump').addEventListener('touchstart',e=>{e.preventDefault();input.jumpQueued=true;},{passive:false});$('mobilePounce').addEventListener('touchstart',e=>{e.preventDefault();input.pounceQueued=true;},{passive:false});
  let camTouch=null,lastX=0,lastY=0;$('game').addEventListener('touchstart',e=>{const t=e.changedTouches[0];camTouch=t.identifier;lastX=t.clientX;lastY=t.clientY;},{passive:true});$('game').addEventListener('touchmove',e=>{const t=[...e.changedTouches].find(v=>v.identifier===camTouch);if(!t||state.mode!=='playing')return;state.cameraYaw-=(t.clientX-lastX)*.006;state.cameraPitch=clamp(state.cameraPitch-(t.clientY-lastY)*.004,.08,.82);lastX=t.clientX;lastY=t.clientY;},{passive:true});
}

function buildMenuBackdrop(){
  buildWorld(state.selectedLevel,1729);state.started=false;if(player){player.group.position.set(-2,2.6,1);player.position.copy(player.group.position);}camera.position.set(-12,8,15);camera.lookAt(3,2,0);
}

function boot(){
  multiplayer = new Multiplayer({
    onRoster: players => renderRoster(players),
    onStart: payload => launchFromNetwork(payload),
    onRemoteState: data => updateRemoteState(data),
    onFinish: payload => onRemoteFinish(payload),
    onError: err => { showToast(err?.message || 'Multiplayer connection ended.'); if (state.mode === 'lobby') openScreen('menu'); },
    onEvent: message => addRaceFeed(message)
  });
  setupUI();setupInput();buildMenuBackdrop();
  const labels=['Warming the sunbeam…','Hiding sardines…','Charging the Roomba…','Unlocking the front door…'];let p=0;
  const timer=setInterval(()=>{p+=Math.random()*24;$('loadingFill').style.width=`${Math.min(100,p)}%`;$('loadingLabel').textContent=labels[Math.min(labels.length-1,Math.floor(p/26))];if(p>=100){clearInterval(timer);setTimeout(()=>{openScreen('menu');$('boot').style.opacity='0';setTimeout(()=>$('boot').remove(),500);},300);}},130);
  if('serviceWorker'in navigator&&location.protocol.startsWith('http'))navigator.serviceWorker.register('./sw.js').catch(()=>{});
  animate();
}

function animate(){
  requestAnimationFrame(animate);const dt=Math.min(.033,clock.getDelta());
  if(state.mode==='menu'){const t=performance.now()*.0002;camera.position.x=-12+Math.sin(t)*2;camera.position.z=15+Math.cos(t)*2;camera.lookAt(3,2,0);if(player)animateCat(player,dt,true);}
  if(!state.paused){updateWorld(dt);if(state.mode==='playing'){updatePlayer(dt);updateTimer();updateCamera(dt);updateRemotes(dt);updateNetwork(dt);}}
  renderer.render(scene,camera);
}

addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,1.8));});
addEventListener('beforeunload',()=>multiplayer.destroy());

boot();

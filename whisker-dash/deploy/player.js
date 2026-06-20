function createPlayer(profile){
  const palette=CAT_PALETTES[profile.cat]||CAT_PALETTES.ginger;
  const group=new THREE.Group();group.name=`cat-${profile.id}`;
  const bodyMat=material(palette.body,{roughness:.78});const darkMat=material(palette.dark,{roughness:.82});const chestMat=material(palette.chest,{roughness:.9});const eyeMat=material(palette.eye,{emissive:palette.eye,emissiveIntensity:.45});
  const body=new THREE.Mesh(new THREE.SphereGeometry(.72,24,18),bodyMat);body.scale.set(1.35,.82,.68);body.position.y=.75;body.castShadow=true;group.add(body);
  const chest=new THREE.Mesh(new THREE.SphereGeometry(.42,18,12),chestMat);chest.scale.set(.7,1,.5);chest.position.set(.68,.73,0);chest.castShadow=true;group.add(chest);
  const head=new THREE.Mesh(new THREE.SphereGeometry(.55,24,18),bodyMat);head.scale.set(1,.95,.94);head.position.set(.92,1.15,0);head.castShadow=true;group.add(head);
  for(const z of [-.33,.33]){
    const ear=new THREE.Mesh(new THREE.ConeGeometry(.25,.55,3),darkMat);ear.position.set(.9,1.7,z);ear.rotation.z=-.08;ear.rotation.x=z>0?.12:-.12;ear.castShadow=true;group.add(ear);
    const eye=new THREE.Mesh(new THREE.SphereGeometry(.07,10,8),eyeMat);eye.position.set(1.39,1.24,z*.55);group.add(eye);
  }
  const nose=new THREE.Mesh(new THREE.ConeGeometry(.07,.14,3),material(0xff8fa3,{roughness:.55}));nose.rotation.z=-Math.PI/2;nose.position.set(1.49,1.08,0);group.add(nose);
  const legs=[];
  for(const x of [-.4,.55]) for(const z of [-.43,.43]){
    const leg=new THREE.Mesh(new THREE.CapsuleGeometry(.12,.48,6,10),darkMat);leg.position.set(x,.27,z);leg.castShadow=true;group.add(leg);legs.push(leg);
    const paw=new THREE.Mesh(new THREE.SphereGeometry(.16,12,8),chestMat);paw.scale.set(1.2,.55,1);paw.position.set(x+.06,.03,z);group.add(paw);
  }
  const tail=new THREE.Group();tail.position.set(-.92,.9,0);group.add(tail);
  const tailSegments=[];
  let parent=tail;
  for(let i=0;i<6;i++){
    const seg=new THREE.Mesh(new THREE.CapsuleGeometry(.09,.38,4,8),i===5?darkMat:bodyMat);seg.rotation.z=Math.PI/2;seg.position.x=-.2;seg.castShadow=true;parent.add(seg);const pivot=new THREE.Group();pivot.position.x=-.4;parent.add(pivot);parent=pivot;tailSegments.push(pivot);
  }
  const nameCanvas=document.createElement('canvas');nameCanvas.width=256;nameCanvas.height=64;const ctx=nameCanvas.getContext('2d');ctx.font='700 30px Inter';ctx.textAlign='center';ctx.fillStyle='white';ctx.shadowColor='black';ctx.shadowBlur=6;ctx.fillText(profile.name,128,40);const nameTex=new THREE.CanvasTexture(nameCanvas);nameTex.colorSpace=THREE.SRGBColorSpace;
  const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:nameTex,transparent:true,depthTest:false}));sprite.scale.set(2.8,.7,1);sprite.position.set(0,2.35,0);sprite.visible=profile.remote;group.add(sprite);
  group.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});
  return {
    ...profile, group, body, head, legs, tailSegments, sprite,
    position:new THREE.Vector3(-7,1.3,0), velocity:new THREE.Vector3(), grounded:false, nearWall:false, wallNormal:new THREE.Vector3(),
    yaw:0, pounce:1, checkpointPos:new THREE.Vector3(-7,1.3,0), lastGroundY:0, finished:false,
    targetPosition:new THREE.Vector3(), targetYaw:0, remote:profile.remote
  };
}

function resetPlayer(full=false){
  if(!player)return;
  const p=full?new THREE.Vector3(-7,1.25,0):player.checkpointPos.clone();
  player.position.copy(p);player.group.position.copy(p);player.velocity.set(0,0,0);player.grounded=false;player.nearWall=false;player.finished=false;
  if(full){player.checkpointPos.copy(p);state.checkpoint=0;state.fish=0;fishItems.forEach(f=>{f.collected=false;f.mesh.visible=true});checkpoints.forEach(c=>{c.active=true;c.mesh.visible=true});}
}

function playerAABB(pos=player.position){return {min:new THREE.Vector3(pos.x-.65,pos.y-.02,pos.z-.48),max:new THREE.Vector3(pos.x+.65,pos.y+1.55,pos.z+.48)};}
function colliderBounds(c){return {min:new THREE.Vector3(c.pos.x-c.size.x/2,c.pos.y-c.size.y/2,c.pos.z-c.size.z/2),max:new THREE.Vector3(c.pos.x+c.size.x/2,c.pos.y+c.size.y/2,c.pos.z+c.size.z/2)};}
function intersects(a,b){return a.min.x<=b.max.x&&a.max.x>=b.min.x&&a.min.y<=b.max.y&&a.max.y>=b.min.y&&a.min.z<=b.max.z&&a.max.z>=b.min.z;}
function pointInBox(p,box){return Math.abs(p.x-box.pos.x)<=box.size.x/2&&Math.abs(p.y-box.pos.y)<=box.size.y/2&&Math.abs(p.z-box.pos.z)<=box.size.z/2;}

function resolveCollisions(previous,dt){
  player.grounded=false;player.nearWall=false;
  let a=playerAABB();
  for(const c of colliders){
    const b=colliderBounds(c);if(!intersects(a,b))continue;
    const prevA=playerAABB(previous);
    const wasAbove=prevA.min.y>=b.max.y-.22;
    if(wasAbove&&player.velocity.y<=0){
      const fallSpeed=Math.abs(player.velocity.y);player.position.y=b.max.y+.02;player.velocity.y=0;player.grounded=true;player.lastGroundY=b.max.y;
      if(fallSpeed>4.8)audio.land(Math.min(2,fallSpeed/6));
      a=playerAABB();continue;
    }
    if(c.topOnly)continue;
    const overlaps={x:Math.min(a.max.x-b.min.x,b.max.x-a.min.x),z:Math.min(a.max.z-b.min.z,b.max.z-a.min.z)};
    if(overlaps.x<overlaps.z){
      const dir=player.position.x<c.pos.x?-1:1;player.position.x+=dir*(overlaps.x+.015);player.velocity.x=Math.min(0,player.velocity.x*dir)*dir;player.wallNormal.set(dir,0,0);
    }else{
      const dir=player.position.z<c.pos.z?-1:1;player.position.z+=dir*(overlaps.z+.015);player.velocity.z=Math.min(0,player.velocity.z*dir)*dir;player.wallNormal.set(0,0,dir);
    }
    player.nearWall=c.wallJump;a=playerAABB();
  }
  if(player.position.y<-.9) rescuePlayer('You fell into the forbidden under-sofa realm.');
}

function rescuePlayer(message='Back to the last checkpoint.'){
  if(state.mode!=='playing'||player.finished)return;
  player.position.copy(player.checkpointPos);player.position.y+=.2;player.velocity.set(0,0,0);audio.meow();showToast(message);addRaceFeed(`${state.playerName} needed a paw`);
}

function updatePlayer(dt){
  if(!player||state.paused||!state.started||player.finished)return;
  const previous=player.position.clone();
  const keyForward=(input.keys.has('KeyW')||input.keys.has('ArrowUp')?1:0)-(input.keys.has('KeyS')||input.keys.has('ArrowDown')?1:0);
  const keyRight=(input.keys.has('KeyD')||input.keys.has('ArrowRight')?1:0)-(input.keys.has('KeyA')||input.keys.has('ArrowLeft')?1:0);
  input.forward=clamp(keyForward-input.touchY,-1,1);input.right=clamp(keyRight+input.touchX,-1,1);
  const forward=new THREE.Vector3(Math.cos(state.cameraYaw),0,-Math.sin(state.cameraYaw));
  const right=new THREE.Vector3(Math.sin(state.cameraYaw),0,Math.cos(state.cameraYaw));
  const move=new THREE.Vector3().addScaledVector(forward,input.forward).addScaledVector(right,input.right);
  if(move.lengthSq()>1)move.normalize();
  const moving=move.lengthSq()>.02;
  const maxSpeed=player.pounce<.25?11.5:7.4;
  const accel=player.grounded?27:11;
  player.velocity.x=lerp(player.velocity.x,move.x*maxSpeed,1-Math.exp(-accel*dt));
  player.velocity.z=lerp(player.velocity.z,move.z*maxSpeed,1-Math.exp(-accel*dt));
  if(moving){const targetYaw=Math.atan2(move.z,move.x);player.yaw=angleLerp(player.yaw,targetYaw,1-Math.exp(-14*dt));}
  if(input.jumpQueued){
    if(player.grounded){player.velocity.y=8.4;player.grounded=false;audio.jump();}
    else if(player.nearWall){player.velocity.y=8.8;player.velocity.addScaledVector(player.wallNormal,5.5);audio.jump();showToast('Wall jump!');}
    input.jumpQueued=false;
  }
  player.pounce=Math.min(1,player.pounce+dt*.43);
  if(input.pounceQueued&&player.pounce>=.95){
    const dir=moving?move:forward;player.velocity.x=dir.x*13.5;player.velocity.z=dir.z*13.5;player.velocity.y=Math.max(player.velocity.y,2.6);player.pounce=0;audio.pounce();
  }
  input.pounceQueued=false;
  if(input.rescueQueued){rescuePlayer();input.rescueQueued=false;}
  player.velocity.y-=22*dt;
  player.position.addScaledVector(player.velocity,dt);
  resolveCollisions(previous,dt);
  player.position.x=clamp(player.position.x,-9.5,58);player.position.z=clamp(player.position.z,-11.5,11.5);
  player.group.position.copy(player.position);player.group.rotation.y=-player.yaw;
  animateCat(player,dt,moving);
  updateTriggers();
  $('pounceMeter').querySelector('i').style.transform=`scaleX(${player.pounce})`;
}

function animateCat(cat,dt,moving){
  const t=performance.now()*.001;const speed=Math.hypot(cat.velocity.x,cat.velocity.z);const gait=moving?Math.min(1,speed/6):0;
  cat.body.position.y=.75+Math.sin(t*10)*.035*gait;cat.head.rotation.z=Math.sin(t*2.2)*.035;
  cat.legs.forEach((leg,i)=>{leg.rotation.z=Math.sin(t*(8+speed*.55)+(i%2?Math.PI:0))*gait*.46;});
  cat.tailSegments.forEach((seg,i)=>{seg.rotation.y=Math.sin(t*2.6+i*.48)*(.16+i*.025);seg.rotation.z=Math.sin(t*1.7+i*.35)*.05;});
  if(!cat.grounded){cat.body.rotation.z=clamp(cat.velocity.y*.025,-.22,.16);}else cat.body.rotation.z=lerp(cat.body.rotation.z,0,.18);
}
function angleLerp(a,b,t){let d=((b-a+Math.PI)%(Math.PI*2))-Math.PI;return a+d*t;}

function updateTriggers(){
  for(const f of fishItems){
    if(!f.collected&&player.position.distanceTo(f.pos)<1.15){f.collected=true;f.mesh.visible=false;state.fish++;state.duration+=2;audio.fish();updateHud();showToast('+2 seconds · sardine acquired');multiplayer.sendEvent?.(`${state.playerName} found a sardine`);}
  }
  for(const cp of checkpoints){
    if(cp.active&&state.checkpoint+1===cp.index&&pointInBox(player.position,cp)){
      cp.active=false;cp.mesh.visible=false;state.checkpoint=cp.index;player.checkpointPos.copy(cp.pos).add(new THREE.Vector3(-1.6,.4,0));audio.checkpoint();showToast(`Checkpoint ${cp.index} secured`);addRaceFeed(`${state.playerName} reached checkpoint ${cp.index}`);updateHud();
    }
  }
  if(finishTrigger&&pointInBox(player.position,finishTrigger)) finishRace(true);
}

function updateWorld(dt){
  const t=performance.now()*.001;
  for(const m of movingPlatforms){
    const old=m.mesh.position.clone();const v=Math.sin(t*m.speed+m.phase)*m.amplitude;
    if(m.axis==='z')m.mesh.position.z=m.origin.z+v; else if(m.axis==='y')m.mesh.position.y=m.origin.y+Math.abs(v); else m.mesh.position.x=m.origin.x+v;
    if(player?.grounded&&Math.abs(player.position.y-(old.y+m.collider.size.y/2))<.1&&Math.abs(player.position.x-old.x)<m.collider.size.x/2+.4&&Math.abs(player.position.z-old.z)<m.collider.size.z/2+.4){player.position.add(m.mesh.position.clone().sub(old));}
  }
  for(const h of hazards){
    if(h.type==='roomba'){
      const q=Math.sin(t*h.speed*.35+h.phase);h.mesh.position.copy(h.origin).addScaledVector(h.span,q);h.mesh.rotation.y=t*h.speed*.4;
      if(player&&!player.finished&&player.position.distanceTo(h.mesh.position)<h.radius+0.65){const away=player.position.clone().sub(h.mesh.position).setY(.35).normalize();player.velocity.addScaledVector(away,8);audio.noise?.(.09,.08,900);showToast('Roomba ambush!');}
    }else if(h.type==='fan'){
      h.mesh.rotation.y=t*h.speed;
      const flat=new THREE.Vector2(player.position.x-h.pos.x,player.position.z-h.pos.z);
      if(Math.abs(player.position.y-h.pos.y)<.9&&flat.length()<h.radius){player.velocity.add(new THREE.Vector3(flat.x,0,flat.y).normalize().multiplyScalar(3.5));showToast('Fan blast!');}
    }else if(h.type==='laser'){
      h.mesh.position.y=h.origin.y+Math.sin(t*h.speed)*.7;
      if(Math.abs(player.position.x-h.mesh.position.x)<h.radius&&Math.abs(player.position.z-h.mesh.position.z)<.8&&Math.abs(player.position.y-h.mesh.position.y-1.3)<1.45){player.velocity.x=-5;player.velocity.y=5.5;showToast('Laser whisker warning!');}
    }
  }
  fishItems.forEach((f,i)=>{if(!f.collected){f.mesh.rotation.y=t*1.8+i;f.mesh.position.y=f.mesh.userData.baseY+Math.sin(t*2+i)*.16;}});
  checkpoints.forEach((cp,i)=>{if(cp.active){cp.mesh.rotation.z=t*.7+i;cp.mesh.material.opacity=.55+Math.sin(t*3+i)*.18;}});
  if(dustParticles){dustParticles.rotation.y+=dt*.012;dustParticles.position.y=Math.sin(t*.2)*.2;}
  updateDoor();
}

function updateDoor(){
  if(!doorPanel||!state.started)return;
  const ratio=clamp(state.timeRemaining/state.duration,0,1);const close=1-ratio;
  doorPanel.position.z=lerp(5.7,0,Math.pow(close,1.7));
  doorPanel.rotation.y=lerp(-1.28,0,Math.pow(close,1.55));
  if(doorGlow){doorGlow.intensity=2+ratio*4;doorGlow.color.set(ratio<.18?0xff435d:LEVELS[state.selectedLevel].glow);}
}

function updateCamera(dt){
  if(!player)return;
  const target=player.position.clone().add(new THREE.Vector3(.2,1.2,0));
  const dist=isTouch?7.5:8.6;const horiz=dist*Math.cos(state.cameraPitch);
  const desired=target.clone().add(new THREE.Vector3(-Math.cos(state.cameraYaw)*horiz,dist*Math.sin(state.cameraPitch)+1.2,Math.sin(state.cameraYaw)*horiz));
  const follow=1-Math.exp(-7*dt);camera.position.lerp(desired,follow);camera.lookAt(target);
}

function updateRemotes(dt){
  for(const remote of remotePlayers.values()){
    remote.position.lerp(remote.targetPosition,1-Math.exp(-12*dt));remote.yaw=angleLerp(remote.yaw,remote.targetYaw,1-Math.exp(-12*dt));remote.group.position.copy(remote.position);remote.group.rotation.y=-remote.yaw;
    remote.velocity.set(Math.cos(remote.yaw)*remote.speed,0,Math.sin(remote.yaw)*remote.speed);remote.grounded=true;animateCat(remote,dt,remote.speed>.15);remote.sprite.quaternion.copy(camera.quaternion);
  }
}

let networkAccumulator=0;
function updateNetwork(dt){
  if(!state.multiplayer||!player||!state.started)return;
  networkAccumulator+=dt;if(networkAccumulator<.075)return;networkAccumulator=0;
  multiplayer.sendState({p:[round(player.position.x),round(player.position.y),round(player.position.z)],y:round(player.yaw),s:round(Math.hypot(player.velocity.x,player.velocity.z)),f:player.finished,c:state.checkpoint});
}
function round(n){return Math.round(n*100)/100;}

function updateRemoteState(data){
  let r=remotePlayers.get(data.id);
  if(!r){r=createPlayer({id:data.id,name:String(data.name||'Cat').slice(0,16),cat:data.cat||'ginger',remote:true});r.group.position.set(...(data.p||[0,0,0]));r.position.copy(r.group.position);r.targetPosition.copy(r.position);world.add(r.group);remotePlayers.set(data.id,r);addRaceFeed(`${r.name} entered the apartment`);}
  if(Array.isArray(data.p)&&data.p.length===3)r.targetPosition.set(...data.p);r.targetYaw=Number(data.y)||0;r.speed=Number(data.s)||0;r.finished=!!data.f;
}

function updateTimer(){
  if(!state.started||state.paused||player?.finished)return;
  state.timeRemaining=Math.max(0,state.duration-(performance.now()-state.startAt)/1000);
  const sec=Math.ceil(state.timeRemaining);
  if(sec!==state.lastTickSecond&&sec<=10){audio.tick(sec<=5);state.lastTickSecond=sec;}
  if(state.timeRemaining<=0)finishRace(false);
  updateHud();
}

function updateHud(){
  const remaining=Math.max(0,state.timeRemaining);const min=Math.floor(remaining/60);const sec=Math.floor(remaining%60);const tenth=Math.floor((remaining%1)*10);
  $('timer').textContent=`${String(min).padStart(2,'0')}:${String(sec).padStart(2,'0')}.${tenth}`;
  $('timerFill').style.transform=`scaleX(${clamp(remaining/state.duration,0,1)})`;
  $('timer').style.color=remaining<10?'#ff7184':'white';
  $('fishCount').textContent=state.fish;$('checkpointText').textContent=`Checkpoint ${state.checkpoint} / 3`;
}

function finishRace(success){
  if(!state.started||player?.finished)return;
  player.finished=true;state.started=false;
  const elapsed=(performance.now()-state.startAt)/1000;
  const payload={success,time:elapsed,fish:state.fish,checkpoint:state.checkpoint};
  if(state.multiplayer)multiplayer.sendFinish(payload);else state.finishers=[{...payload,id:'local',name:state.playerName}];
  if(success)audio.win();else audio.fail();
  setTimeout(()=>showResults(success,elapsed),700);
}

function onRemoteFinish(payload){
  if(!payload||!payload.id)return;
  if(!state.finishers.some(f=>f.id===payload.id))state.finishers.push(payload);
  addRaceFeed(payload.success?`${payload.name} escaped!`:`${payload.name} missed the door`);
}

function showResults(success,elapsed){
  openScreen('results');$('hud').classList.remove('visible');$('mobileControls').classList.remove('visible');
  $('resultBadge').textContent=success?'ESCAPED!':'DOOR CLOSED';$('resultBadge').style.color=success?'var(--mint)':'#ff7184';
  $('resultTitle').textContent=success?'The hallway smells like freedom.':'So close. The sofa remains undefeated.';
  $('resultTime').textContent=formatTime(elapsed);$('resultFish').textContent=state.fish;$('resultStyle').textContent=success?(state.fish>=6?'S':state.fish>=4?'A':'B'):'C';
  const local={id:multiplayer.local?.id||'local',name:state.playerName,success,time:elapsed,fish:state.fish};if(!state.finishers.some(f=>f.id===local.id))state.finishers.push(local);
  const sorted=[...state.finishers].sort((a,b)=>(b.success-a.success)||(a.time-b.time));
  $('podium').innerHTML=sorted.map((f,i)=>`<div class="podium-row"><b>${i+1}</b><span>${escapeHtml(f.name||'Cat')}</span><strong>${f.success?formatTime(f.time):'TRAPPED'}</strong></div>`).join('');
}
function formatTime(s){const min=Math.floor(s/60),sec=Math.floor(s%60),t=Math.floor((s%1)*10);return `${String(min).padStart(2,'0')}:${String(sec).padStart(2,'0')}.${t}`;}
function escapeHtml(v){return String(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}

function buildCozy(theme, rng) {
  const sofaMat = material(0x6d5b9f, { roughness:.92 });
  addRoundedBox('sofa seat', new THREE.Vector3(2,1,0), new THREE.Vector3(7,1.2,4), sofaMat, .45);
  addRoundedBox('sofa back', new THREE.Vector3(2,2.5,-1.6), new THREE.Vector3(7,3.3,.8), sofaMat, .3, { topOnly:false, wallJump:true });
  addRoundedBox('left arm', new THREE.Vector3(-1.1,2,0), new THREE.Vector3(.8,2.4,4), sofaMat, .3);
  addRoundedBox('right arm', new THREE.Vector3(5.1,2,0), new THREE.Vector3(.8,2.4,4), sofaMat, .3);
  const cushionMat = material(0xf0a17c, { roughness:.9 });
  addRoundedBox('cushion one', new THREE.Vector3(.2,1.85,-.5), new THREE.Vector3(2, .55, 1.7), cushionMat, .28);
  addRoundedBox('cushion two', new THREE.Vector3(2.4,1.85,-.35), new THREE.Vector3(2, .55, 1.7), material(0xf5ca6b), .28);
  addRoundedBox('cushion three', new THREE.Vector3(4.2,1.85,-.3), new THREE.Vector3(1.5,.55,1.7), material(0x68c9ac), .28);

  const tableMat = material(0x87523e, { map:textures.wood, roughness:.68 });
  addRoundedBox('coffee table', new THREE.Vector3(9,1.6,1.6), new THREE.Vector3(5.4,.45,3.2), tableMat, .18);
  for (const x of [7,11]) for (const z of [.4,2.8]) addBox('table leg', new THREE.Vector3(x,.75,z), new THREE.Vector3(.28,1.5,.28), tableMat);

  const shelfMat = material(0x5f3e35, { roughness:.72 });
  for (let i=0;i<4;i++) addRoundedBox('bookshelf shelf', new THREE.Vector3(16,1.2+i*1.55,-3), new THREE.Vector3(5.8,.32,2), shelfMat,.12);
  for (const x of [13.3,18.7]) addBox('shelf side',new THREE.Vector3(x,3.55,-3),new THREE.Vector3(.32,6.4,2),shelfMat,{topOnly:false,wallJump:true});
  for (let i=0;i<13;i++) {
    const x=13.8+(i%5)*1.02, y=1.65+Math.floor(i/5)*1.55, h=rng.range(.65,1.15);
    const book=addBox('book',new THREE.Vector3(x,y+h/2,-3),new THREE.Vector3(.25,h,.9),material(rng.pick([0xf06f6f,0x63b7af,0xf4c66b,0x8071cc])),{collider:false});
    book.rotation.z=rng.range(-.12,.12);
  }

  createMovingOttoman(new THREE.Vector3(23,1.15,2.5), new THREE.Vector3(3.2,.7,3.2), theme.accent, 2.8, 'z');
  createRoomba(new THREE.Vector3(29,.35,-2.3), new THREE.Vector3(6,0,0), 4.6);
  createKitchen(theme, 34, rng);
  createFinalHall(theme, 48, rng);
}

function buildPenthouse(theme, rng) {
  const glass = material(0x95d9e8,{roughness:.15,metalness:.18,transparent:true,opacity:.42});
  const skyline = new THREE.Group();
  for(let i=0;i<28;i++){
    const h=rng.range(3,14), w=rng.range(1.2,3.4), d=rng.range(1.2,3.4);
    const b=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material(rng.pick([0x45546a,0x596880,0x39445a]),{roughness:.75,emissive:0x172841,emissiveIntensity:.25}));
    b.position.set(-8+i*2.7,-1-h/2,-18-rng.range(0,7)); b.castShadow=false; skyline.add(b);
    if(i%2===0){const win=new THREE.PointLight(0xffd27d,.25,8);win.position.set(b.position.x,rng.range(1,7),b.position.z+2);skyline.add(win);}
  }
  world.add(skyline);
  for(let i=0;i<5;i++) addRoundedBox('designer bench',new THREE.Vector3(-1+i*5.2,1.1,(i%2?2.8:-2.7)),new THREE.Vector3(3.8,.65,2.4),material(i%2?0x5d53b8:0x78cfc7),.25);
  addBox('glass divider',new THREE.Vector3(13,3.2,-2),new THREE.Vector3(.25,6,8),glass,{topOnly:false,wallJump:true});
  for(let i=0;i<4;i++) {
    const p=createMovingPlatform(new THREE.Vector3(16+i*4.2,1.2+i*.85,(i%2?2.5:-2.5)),new THREE.Vector3(3,.42,3),theme.accent,1.8+i*.22,i%2?'z':'y');
    p.phase=i*.9;
  }
  createCeilingFan(new THREE.Vector3(30,5.4,0),5.5);
  const counterMat=material(0x50566b,{roughness:.25,metalness:.12});
  addRoundedBox('island',new THREE.Vector3(35,2.1,0),new THREE.Vector3(8,.55,4),counterMat,.16);
  addBox('island base',new THREE.Vector3(35,1,0),new THREE.Vector3(6,2,3),material(0xe9edf0));
  for(let i=0;i<3;i++) addRoundedBox('bar stool',new THREE.Vector3(32+i*3,1.5,3.1),new THREE.Vector3(1.5,.35,1.5),material(0x765eea),.25);
  createMovingOttoman(new THREE.Vector3(42,1.2,-2.2),new THREE.Vector3(3,.65,3),0x65e6c4,3.5,'z');
  createFinalHall(theme,48,rng);
}

function buildNeon(theme, rng) {
  for(let i=0;i<16;i++){
    const strip=mesh(new THREE.BoxGeometry(rng.range(2,6),.06,.12),material(theme.glow,{emissive:theme.glow,emissiveIntensity:3}),new THREE.Vector3(rng.range(-6,53),rng.range(.5,7),-12.1));
    strip.castShadow=false;
  }
  const crates=[[-2,1,0],[2,1.2,-2],[6,1.8,2],[10,2.4,-1.5]];
  crates.forEach(([x,y,z],i)=>addRoundedBox('neon crate',new THREE.Vector3(x,y,z),new THREE.Vector3(3.2,1+i*.35,3.2),material(i%2?0x443e72:0x62446f,{map:textures.neon,emissive:i%2?0x20185a:0x4a143d,emissiveIntensity:.8}),.15));
  for(let i=0;i<7;i++){
    const p=createMovingPlatform(new THREE.Vector3(13+i*4.3,1.1+(i%3)*1.1,(i%2?3:-3)),new THREE.Vector3(3.1,.36,2.4),i%2?0xff5aa5:0x54f2d2,2.5+i*.18,i%3===0?'y':'z');
    p.phase=i*.68;
  }
  createLaserGrid(new THREE.Vector3(26,1.1,0),5.6);
  createRoomba(new THREE.Vector3(35,.35,2.5),new THREE.Vector3(7,0,0),5.8,true);
  createRoomba(new THREE.Vector3(39,.35,-2.5),new THREE.Vector3(5,0,0),4.5,true);
  createFinalHall(theme,48,rng);
}

function createKitchen(theme, startX, rng) {
  const cabinetMat = material(0xd8bba7,{roughness:.86});
  const counterMat = material(0xefe7dc,{roughness:.25});
  addBox('kitchen cabinets',new THREE.Vector3(startX+1,1.1,-4.5),new THREE.Vector3(10,2.2,3.4),cabinetMat);
  addRoundedBox('countertop',new THREE.Vector3(startX+1,2.35,-4.5),new THREE.Vector3(10.5,.35,3.8),counterMat,.12);
  addRoundedBox('kitchen island',new THREE.Vector3(startX+2,2.25,2),new THREE.Vector3(7,.45,3.6),counterMat,.12);
  addBox('island base',new THREE.Vector3(startX+2,1.1,2),new THREE.Vector3(5.8,2.2,2.8),material(0x7d9a8a));
  const toaster = addRoundedBox('toaster',new THREE.Vector3(startX-1,2.85,-4.5),new THREE.Vector3(1.8,1.1,1.3),material(0x7d7a86,{metalness:.7,roughness:.28}),.22,{collider:false});
  toaster.castShadow=true;
  for(let i=0;i<3;i++){
    const plate=mesh(new THREE.CylinderGeometry(.55,.55,.08,24),material(rng.pick([0xf9e0b6,0x83cfbb,0xdd8d95])),new THREE.Vector3(startX+i*.8,2.58,-4.2));
    plate.rotation.x=Math.PI/2;
  }
}

function createFinalHall(theme, startX, rng) {
  const stepMat=material(theme.accent,{roughness:.7});
  for(let i=0;i<4;i++) addRoundedBox('shoe step',new THREE.Vector3(startX-2+i*2.2,.38+i*.47,(i%2?-2.2:2.2)),new THREE.Vector3(2.6,.55+i*.1,2.1),stepMat,.22);
  addRoundedBox('hall table',new THREE.Vector3(startX+5,2.3,-3.6),new THREE.Vector3(5,.4,2.2),material(0x7c5149,{map:textures.wood}),.15);
  addBox('hall base',new THREE.Vector3(startX+5,1.1,-3.6),new THREE.Vector3(3.8,2.2,1.6),material(0x614038));
  const doorMat=material(0x4d355e,{roughness:.58});
  doorPanel=addRoundedBox('front door',new THREE.Vector3(56,3.6,0),new THREE.Vector3(.7,7.2,5),doorMat,.22,{topOnly:false,collider:false});
  doorPanel.rotation.y=0;
  const frameMat=material(0xf1c46d,{emissive:theme.glow,emissiveIntensity:.5});
  addBox('door frame top',new THREE.Vector3(55.6,7.3,0),new THREE.Vector3(.55,.35,6),frameMat,{collider:false});
  addBox('door frame left',new THREE.Vector3(55.6,3.7,-2.85),new THREE.Vector3(.55,7.6,.35),frameMat,{collider:false});
  addBox('door frame right',new THREE.Vector3(55.6,3.7,2.85),new THREE.Vector3(.55,7.6,.35),frameMat,{collider:false});
  doorGlow=new THREE.PointLight(theme.glow,5,16,2);doorGlow.position.set(54,3.2,0);world.add(doorGlow);
  finishTrigger={pos:new THREE.Vector3(54.2,2,0),size:new THREE.Vector3(2.4,5,5.3)};
  for(let i=0;i<9;i++){
    const shoe=addRoundedBox('shoe',new THREE.Vector3(startX+rng.range(-2,5),.22,rng.range(-5,5)),new THREE.Vector3(rng.range(.7,1.3),.3,rng.range(1.1,1.8)),material(rng.pick([0x2d2940,0xe26e61,0x4f86a4,0xd0a85e])),.16,{collider:false});
    shoe.rotation.y=rng.range(0,Math.PI);
  }
}

function createMovingPlatform(pos,size,color,speed=2,axis='z'){
  const m=addRoundedBox('moving cushion',pos,size,material(color,{roughness:.86}),.25,{dynamic:true});
  const data={mesh:m,collider:colliders.at(-1),origin:pos.clone(),axis,amplitude:axis==='y'?1.9:3.2,speed,phase:0};
  movingPlatforms.push(data);return data;
}
function createMovingOttoman(pos,size,color,speed,axis){return createMovingPlatform(pos,size,color,speed,axis);}

function createRoomba(pos,span,speed=4.5,neon=false){
  const g=new THREE.Group();
  const body=new THREE.Mesh(new THREE.CylinderGeometry(1.15,1.2,.42,32),material(neon?0x272338:0x30303a,{metalness:.3,roughness:.35,emissive:neon?0xff257f:0x000000,emissiveIntensity:neon?.45:0}));
  body.castShadow=true;g.add(body);
  const ring=new THREE.Mesh(new THREE.TorusGeometry(.78,.08,8,30),material(neon?0x54f2d2:0x6b6c75,{emissive:neon?0x54f2d2:0,emissiveIntensity:2}));ring.rotation.x=Math.PI/2;ring.position.y=.23;g.add(ring);
  const eye=new THREE.Mesh(new THREE.SphereGeometry(.11,12,8),material(0xff5f6d,{emissive:0xff1f45,emissiveIntensity:3}));eye.position.set(.62,.28,0);g.add(eye);
  g.position.copy(pos);world.add(g);
  hazards.push({type:'roomba',mesh:g,origin:pos.clone(),span:span.clone(),speed,phase:Math.random()*5,radius:1.35});
}

function createCeilingFan(pos,radius){
  const g=new THREE.Group();g.position.copy(pos);
  const hub=new THREE.Mesh(new THREE.CylinderGeometry(.34,.45,.7,18),material(0x5a5868,{metalness:.5,roughness:.3}));g.add(hub);
  for(let i=0;i<4;i++){
    const blade=new THREE.Mesh(new THREE.BoxGeometry(radius,.16,.7),material(0x6c6471,{roughness:.5}));blade.position.x=radius/2;blade.rotation.y=i*Math.PI/2;g.add(blade);
  }
  world.add(g);hazards.push({type:'fan',mesh:g,speed:2.5,radius:radius*.78,pos:g.position});
}

function createLaserGrid(pos,width){
  const group=new THREE.Group();group.position.copy(pos);world.add(group);
  for(let i=0;i<4;i++){
    const beam=new THREE.Mesh(new THREE.CylinderGeometry(.045,.045,width,8),material(i%2?0xff5aa5:0x54f2d2,{emissive:i%2?0xff2a8a:0x2df1d2,emissiveIntensity:4}));
    beam.rotation.z=Math.PI/2;beam.position.set(0,.4+i*.68,0);beam.castShadow=false;group.add(beam);
  }
  hazards.push({type:'laser',mesh:group,origin:pos.clone(),speed:2.2,radius:width/2});
}

function createFish(pos,index){
  const g=new THREE.Group();
  const body=new THREE.Mesh(new THREE.SphereGeometry(.32,18,12),material(0xffd166,{metalness:.3,roughness:.22,emissive:0xff9f32,emissiveIntensity:.45}));body.scale.set(1.4,.65,.7);g.add(body);
  const tail=new THREE.Mesh(new THREE.ConeGeometry(.32,.58,3),body.material);tail.rotation.z=-Math.PI/2;tail.position.x=-.55;g.add(tail);
  const eye=new THREE.Mesh(new THREE.SphereGeometry(.045,8,6),material(0x1d1630));eye.position.set(.36,.12,.2);g.add(eye);
  const glow=new THREE.PointLight(0xffc857,.55,4);g.add(glow);
  g.position.copy(pos);g.userData.baseY=pos.y;g.userData.index=index;world.add(g);fishItems.push({mesh:g,collected:false,pos:g.position});
}

function createCheckpoint(pos,index,theme){
  const ring=new THREE.Mesh(new THREE.TorusGeometry(1.25,.11,12,46),material(theme.glow,{emissive:theme.glow,emissiveIntensity:3,transparent:true,opacity:.75}));
  ring.rotation.y=Math.PI/2;ring.position.copy(pos);ring.castShadow=false;world.add(ring);
  checkpoints.push({index,pos:pos.clone(),mesh:ring,active:true,size:new THREE.Vector3(2.5,4,5)});
}

function addDecor(theme,rng){
  for(let i=0;i<14;i++){
    const pot=new THREE.Mesh(new THREE.CylinderGeometry(.28,.38,.6,14),material(rng.pick([0xd67855,0xe3c69e,0x596d65])));pot.position.set(rng.range(-7,53),.3,rng.pick([-10.8,10.8]));pot.castShadow=true;world.add(pot);
    const plant=new THREE.Group();plant.position.set(pot.position.x,.7,pot.position.z);world.add(plant);
    for(let j=0;j<5;j++){const leaf=new THREE.Mesh(new THREE.SphereGeometry(.25,10,7),material(0x5a9971));leaf.scale.set(.65,1.8,.38);leaf.rotation.z=rng.range(-.8,.8);leaf.position.set(rng.range(-.28,.28),.35+rng.range(0,.5),rng.range(-.2,.2));plant.add(leaf);}
  }
  const count=220;
  const geo=new THREE.BufferGeometry();const arr=new Float32Array(count*3);
  for(let i=0;i<count;i++){arr[i*3]=rng.range(-8,56);arr[i*3+1]=rng.range(.3,8);arr[i*3+2]=rng.range(-11,11)}
  geo.setAttribute('position',new THREE.BufferAttribute(arr,3));
  dustParticles=new THREE.Points(geo,new THREE.PointsMaterial({color:state.selectedLevel==='neon'?0x70f7de:0xffe0a3,size:.035,transparent:true,opacity:.6}));world.add(dustParticles);
}

function buildWorld(levelKey, seed = Date.now()) {
  clearWorld(); runSeed = seed >>> 0; const rng = new RNG(runSeed); const theme = LEVELS[levelKey];
  scene.background.set(theme.sky); scene.fog.color.set(theme.fog); scene.fog.density=levelKey==='neon'?.014:.0085;
  ambientLight.intensity=theme.ambient;sunLight.intensity=theme.sun;sunLight.color.set(levelKey==='neon'?0x897dff:0xffefd0);
  audio.startAmbience(levelKey);
  addFloor(theme);
  if(levelKey==='cozy') buildCozy(theme,rng); else if(levelKey==='penthouse') buildPenthouse(theme,rng); else buildNeon(theme,rng);
  addDecor(theme,rng);

  const fishRoute = levelKey==='cozy'
    ? [[1,2.7,0],[9,2.5,1.6],[16,6,-3],[23,2.4,2.5],[36,3.3,-4],[42,3.5,2],[50,3.4,-2.2]]
    : levelKey==='penthouse'
      ? [[0,2.4,0],[8,2.1,2.8],[17,3.1,-2.5],[25,5,3],[35,3.3,0],[43,2.8,-2],[51,3.2,2]]
      : [[-1,2.1,0],[8,3.2,2],[16,4.4,-3],[25,5.1,3],[34,2.2,2.5],[43,4.8,-2],[52,2.4,0]];
  fishRoute.forEach((p,i)=>createFish(new THREE.Vector3(...p),i));
  createCheckpoint(new THREE.Vector3(15,2,0),1,theme);
  createCheckpoint(new THREE.Vector3(33,2,0),2,theme);
  createCheckpoint(new THREE.Vector3(48,2,0),3,theme);

  player = createPlayer({ id:'local', name:state.playerName, cat:state.selectedCat, remote:false });
  resetPlayer(true);
  world.add(player.group);
}

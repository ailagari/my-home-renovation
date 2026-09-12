import * as THREE from './vendor/three.module.js';
import {floorOffset,displayPosition} from './view-layout.js?v=20260913-layout-2';
import {OrbitControls} from './vendor/OrbitControls.js';
import {meta,rooms,walls,windows} from './data.js?v=20260913-layout-2';
import {fixture} from './fixtures3d.js?v=20260913-layout-2';
import {furnitureCatalog,resolvedFurniture,fitFurniture} from './furniture-data.js?v=20260913-layout-2';
import {modelInstance,ensureModelAssets} from './model-assets.js?v=20260913-layout-2';
import {compoundSettings} from './compound.js?v=20260913-layout-2';
let renderer,scene,camera,controls,root,host,ro,onSelect,ray=new THREE.Raycaster(),pointer=new THREE.Vector2(),floorObjects=[],lastOptions;
const materials=new Map();let serviceRoot,serviceMeshes=[],servicePick,placement;let activePalette=null;
let serviceState, surfaceMeshes=[], editor={mode:'select'}, dragging=null;
let furnitureRoot,furnitureNodes=[],furnitureSelection,furnitureLayoutKey;
const palettes={ivory:{wall:'#e9e4d9',floor:'#d2cabb',wood:'#b69b74',accent:'#666e63'},graphite:{wall:'#dfddd5',floor:'#a9aaa4',wood:'#806246',accent:'#343f3d'},sand:{wall:'#e3d6c2',floor:'#c6b396',wood:'#8e7051',accent:'#aaa28d'}};
const textures=new Map();function texture(kind){if(textures.has(kind))return textures.get(kind);const c=document.createElement('canvas');c.width=c.height=256;const cx=c.getContext('2d');cx.fillStyle=kind==='wood'?'#fff3dc':'#fff';cx.fillRect(0,0,256,256);let seed=43;const rnd=()=>{seed=(seed*16807)%2147483647;return seed/2147483647};for(let i=0;i<4000;i++){const a=rnd()*.10;cx.fillStyle=`rgba(60,48,34,${a})`;if(kind==='wood')cx.fillRect(rnd()*256,0,.2+rnd(),256);else cx.fillRect(rnd()*256,rnd()*256,1+rnd()*2,1+rnd()*2)}if(kind==='stone'){cx.strokeStyle='#b5b3aa';cx.lineWidth=1;cx.strokeRect(0,0,256,256)}const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;textures.set(kind,t);return t;}
function mat(color,opts={}){const k=color+JSON.stringify(opts);if(!materials.has(k))materials.set(k,new THREE.MeshStandardMaterial({color,roughness:.85,...opts}));return materials.get(k)}
function box(g,x,y,z,w,h,d,color,opts={}){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat(color,opts));m.position.set(x,y,z);if(activePalette){if(['#967152','#967d61','#b99b77','#967152','#b69b74','#806246','#8e7051'].includes(color))m.material=mat(activePalette.wood,{map:texture('wood')});else if(['#d9d6cd','#cecac0','#c8cbca','#d2cabb','#a9aaa4','#c6b396'].includes(color))m.material=mat(color,{map:texture('stone')});}m.castShadow=true;m.receiveShadow=true;g.add(m);return m}
function cyl(g,x,y,z,r,h,color){const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,32),mat(color));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;g.add(m);return m}
function line(g,points,color,width=1){const geo=new THREE.BufferGeometry().setFromPoints(points.map(p=>new THREE.Vector3(...p)));const m=new THREE.Line(geo,new THREE.LineBasicMaterial({color,linewidth:width}));g.add(m);return m}
function xyz(f,x,z){return [(x-meta.origin[f][0])/meta.scale,(z-meta.origin[f][1])/meta.scale]}
function wall(g,f,s,y,height,color){let [a,b,c,d]=s;const [x1,z1]=xyz(f,a,b),[x2,z2]=xyz(f,c,d);const len=Math.hypot(x2-x1,z2-z1);const m=box(g,(x1+x2)/2,y+height/2,(z1+z2)/2,len+.03,height,.145,color);m.rotation.y=-Math.atan2(z2-z1,x2-x1);return m}
function wallOpenings(g,f,s,y,h,color){const [a,b,c,d]=s;const horizontal=Math.abs(d-b)<1;const lo=horizontal?Math.min(a,c):Math.min(b,d),hi=horizontal?Math.max(a,c):Math.max(b,d);const openings=windows[f].filter(w=>horizontal?Math.abs(w[1]-b)<8&&w[0]>=lo-1&&w[2]<=hi+1:Math.abs(w[0]-a)<8&&w[1]>=lo-1&&w[3]<=hi+1).map(w=>[horizontal?w[0]:w[1],horizontal?w[2]:w[3]]).sort((u,v)=>u[0]-v[0]);let at=lo;
 const seg=(from,to,base,hh,col)=>{if(to-from<.1||hh<=0)return;wall(g,f,horizontal?[from,b,to,d]:[a,from,c,to],base,hh,col)};
 for(const [p,q] of openings){seg(at,p,y,h,color);const sillLevel=horizontal&&Math.abs(b-840)<2?.30:.85;const sill=Math.min(sillLevel,h);seg(p,q,y,sill,color);if(h>2.10)seg(p,q,y+2.10,h-2.10,color);if(h>.95){const [wx,wz]=xyz(f,horizontal?(p+q)/2:a,horizontal?b:(p+q)/2);const span=(q-p)/74;box(g,wx,y+(sillLevel+2.10)/2,wz,horizontal?span:.055,2.10-sillLevel,horizontal?.055:span,'#6d9291',{transparent:true,opacity:.5});for(const k of [-.5,0,.5])box(g,horizontal?wx+k*span:wx,y+(sillLevel+2.10)/2,horizontal?wz:wz+k*span,.055,2.10-sillLevel,.055,'#735340');}at=q;}seg(at,hi,y,h,color);
}
function shapeSlab(g,points,y,t,color,stairVoid=false){const sh=new THREE.Shape();points.forEach(([x,z],i)=>i?sh.lineTo(x,-z):sh.moveTo(x,-z));sh.closePath();if(stairVoid){const hole=new THREE.Path();hole.moveTo(5.1,-5.1);hole.lineTo(5.1,-8.0);hole.lineTo(7.15,-8.0);hole.lineTo(7.15,-5.1);hole.closePath();sh.holes.push(hole)}const mesh=new THREE.Mesh(new THREE.ExtrudeGeometry(sh,{depth:t,bevelEnabled:false}),mat(color));mesh.rotation.x=-Math.PI/2;mesh.position.y=y-t;mesh.receiveShadow=true;mesh.castShadow=true;g.add(mesh);return mesh}
function label(g,text,x,z,y){const canvas=document.createElement('canvas');canvas.width=768;canvas.height=160;const ctx=canvas.getContext('2d');ctx.fillStyle='#ffffffeb';ctx.fillRect(0,0,768,160);ctx.fillStyle='#183547';ctx.font='600 47px Segoe UI';ctx.textAlign='center';ctx.fillText(text,384,66);ctx.font='35px Segoe UI';ctx.fillText('Drawing dimension',384,118);const tex=new THREE.CanvasTexture(canvas);const m=new THREE.Mesh(new THREE.PlaneGeometry(2.7,.57),new THREE.MeshBasicMaterial({map:tex,transparent:true,side:THREE.DoubleSide,depthTest:false}));m.rotation.x=-Math.PI/2;m.position.set(x,y,z);m.renderOrder=10;g.add(m)}
function furnishing(g,f,r,y,proposed){const [x,z]=xyz(f,r.rect[0],r.rect[1]);const [w,d]=r.dim;const wood=proposed?'#967152':'#886647',cloth=proposed?'#c6bdac':'#779397';const b=(xx,zz,ww,dd,hh,col,base=0)=>box(g,x+xx,y+base+hh/2,z+zz,ww,hh,dd,col);
 if(proposed&&furnitureCatalog.some(item=>item.roomId===r.id)){
  // These fixed wall/AV elements stay attached to the room; furniture is rendered separately.
  if(r.id==='g-living'){b(1.65,.01,2.75,.12,1.2,'#ded7c8');b(1.65,.08,1.25,.04,.70,'#26383d',.88);}
  if(r.id==='f-living'){b(1.67,.08,2.0,.05,1.13,'#d8dedc',1.10);b(1.67,.08,2.1,.14,.12,'#3e4943',2.45);b(1.67,2.10,.30,.24,.10,'#515e58',2.63);b(1.67,2.10,.04,.04,.15,'#48584b',2.72);}
  if(r.kind==='prayer')b(w/2,.06,1.2,.05,1.50,'#e5d7b4');
  return;
 }
 if(r.kind==='bed'){
  const bw=1.5,bd=2.0,cx=w<3.3?w/2:w/2+.12,cz=d-bd/2-.10;b(cx,cz,bw+.08,bd+.08,.30,wood);b(cx,cz,bw,bd,.21,'#e6e3db',.30);b(cx,cz-.36,bw,.92,.035,proposed?'#688879':'#a8bbc3',.52);for(const dx of [-.38,.38])b(cx+dx,cz+.63,.62,.35,.12,'#f8f5e9',.51);b(cx,cz+.98,bw+.12,.08,.85,wood);if(w<3.3)b(1.1,.31,1.8,.60,1.95,proposed?'#cfbfa4':'#967d61');else b(.31,d/2,.60,Math.min(1.8,d-.5),1.95,proposed?'#cfbfa4':'#967d61');
  if(proposed){b(w-.24,1.02,.45,.90,.73,wood);b(w-.05,1.02,.04,.80,.45,'#e4d9c6',.80);for(const dx of [-.92,.92])b(cx+dx,d-.16,.26,.28,.55,wood);}
 }else if(r.id==='g-living'){
  if(proposed){b(.60,1.85,.90,2.30,.38,cloth);b(.22,1.85,.14,2.30,.76,cloth);for(const zz of [.74,2.96])b(.60,zz,.94,.12,.64,cloth);b(2.10,1.87,.90,.55,.34,wood);b(1.2,.20,1.60,.35,.35,wood,.25);b(1.65,.01,2.75,.12,1.2,'#ded7c8');b(1.65,.08,1.25,.04,.70,'#26383d',.88);b(3.00,2.8,.63,.65,.40,cloth);b(.23,.36,.42,.65,.73,wood);}
  else {b(1.40,2.63,2.40,.90,.38,cloth);b(.58,1.9,.90,1.6,.38,cloth);b(1.40,3.02,2.40,.12,.80,cloth);b(.2,1.9,.12,1.6,.80,cloth);b(1.65,1.64,.9,.75,.36,wood);b(1.70,.20,2.6,.35,.45,wood);b(1.70,.12,1.2,.04,.7,'#26383d',.85);}
 }else if(r.id==='f-living'){
  b(.56,1.3,.9,proposed?2.0:1.7,.40,cloth);b(.15,1.3,.14,proposed?2.0:1.7,.80,cloth);b(1.7,1.5,.8,.55,.32,wood);if(proposed){b(.25,.55,.45,1.0,.75,wood);b(1.67,.08,2.0,.05,1.13,'#d8dedc',1.10);b(1.67,.08,2.1,.14,.12,'#3e4943',2.45);b(1.67,2.10,.30,.24,.10,'#515e58',2.63);b(1.67,2.10,.04,.04,.15,'#48584b',2.72);}else b(1.40,2.5,2.0,.55,.42,cloth);
 }else if(r.id==='g-dining'){
  b(1.60,1.80,proposed?1.40:1.65,.80,.08,wood,.72);for(const xx of [1.1,2.1])for(const zz of [1.08,2.50])b(xx,zz,.43,.45,.44,cloth);if(proposed){b(.22,1.7,.42,1.8,.44,wood);b(.20,.25,.38,.40,.8,wood);}
 }else if(r.kind==='kitchen'){
  b(.3,1.7,.60,2.7,.88,proposed?'#bdc6b4':'#9b9b92');b(.95,.30,1.9,.60,.88,proposed?'#bdc6b4':'#9b9b92');b(.30,1.7,.64,2.7,.055,'#c8cbca',.88);b(1.0,.30,2.0,.64,.055,'#c8cbca',.88);b(.31,2.55,.43,.55,.03,'#53696b',.94);b(1.13,.31,.58,.46,.03,'#27383f',.94);if(proposed){b(2.18,.39,.70,.70,2.0,'#aeb5af');b(2.18,.755,.65,.02,1.10,'#69776f',.83);for(const zz of [.6,1.2,1.8,2.4]){b(.612,zz,.015,.56,.70,'#aeb5a0',.10);b(.63,zz,.015,.45,.018,'#444d47',.71);}for(const xx of [.45,1.05,1.65]){b(xx,.15,.57,.30,.62,'#d4cfc2',1.47);b(xx,.32,.52,.016,.56,'#d5d0c2',1.5);b(xx,.33,.38,.015,.018,'#50584d',1.52);}b(1.13,.32,.64,.48,.12,'#606961',1.35);b(1.13,.10,.22,.18,.80,'#606961',1.45);b(.60,1.6,.025,2.25,.025,'#ffe3a4',1.42);b(.34,2.55,.08,.08,.28,'#a7aca5',.96);}
 }else if(r.kind==='wet'){
  cyl(g,x+w-.47,y+.23,z+.49,.24,.43,'#f7f7f0');b(w-.43,.17,.46,.20,.8,'#f7f7f0');b(.34,d-.37,.56,.42,.75,'#dbd9cc');b(.34,d-.34,.44,.32,.08,'#f8f8ef',.75);if(proposed){b(w/2,d-.08,w-.20,.06,1.5,'#c8cac0');}
 }else if(r.kind==='utility'){
  if(r.extension){b(.43,d-.43,.63,.65,.86,'#dfdfd5');if(proposed)b(.43,d-.43,.63,.65,.86,'#dfdfd5',.89);b(w-.32,.50,.51,.70,.90,wood);}else {b(.31,1.75,.60,2.8,.9,'#b7c0ba');b(.30,2.0,.45,.60,.045,'#546c72',.90);}
 }else if(r.kind==='prayer'){b(w/2,.20,w-.35,.35,.50,wood);if(proposed){b(w/2,.06,1.2,.05,1.50,'#e5d7b4');b(.20,1.15,.38,.85,.04,wood,.73);}}
 else if(r.kind==='outdoor'){cyl(g,x+1.05,y+.26,z+.92,.33,.5,wood);cyl(g,x+2.20,y+.26,z+.92,.33,.5,wood);if(proposed){b(.32,d-.27,.46,.46,.44,'#747a63');cyl(g,x+.32,y+.8,z+d-.27,.25,.65,'#52734d');}}
}
function buildFloor(f,o,base){const g=new THREE.Group();root.add(g);g.position.x=floorOffset(f,o)[0];const proposed=o.scheme==='proposed',single=o.view==='cutaway'&&o.scope!=='all',cut=o.view==='cutaway';let h=cut?o.wallHeight:o.heights[f]-.16;const wallColor=proposed?(activePalette?.wall||'#e3dfd3'):f?'#91948c':'#c4c1b5';
 if(f===0)shapeSlab(g,[[0,0],[8.6,0],[8.6,12.85],[0,12.85]],base,.16,proposed?'#cecac0':'#bdbfb7');
 else {shapeSlab(g,[[0,0],[8.6,0],[8.6,12.85],[0,12.85]],base,.16,'#c8c9c1',true); // slab includes open terrace
  const terrace=box(g,4.3,base+.005,1.05,8.5,.012,2.05,proposed?'#a6ada0':'#a5aaa0');
 }
 let segs=walls[f].map(a=>a.slice());if(f===1&&!proposed){segs=segs.filter(s=>!s[4]);segs.forEach(s=>{if(s[0]===72||s[0]===316)s[1]=Math.max(s[1],350)});segs.push([78,344,310,344]);}
 for(const s of segs)wallOpenings(g,f,s,base,h,s[4]?'#dac8db':wallColor);
 // Join ground living and dining with existing low media partition, not structural reconstruction.
 if(f===0){const pc=proposed?'#ded7c8':'#c4c1b5';wall(g,f,[55,575,311,575],base,Math.min(1.0,h),pc);if(h>1){wall(g,f,[55,575,89,575],base+1,h-1,pc);wall(g,f,[278,575,311,575],base+1,h-1,pc)}if(h>2.12)wall(g,f,[89,575,278,575],base+2.12,h-2.12,pc);if(proposed&&h>1)wall(g,f,[90,575,277,575],base+1,Math.min(1.25,h-1),'#ded7c8');}
 for(const r of rooms[f]){if(r.extension&&!proposed)continue;const [x,z]=xyz(f,r.rect[0],r.rect[1]);const w=r.rect[2]/74,d=r.rect[3]/74;const tile=o.roomFinishes?.[r.id]|| (r.kind==='wet'?'#acbcb8':r.kind==='bed'?(proposed?'#b99b77':f?'#b0ada1':'#a57e56'):r.kind==='outdoor'?'#a4ac9b':proposed?(activePalette?.floor||'#d9d6cd'):f?'#b0ada1':'#ab8059');const m=box(g,x+w/2,base+.016,z+d/2,w,.025,d,tile);m.userData.room=r;floorObjects.push(m);if(o.furniture&&(proposed||r.kind==='kitchen'||r.kind==='utility'||r.kind==='wet'))furnishing(g,f,r,base,proposed);if(o.dimensions&&cut)label(g,o.units==='ft'?r.dim.map(v=>{const n=Math.round(v/.0254);return Math.floor(n/12)+' ft '+n%12+' in'}).join(' × '):`${r.dim[0].toFixed(2)} × ${r.dim[1].toFixed(2)} m`,x+w/2,z+d/2,base+.055);if(r.extension){line(g,[[x,base+.08,z],[x+w,base+.08,z],[x+w,base+.08,z+d],[x,base+.08,z+d],[x,base+.08,z]],'#ce34c8');}}
 // Stair is a diagrammatic two-flight connection; tread/riser geometry is unverified.
 if(f===0){const rise=o.heights[0]/18;for(let i=0;i<9;i++){box(g,6.65,base+rise*(i+1)/2,7.75-i*.26,.88,rise*(i+1),.26,'#b2b3a8');box(g,5.65,base+rise*(i+10)/2,5.67+i*.26,.88,rise*(i+10),.26,'#b2b3a8');}box(g,6.15,base+rise*9-.10,5.40,1.9,.20,.62,'#b2b3a8');}
 if(f===1){ // diagrammatic terrace and balcony guards; dimensions require code review
  for(const seg of [[0,0,8.6,0],[8.6,0,8.6,5.7],[0,0,0,proposed?2.4:4.1]]){const [x1,z1,x2,z2]=seg;const len=Math.hypot(x2-x1,z2-z1);let m=box(g,(x1+x2)/2,base+.50,(z1+z2)/2,len,1,.12,proposed?'#e3dfd3':'#a5a79e');m.rotation.y=-Math.atan2(z2-z1,x2-x1);}if(proposed)box(g,2.2,base+.55,12.85,4.4,1.1,.08,'#677b71',{transparent:true,opacity:.65});
 }
 if(!cut&&o.roof&&f===1){const rz=proposed?2.35:4.08;shapeSlab(g,[[0,rz],[3.45,rz],[3.45,5.70],[8.6,5.70],[8.6,12.88],[0,12.88]],base+o.heights[1]-.03,.16,proposed?'#cdcfc6':'#a9ada7');if(proposed)shapeSlab(g,[[4.45,3.7],[6.42,3.7],[6.42,5.75],[4.45,5.75]],base+o.heights[1]-.03,.16,'#cccac5');}
 if(!cut){box(g,4.3,base+o.heights[f]-.15,13.05,9.12,.16,.70,proposed?'#dfdfd5':'#96998e');box(g,2.25,base+o.heights[f]-.38,12.78,4.65,.28,.22,wallColor);for(const xx of [1.5,2.12,2.74,3.36,3.98,5.4,6.02,6.64])box(g,xx,base+o.heights[f]-.34,12.97,.14,.28,.42,proposed?'#cbcbbf':'#96998e');}if(!cut){ // openings and front porch columns from plan footprint; vertical sizes provisional
  box(g,4.40,base+1.06,10.85,.86,2.12,.10,'#705237');
  for(const xx of [.10,3.25])box(g,xx,base+h/2,12.72,.23,h,.23,wallColor);
  if(proposed){box(g,3.25,base+h/2,12.78,.25,h,.25,'#596b61');box(g,2.27,base+h-.12,12.78,4.60,.24,.25,'#eae5db');for(let i=0;i<10;i++)box(g,.65+i*.075,base+1.45,12.73,.026,1.65,.09,'#8a7153');}
 }
 return g;
}
export function init(container,select){if(renderer)return;host=container;onSelect=select;scene=new THREE.Scene();scene.background=new THREE.Color('#e7edef');camera=new THREE.PerspectiveCamera(43,1,.05,200);renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.85;renderer.setClearColor('#e7edef');host.appendChild(renderer.domElement);renderer.domElement.setAttribute('aria-label','Navigable 3D house model');renderer.domElement.tabIndex=0;
 scene.add(new THREE.HemisphereLight('#fff7e6','#78969a',2.6));const sun=new THREE.DirectionalLight('#fff5df',3);sun.position.set(-8,18,15);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-18,right:18,top:18,bottom:-18,near:.1,far:70});sun.shadow.bias=-.001;scene.add(sun);box(scene,4.3,-.25,6.4,32,.12,36,'#dce2dc');const grid=new THREE.GridHelper(30,30,'#b5c4c3','#cbd5d2');grid.position.set(4.3,-.18,6.4);scene.add(grid);
 controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.minDistance=2;controls.maxDistance=40;controls.maxPolarAngle=Math.PI*.49;controls.target.set(4.3,1.4,6.4);controls.keys={LEFT:'ArrowLeft',UP:'ArrowUp',RIGHT:'ArrowRight',BOTTOM:'ArrowDown'};controls.listenToKeyEvents(renderer.domElement);ro=new ResizeObserver(resize);ro.observe(host);renderer.setAnimationLoop(()=>{if(!host.hidden){controls.update();renderer.render(scene,camera)}});
 installEditorPointer(renderer.domElement);resize();}
function resize(){if(!host||!host.clientWidth||!host.clientHeight)return;renderer.setSize(host.clientWidth,host.clientHeight);camera.aspect=host.clientWidth/host.clientHeight;camera.updateProjectionMatrix();}
export function rebuild(o){lastOptions=o;activePalette=palettes[o.palette||'ivory'];if(root){scene.remove(root);root.traverse(n=>{if(n.geometry)n.geometry.dispose();if(n.material?.map&&![...textures.values()].includes(n.material.map)){n.material.map.dispose();n.material.dispose()}})}root=new THREE.Group();scene.add(root);floorObjects=[];if(o.scope==='all'){buildFloor(0,o,0);buildFloor(1,o,floorOffset(1,o)[1])}else buildFloor(+o.floor,o,0);if((o.view==='exterior'||o.siteContext)&&o.compound&&o.scheme==='proposed')buildCompound(o);updateFurniture(o.furnitureLayout||{},null,true);resize();}
export function electricalOverview(mode='top',angle=0){
 if(!root)return;resize();camera.fov=46;camera.updateProjectionMatrix();
 const bounds=new THREE.Box3().setFromObject(root);bounds.expandByPoint(new THREE.Vector3(bounds.min.x,3.35,bounds.min.z));
 const center=bounds.getCenter(new THREE.Vector3()),radius=bounds.getSize(new THREE.Vector3()).length()/2;
 const vfov=THREE.MathUtils.degToRad(camera.fov),hfov=2*Math.atan(Math.tan(vfov/2)*camera.aspect);
 const distance=radius/Math.sin(Math.min(vfov,hfov)/2)*1.05;
 const direction=mode==='top'?new THREE.Vector3(0,1,.0001):new THREE.Vector3(Math.sin(angle)*.45,1,Math.cos(angle)*.55).normalize();
 controls.minDistance=2;controls.maxDistance=Math.max(100,distance*2);controls.maxPolarAngle=Math.PI*.49;
 controls.target.copy(center);camera.position.copy(center).addScaledVector(direction,distance);controls.update();
}
export function reset(){const o=lastOptions||{};if(o.view==='exterior'){camera.position.set(19,14,33);controls.target.set(4.3,2.5,8.5)}else{camera.position.set(16,19,23);controls.target.set(4.3,o.scope==='all'?2:0,6.4)}controls.update();}
export function focusRoom(r,f){const [x,z]=xyz(f,r.rect[0],r.rect[1]);const y=lastOptions.scope==='all'&&f===1?lastOptions.heights[0]+(lastOptions.explode?2.5:0):0;controls.target.set(x+r.dim[0]/2,y+.7,z+r.dim[1]/2);camera.position.set(x+r.dim[0]+2.2,y+4.4,z+r.dim[1]+3.6);controls.update();}
export function front(){camera.position.set(4.3,5.5,33);controls.target.set(4.3,2.8,9);controls.update()}

export function top(){camera.position.set(4.3,29,6.401);controls.target.set(4.3,0,6.4);controls.update();}
export function roomView(r,surface='orbit',angle=0){camera.fov=surface==='orbit'?50:surface==='ceiling'?105:70;camera.updateProjectionMatrix();const f=r.floor||0,[x,z]=xyz(f,r.rect[0],r.rect[1]),[w,d]=r.dim,base=lastOptions.scope==='all'?f*3:0;controls.minDistance=.2;controls.maxPolarAngle=Math.PI-.03;
 if(surface==='orbit'){controls.target.set(x+w/2,base+1,z+d/2);camera.position.set(x+w/2+Math.sin(angle)*5,base+4,z+d/2+Math.cos(angle)*5)}
 else if(surface==='top'){controls.target.set(x+w/2,base+.1,z+d/2);camera.position.set(x+w/2,base+8,z+d/2+.001)}
 else if(surface==='ceiling'){controls.target.set(x+w/2,base+2.84,z+d/2);camera.position.set(x+w/2,base+1.10,z+d/2+.001)}
 else {const targets={A:[x+w/2,base+1.5,z+.04],B:[x+w-.04,base+1.5,z+d/2],C:[x+w/2,base+1.5,z+d-.04],D:[x+.04,base+1.5,z+d/2]};controls.target.set(...targets[surface]);camera.position.set(x+w/2,base+1.5,z+d/2);if(surface==='A')camera.position.z=z+d-.12;if(surface==='C')camera.position.z=z+.12;if(surface==='B')camera.position.x=x+.12;if(surface==='D')camera.position.x=x+w-.12;}controls.update();}
export function setPlacement(r,surface,fn){if(!fn){placement=null;return}const [x,z]=xyz(r.floor,r.rect[0],r.rect[1]),base=lastOptions.scope==='all'?r.floor*3:0;let plane;if(surface==='ceiling'||surface==='floor')plane=new THREE.Plane(new THREE.Vector3(0,1,0),-(base+(surface==='ceiling'?2.84:.02)));else if(surface==='A'||surface==='C')plane=new THREE.Plane(new THREE.Vector3(0,0,1),-(z+(surface==='C'?r.dim[1]-.04:.04)));else plane=new THREE.Plane(new THREE.Vector3(1,0,0),-(x+(surface==='B'?r.dim[0]-.04:.04)));placement={plane,fn:pt=>fn({u:Math.max(.05,Math.min(r.dim[0]-.05,pt.x-x)),v:Math.max(.05,Math.min(r.dim[1]-.05,pt.z-z)),height:Math.max(.05,Math.min(2.84,pt.y-base))})};}
export function setInteraction(mode,callbacks={}){editor={mode,...callbacks};if(renderer)renderer.domElement.style.cursor=['move','furniture'].includes(mode)?'grab':mode==='surface'?'crosshair':'default';}
export function updateFurniture(layout={},selected=null,force=false){
 if(!scene||!lastOptions)return;lastOptions.furnitureLayout=layout;
 const key=JSON.stringify([layout,lastOptions.scope,lastOptions.floor,lastOptions.floorLayout,lastOptions.floorOffsets,lastOptions.heights,lastOptions.explode,lastOptions.furniture,lastOptions.scheme,lastOptions.palette]);
 if(force||key!==furnitureLayoutKey){
  furnitureLayoutKey=key;if(furnitureRoot){scene.remove(furnitureRoot);furnitureRoot.traverse(n=>n.geometry?.dispose());}
  furnitureRoot=new THREE.Group();scene.add(furnitureRoot);furnitureNodes=[];
  if(lastOptions.furniture&&lastOptions.scheme==='proposed')for(const item of resolvedFurniture(layout)){
   const room=rooms.flat().find(r=>r.id===item.roomId),floor=room.id.startsWith('f-')?1:0;
   if(lastOptions.scope!=='all'&&floor!==+lastOptions.floor)continue;
   const [x,z]=xyz(floor,room.rect[0],room.rect[1]),offset=floorOffset(floor,lastOptions),g=new THREE.Group();g.userData.furnitureId=item.id;g.userData.item=item;
   g.position.set(x+item.u+offset[0],offset[1],z+item.v+offset[2]);g.rotation.y=item.angle*Math.PI/180;
   for(const p of item.parts){if(p.shape==='cylinder')cyl(g,p.x,p.y,p.z,p.w/2,p.h,p.color);else box(g,p.x,p.y,p.z,p.w,p.h,p.d,p.color);}
   furnitureRoot.add(g);furnitureNodes.push(g);
  }
 }
 if(furnitureSelection){scene.remove(furnitureSelection);furnitureSelection.geometry.dispose();furnitureSelection.material.dispose();furnitureSelection=null;}
 const node=furnitureNodes.find(n=>n.userData.furnitureId===selected);if(node){furnitureSelection=new THREE.Box3Helper(new THREE.Box3().setFromObject(node),'#ed982b');furnitureSelection.material.depthTest=false;furnitureSelection.renderOrder=25;scene.add(furnitureSelection);}
}
function furnitureHit(){const h=ray.intersectObjects(furnitureNodes,true)[0];if(!h)return null;let node=h.object;while(node&&!node.userData.furnitureId)node=node.parent;return node;}
function aim(e){const rc=renderer.domElement.getBoundingClientRect();pointer.set((e.clientX-rc.left)/rc.width*2-1,-(e.clientY-rc.top)/rc.height*2+1);ray.setFromCamera(pointer,camera);}
function fixtureHit(){const h=ray.intersectObjects(serviceMeshes,true)[0];if(!h)return null;let node=h.object;while(node&&!node.userData.pointId)node=node.parent;return node;}
function planeFor(r,surface){const [x,z]=xyz(r.floor,r.rect[0],r.rect[1]),base=lastOptions.scope==='all'?r.floor*3:0;let normal,constant;
 if(['ceiling','floor'].includes(surface)){normal=new THREE.Vector3(0,1,0);constant=base+(surface==='ceiling'?2.84:.02);}
 else if(['A','C'].includes(surface)){normal=new THREE.Vector3(0,0,1);constant=z+(surface==='C'?r.dim[1]-.04:.04);}
 else{normal=new THREE.Vector3(1,0,0);constant=x+(surface==='B'?r.dim[0]-.04:.04);}
 return new THREE.Plane(normal,-constant);
}
function roomCoords(r,pt,surface){const [x,z]=xyz(r.floor,r.rect[0],r.rect[1]),base=lastOptions.scope==='all'?r.floor*3:0,snap=v=>Math.round(v/.05)*.05;
 return {surface,u:Math.max(.05,Math.min(r.dim[0]-.05,snap(pt.x-x))),v:Math.max(.05,Math.min(r.dim[1]-.05,snap(pt.z-z))),height:surface==='ceiling'?2.84:surface==='floor'?.02:Math.max(.05,Math.min(2.84,snap(pt.y-base)))};
}
function installEditorPointer(canvas){let start;
 canvas.addEventListener('pointerdown',e=>{start=[e.clientX,e.clientY];
  if(editor.mode==='furniture'&&e.button===0){aim(e);const node=furnitureHit();if(!node)return;
   const item=node.userData.item,room=rooms.flat().find(r=>r.id===item.roomId),floor=room.id.startsWith('f-')?1:0,offset=floorOffset(floor,lastOptions),plane=new THREE.Plane(new THREE.Vector3(0,1,0),-offset[1]),hit=new THREE.Vector3();
   if(!ray.ray.intersectPlane(plane,hit))return;
   dragging={kind:'furniture',id:item.id,node,item,room,floor,offset,plane,grab:hit.sub(node.position),original:node.position.clone(),coords:null};
   controls.enabled=false;canvas.setPointerCapture(e.pointerId);canvas.style.cursor='grabbing';e.stopImmediatePropagation();return;
  }
  if(editor.mode!=='move'||!serviceState)return;aim(e);const node=fixtureHit();if(!node)return;const p=serviceState.points.find(p=>p.id===node.userData.pointId),r=serviceState.opts.rooms.find(r=>r.id===p.roomId);
  dragging={id:p.id,node,room:r,surface:p.surface,plane:planeFor(r,p.surface),coords:null,original:node.position.clone()};controls.enabled=false;canvas.setPointerCapture(e.pointerId);canvas.style.cursor='grabbing';e.stopImmediatePropagation();
 },true);
 canvas.addEventListener('pointermove',e=>{if(!dragging)return;aim(e);const pt=new THREE.Vector3();if(!ray.ray.intersectPlane(dragging.plane,pt))return;const d=dragging;
  if(d.kind==='furniture'){
   if(Math.hypot(e.clientX-start[0],e.clientY-start[1])<3)return;
   const [x,z]=xyz(d.floor,d.room.rect[0],d.room.rect[1]),snap=v=>Math.round(v/.05)*.05;
   try{d.coords=fitFurniture(d.id,{roomId:d.item.roomId,u:snap(pt.x-d.grab.x-x-d.offset[0]),v:snap(pt.z-d.grab.z-z-d.offset[2]),angle:d.item.angle});d.node.position.set(x+d.coords.u+d.offset[0],d.offset[1],z+d.coords.v+d.offset[2]);if(furnitureSelection)furnitureSelection.box.setFromObject(d.node);}catch{}
   e.stopImmediatePropagation();return;
  }
  const c=roomCoords(d.room,pt,d.surface),[x,z]=xyz(d.room.floor,d.room.rect[0],d.room.rect[1]);d.coords=c;d.node.position.set(x+c.u,(lastOptions.scope==='all'?d.room.floor*3:0)+c.height,z+c.v);e.stopImmediatePropagation();},true);
 canvas.addEventListener('pointercancel',()=>{if(dragging){dragging.node.position.copy(dragging.original);if(furnitureSelection&&dragging.kind==='furniture')furnitureSelection.box.setFromObject(dragging.node);}dragging=null;controls.enabled=true;canvas.style.cursor=['move','furniture'].includes(editor.mode)?'grab':'default';});
 canvas.addEventListener('pointerup',e=>{if(dragging){const d=dragging;dragging=null;controls.enabled=true;canvas.style.cursor='grab';if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);e.stopImmediatePropagation();if(d.kind==='furniture'){if(d.coords)editor.onFurnitureMove?.(d.id,d.coords);else editor.onFurniturePick?.(d.id);}else if(d.coords)editor.onMove?.(d.id,d.coords);else servicePick?.(d.id);return;}
  if(!start||Math.hypot(e.clientX-start[0],e.clientY-start[1])>5)return;aim(e);
  if(placement){const pt=new THREE.Vector3();if(ray.ray.intersectPlane(placement.plane,pt))placement.fn(pt);return;}
  if(editor.mode==='surface'){const h=ray.intersectObjects(surfaceMeshes)[0];if(h)editor.onSurface?.(roomCoords(serviceState.opts.room,h.point,h.object.userData.surface));return;}
  if(editor.mode==='furniture'){const node=furnitureHit();if(node)editor.onFurniturePick?.(node.userData.furnitureId);return;}const node=fixtureHit();if(node){servicePick?.(node.userData.pointId);return;}const hit=ray.intersectObjects(floorObjects)[0];if(hit)onSelect(hit.object.userData.room.id);
 },true);
}
export function services(points,routes,db,opts,onPick){
 ensureModelAssets(points,()=>{if(serviceState?.points===points)services(points,routes,db,opts,onPick);},message=>console.warn(message));
 if(serviceRoot){scene.remove(serviceRoot);serviceRoot.traverse(n=>{if(!n.geometry?.userData?.customAsset)n.geometry?.dispose();if(n.material?.map?.userData?.temporary){n.material.map.dispose();n.material.dispose();}else if(n.material?.userData?.temporary)n.material.dispose();});}
 serviceRoot=new THREE.Group();scene.add(serviceRoot);serviceMeshes=[];surfaceMeshes=[];servicePick=onPick;serviceState={points,opts};
 const shown=p=>opts.scope==='all'||p.floor===opts.floor,base=p=>floorOffset(p.floor,opts)[1];
 for(const p of points.filter(shown)){
  if(opts.roomOnly&&p.roomId!==opts.roomId)continue;
  const color=p.domain==='data'?'#7955bc':p.inverter?'#087f74':'#bc713b',g=(p.customModel&&modelInstance(p.customModel,p.surface))||fixture(p,color);g.userData.pointId=p.id;g.position.set(...displayPosition([p.x,p.floor*3+p.height,p.z],p.floor,opts));serviceRoot.add(g);serviceMeshes.push(g);
  if(opts.overview){
   const marker=new THREE.Mesh(new THREE.SphereGeometry(opts.selected===p.id?.115:.075,12,8),new THREE.MeshBasicMaterial({color,depthTest:false,depthWrite:false}));marker.material.userData.temporary=true;marker.position.copy(g.position);marker.userData.pointId=p.id;marker.renderOrder=30;serviceRoot.add(marker);serviceMeshes.push(marker);
   if(opts.tags||opts.selected===p.id){const tag=overviewBadge(p.tag,color,false);tag.userData.pointId=p.id;tag.position.copy(g.position);tag.position.y+=.15;serviceRoot.add(tag);serviceMeshes.push(tag);}
  }
  if(opts.selected===p.id){const bounds=new THREE.Box3().setFromObject(g);const helper=new THREE.Box3Helper(bounds,'#ed982b');helper.material.depthTest=false;helper.material.userData.temporary=true;helper.renderOrder=20;serviceRoot.add(helper);}
 }
 if(opts.routes)for(const route of routes){const p=points.find(p=>p.id===(route.pointId||route.id));if(!p||!shown(p)||opts.roomOnly&&p.roomId!==opts.roomId)continue;const routeLine=line(serviceRoot,route.points.map(pos=>displayPosition(pos,opts.scope==='all'?(pos[1]>=3?1:0):p.floor,opts)),{power:'#c28248',essential:'#0b9c81',data:'#7959bf',control:'#6496a2',reserve:'#96a87f',feeder:'#c54e4e'}[route.domain]);routeLine.material.userData.temporary=true;}
 if(opts.overview){for(const f of opts.scope==='all'?[0,1]:[opts.floor]){const offset=floorOffset(f,opts),title=overviewBadge(f?'FIRST FLOOR':'GROUND FLOOR','#244837',true);title.position.set(4.3+offset[0],.1+offset[1],-.9);serviceRoot.add(title);}return;}
 // Six bounded pick surfaces for the selected room; highlight the chosen surface.
 const r=opts.room,[x,z]=xyz(r.floor,r.rect[0],r.rect[1]),b=opts.scope==='all'?r.floor*3:0,[w,d]=r.dim;
 for(const s of ['A','B','C','D','floor',...(r.kind==='site'?[]:['ceiling'])]){
  const horizontal=['floor','ceiling'].includes(s),width=horizontal?w:['A','C'].includes(s)?w:d,height=horizontal?d:2.84;
  const active=opts.activeSurface===s,opacity=active?.065:0;
  const mat=new THREE.MeshBasicMaterial({color:'#28b694',transparent:true,opacity,side:THREE.DoubleSide,depthWrite:false});mat.userData.temporary=true;
  const mesh=new THREE.Mesh(new THREE.PlaneGeometry(width,height),mat);mesh.userData.surface=s;
  if(horizontal){mesh.rotation.x=-Math.PI/2;mesh.position.set(x+w/2,b+(s==='ceiling'?2.84:.02),z+d/2);}
  else if(['A','C'].includes(s)){mesh.position.set(x+w/2,b+1.42,z+(s==='A'?.04:d-.04));}
  else{mesh.rotation.y=Math.PI/2;mesh.position.set(x+(s==='D'?.04:w-.04),b+1.42,z+d/2);}
  serviceRoot.add(mesh);surfaceMeshes.push(mesh);
 }
 if(opts.ceiling&&r.kind!=='site')box(serviceRoot,x+w/2,b+2.855,z+d/2,w,.02,d,'#efeade',{transparent:true,opacity:.10,side:THREE.DoubleSide,depthWrite:false});
}

function overviewBadge(text,color,heading){
 const canvas=document.createElement('canvas');canvas.width=heading?512:256;canvas.height=80;
 const ctx=canvas.getContext('2d');ctx.fillStyle=color;ctx.fillRect(0,0,canvas.width,80);ctx.fillStyle='#fff';ctx.font='600 45px Segoe UI';ctx.textAlign='center';ctx.fillText(text,canvas.width/2,56);
 const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.userData.temporary=true;
 const material=new THREE.SpriteMaterial({map:texture,depthTest:false,depthWrite:false,sizeAttenuation:heading});
 const sprite=new THREE.Sprite(material);sprite.scale.set(heading?3.2:.064,heading?.5:.020,1);sprite.center.set(.5,heading?.5:0);sprite.renderOrder=40;return sprite;
}

function buildCompound(o){
 const c=compoundSettings(o.compoundConfig||{gateWidth:o.gateWidth??3.6,gateSide:o.gateSide??'left'});if(!c.visible)return;
 const z=12.85+c.front,xl=-c.left,xr=8.6+c.right,left=c.gateSide!=='right',gw=c.gateWidth,a=left?xl+.35:xr-.35-gw,b=a+gw,h=c.height;
 box(root,(xl+xr)/2,-.08,12.85+c.front/2,xr-xl,.10,c.front,'#b9b9a4');
 for(const x of [xl,xr])box(root,x,h/2,z/2,.18,h,z,c.color);
 if(a>xl)box(root,(xl+a)/2,h/2,z,a-xl,h,.18,c.color);if(b<xr)box(root,(b+xr)/2,h/2,z,xr-b,h,.18,c.color);
 for(const x of [a,b])box(root,x,(h+.16)/2,z,.22,h+.16,.28,'#79877b');
 const slide=o.gateOpen?(left?1:-1)*(gw+.2):0,gx=(a+b)/2+slide,gh=Math.min(1.90,h);
 box(root,gx,gh/2+.05,z-.20,gw,gh,.07,'#5c6b62');for(let i=0;i<Math.ceil(gw/.14);i++)box(root,gx-gw/2+i*.14,gh/2+.05,z-.15,.045,gh-.1,.035,'#9f9175');
 box(root,left?b+.25:a-.25,.2,z-.45,.35,.4,.3,'#596b63');line(root,[[xl,.04,0],[xr,.04,0]],'#b5793c');
}

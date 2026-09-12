import {rooms} from './data.js?v=20260913-structure-navigation-1';

const roomMap=Object.fromEntries(rooms.flat().map(r=>[r.id,{...r,floor:r.id.startsWith('f-')?1:0}]));
export const furnitureCatalog=[];
function item(room,key,name,build){
 const parts=[],box=(x,z,w,d,h,color,base=0)=>parts.push({shape:'box',x,z,w,d,h,y:base+h/2,color});
 const cylinder=(x,z,r,h,color,base=0)=>parts.push({shape:'cylinder',x,z,w:r*2,d:r*2,h,y:base+h/2,color});
 build(box,cylinder);
 const minX=Math.min(...parts.map(p=>p.x-p.w/2)),maxX=Math.max(...parts.map(p=>p.x+p.w/2));
 const minZ=Math.min(...parts.map(p=>p.z-p.d/2)),maxZ=Math.max(...parts.map(p=>p.z+p.d/2));
 const u=(minX+maxX)/2,v=(minZ+maxZ)/2;
 furnitureCatalog.push({id:`F-${room.id}-${key}`,roomId:room.id,name,u,v,angle:0,width:maxX-minX,depth:maxZ-minZ,height:Math.max(...parts.map(p=>p.y+p.h/2)),parts:parts.map(p=>({...p,x:p.x-u,z:p.z-v}))});
}
for(const room of Object.values(roomMap)){
 const [w,d]=room.dim,wood='#967152',cloth='#c6bdac';
 const add=(key,name,fn)=>item(room,key,name,fn);
 if(room.kind==='bed'){
  const cx=w<3.3?w/2:w/2+.12,cz=d-1.1;
  add('bed','Bed with headboard',(b)=>{b(cx,cz,1.58,2.08,.30,wood);b(cx,cz,1.5,2,.21,'#e6e3db',.30);b(cx,cz-.36,1.5,.92,.035,'#688879',.52);for(const dx of [-.38,.38])b(cx+dx,cz+.63,.62,.35,.12,'#f8f5e9',.51);b(cx,cz+.98,1.62,.08,.85,wood);});
  add('wardrobe','Wardrobe',b=>w<3.3?b(1.1,.31,1.8,.60,1.95,'#cfbfa4'):b(.31,d/2,.60,Math.min(1.8,d-.5),1.95,'#cfbfa4'));
  add('desk','Desk with back panel',b=>{b(w-.24,1.02,.45,.90,.73,wood);b(w-.05,1.02,.04,.80,.45,'#e4d9c6',.80);});
  for(const [key,dx] of [['left',-.92],['right',.92]])add(`bedside-${key}`,`${key==='left'?'Left':'Right'} bedside table`,b=>b(cx+dx,d-.16,.26,.28,.55,wood));
 }else if(room.id==='g-living'){
  add('sofa','Living room sofa',b=>{b(.60,1.85,.90,2.30,.38,cloth);b(.22,1.85,.14,2.30,.76,cloth);for(const z of [.74,2.96])b(.60,z,.94,.12,.64,cloth);});
  add('coffee-table','Coffee table',b=>b(2.10,1.87,.90,.55,.34,wood));
  add('media-console','Media console',b=>b(1.2,.20,1.60,.35,.35,wood,.25));
  add('chair','Lounge chair',b=>b(3,2.8,.63,.65,.40,cloth));
  add('side-table','Side table',b=>b(.23,.36,.42,.65,.73,wood));
 }else if(room.id==='f-living'){
  add('sofa','Family room sofa',b=>{b(.56,1.3,.9,2,.4,cloth);b(.15,1.3,.14,2,.8,cloth);});
  add('coffee-table','Coffee table',b=>b(1.7,1.5,.8,.55,.32,wood));
  add('console','AV console',b=>b(.25,.55,.45,1,.75,wood));
 }else if(room.id==='g-dining'){
  add('table','Dining table',b=>b(1.6,1.8,1.4,.8,.08,wood,.72));
  let n=0;for(const x of [1.1,2.1])for(const z of [1.08,2.5])add(`chair-${++n}`,`Dining chair ${n}`,b=>b(x,z,.43,.45,.44,cloth));
  add('bench','Dining bench',b=>b(.22,1.7,.42,1.8,.44,wood));
  add('cabinet','Small cabinet',b=>b(.20,.25,.38,.40,.8,wood));
 }else if(room.kind==='prayer'){
  add('altar','Prayer console',b=>b(w/2,.20,w-.35,.35,.50,wood));
  add('shelf','Side shelf',b=>b(.20,1.15,.38,.85,.04,wood,.73));
 }else if(room.kind==='outdoor'){
  for(const [key,x] of [['left',1.05],['right',2.2]])add(`seat-${key}`,`${key==='left'?'Left':'Right'} outdoor seat`,(b,c)=>c(x,.92,.33,.5,wood,.01));
  add('planter','Planter',(b,c)=>{b(.32,d-.27,.46,.46,.44,'#747a63');c(.32,d-.27,.25,.65,'#52734d',.475);});
 }
}
export const furnitureById=Object.fromEntries(furnitureCatalog.map(f=>[f.id,f]));
export function furnitureFootprint(item,angle=0){const a=angle*Math.PI/180,c=Math.abs(Math.cos(a)),s=Math.abs(Math.sin(a));return {width:item.width*c+item.depth*s,depth:item.width*s+item.depth*c};}
export function furniturePlacement(id,layout={}){const f=furnitureById[id];if(!f)throw Error('Unknown furniture item');return {roomId:f.roomId,u:f.u,v:f.v,angle:0,...layout[id]};}
export function fitFurniture(id,placement){
 const item=furnitureById[id],room=roomMap[placement.roomId];
 if(!item||!room||!['u','v','angle'].every(k=>Number.isFinite(placement[k])))throw Error('Invalid furniture position');
 const angle=((placement.angle%360)+360)%360,foot=furnitureFootprint(item,angle),margin=.01;
 if(foot.width+margin*2>room.dim[0]||foot.depth+margin*2>room.dim[1])throw Error('This item does not fit in the room at that rotation. Choose another room or angle.');
 return {roomId:room.id,u:Math.max(foot.width/2+margin,Math.min(room.dim[0]-foot.width/2-margin,placement.u)),v:Math.max(foot.depth/2+margin,Math.min(room.dim[1]-foot.depth/2-margin,placement.v)),angle};
}
export function validateFurnitureLayout(layout){
 if(layout===undefined)return {};
 if(!layout||typeof layout!=='object'||Array.isArray(layout)||Object.keys(layout).length>furnitureCatalog.length)throw Error('Invalid furniture layout');
 const result={};for(const [id,value] of Object.entries(layout)){if(!Object.hasOwn(furnitureById,id)||!value||typeof value!=='object')throw Error('Unknown furniture item');result[id]=fitFurniture(id,value);}
 return result;
}
export function resolvedFurniture(layout={}){return furnitureCatalog.map(item=>({...item,...furniturePlacement(item.id,layout)}));}

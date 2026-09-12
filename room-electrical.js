import {rooms,electrical,point} from './data.js?v=20260913-structure-navigation-1';
// Explicit owner allocation: bedrooms, both living rooms, prayer room.
// Proposed offsets from the room's rear-left inside corner; heights AFF are design proposals.
const applicable=r=>r.kind==='bed'||['g-living','f-living','g-prayer'].includes(r.id);
export function roomPoints(floor){return rooms[floor].filter(applicable).flatMap(r=>{
 const [w,d]=r.dim,[x,y,rw,rh]=r.rect,tag=r.id.toUpperCase().replace('BED-','B-'),bed=r.kind==='bed';
 const cx=w<3.3?w/2:w/2+.12;
 const pts=[];
 const add=(suffix,type,u,v,name,aff,detail,group)=>{u=Math.max(.1,Math.min(w-.1,u));v=Math.max(.1,Math.min(d-.1,v));pts.push({...point(`${tag}-${suffix}`,type,x+u/w*rw,y+v/d*rh,name,detail),roomId:r.id,room:r.name,offset:[u,v],aff,group,reference:'Proposed coordinates: from rear-left inside corner of this room in the PDF orientation. Rear = top of plan; this is not compass north.'})};
 const leftAC=['f-bed-rear','f-living','g-living'].includes(r.id);
 add('AC','AC',leftAC?.12:w-.12,.65,'Dedicated AC provision',2.10,'Reserve dedicated circuit, local isolator at an approved accessible position, wall sleeve, outdoor-unit access and independently drained condensate. Final unit capacity and point height follow selection.','power');
 add('PC','2S',bed?w-.15:.15,bed?.85:1.0,'PC desk: twin sockets',1.05,'One twin power outlet position, above proposed desk height; allow monitor, computer and accessories. Confirm UPS arrangement and final desk location.','power');
 add('D','RJ',bed?w-.15:.15,bed?1.15:1.35,'PC desk: dual RJ45',1.05,'Two independent data home runs to rack; separate box/conduit from mains. Final segregation and cabinet clearance to be designed.','power');
 const entryRight=r.id==='f-bed-rear'||r.kind==='living';const frontEntry=entryRight||r.id==='g-bed-rear'||r.id==='g-prayer';
 add('SW','SW',entryRight?w-.18:.18,frontEntry?d-.25:.25,'Entry wall switch group',1.10,'Control ambient lights and fan; coordinate two-way bedroom light control with bedside stations. Do not put the switch behind an open door.','lighting');
 add('WS','2S',entryRight?w-.18:.18,frontEntry?d-.60:.60,'Entry wall twin sockets',1.10,'Separate twin-socket position beside switch group; confirm door swing and furniture clearance.','power');
 add('F','F',w/2,d/2,'Ceiling fan point','Ceiling','Fix to verified structural support, not plasterboard; coordinate fan sweep, light and pendant clearances.','lighting');
 add('L','L',w/2,d*.32,'General lighting group','Ceiling','Independent ambient light circuit/group; final luminaire count and positions need a lighting layout. This marker denotes the group, not a single mandatory fitting.','lighting');
 add('C','R',leftAC?.12:w-.12,d*.70,'Curtain / future automation route',2.35,'Empty route or selected motor feed at primary curtain location; retain accessible driver/control and confirm lintel/window dimensions.','power');
 if(bed){
  add('NL','NL',cx-.92,d-.10,'Left bedside night / reading light',1.25,'Individually switched, dimmable if chosen. Left/right are as seen looking at the proposed headboard wall. Confirm beam direction from pillow.','lighting');
  add('NR','NR',cx+.92,d-.10,'Right bedside night / reading light',1.25,'Independent night/reading light. Coordinate headboard, shelf and shade heights.','lighting');
  add('BL','BS',cx-.92,d-.35,'Left bedside switch + twin sockets',.75,'Bedside station: local reading light, two-way room-light control and twin sockets. Provide compatible neutral and protective conductor provisions for future controls.','lighting');
  add('BR','BS',cx+.92,d-.35,'Right bedside switch + twin sockets',.75,'Same bedside functions as left. Mark offsets from actual bed centreline before chasing.','lighting');
 }else if(r.kind==='living'){
  add('TV','TV',1.35,.15,'Media: twin power + dual RJ45',.65,'Power and two data home runs in separate routes; accessible empty media conduit. Check proposed console and screen position before plastering.','power');
  add('N','NL',w-.15,d-.65,'Low-level night guidance light',.30,'Low-glare circulation lighting, independently controlled or sensor-ready. Keep out of direct sight from seating.','lighting');
 }
 return pts;
});}
export function allElectrical(floor){const keep=new Set(floor===0?['DB-G','L-G2','L-G3','L-G7','L-G8','L-G9','L-G10','S-G3','S-G4','S-G5','WH-G1','WH-G2','EV-R','PV-R']:['DB-F','L-F4','L-F5','L-F6','L-F7','L-F8','S-F4','WH-F1','WH-F2','PV-F']);return [...electrical[floor].filter(p=>keep.has(p.id)).map(p=>({...p,roomId:rooms[floor].find(r=>p.x>=r.rect[0]&&p.x<=r.rect[0]+r.rect[2]&&p.y>=r.rect[1]&&p.y<=r.rect[1]+r.rect[3])?.id,group:'service'})),...roomPoints(floor)];}
export const roomRequirementRows=rooms.flat().filter(applicable).map(r=>({id:r.id,name:r.name,floor:r.id[0]==='g'?'Ground':'First',bed:r.kind==='bed',dimension:r.dim}));

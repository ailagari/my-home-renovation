import {meta,walls,windows} from './data.js?v=20260913-structure-navigation-1';
import {compoundSettings} from './compound.js?v=20260913-structure-navigation-1';

// Extra editing areas describe existing faces, not new floor area or rooms.
export const mountingAreas=[['g-exterior','Exterior house walls',0],['f-exterior','Exterior house walls',1],['g-compound','Compound walls',0]].map(([id,name,floor])=>({id,name,floor,kind:'mount',dim:[8.6,12.85],rect:[...meta.origin[floor],8.6*74,12.85*74]}));
export const isMountArea=id=>mountingAreas.some(r=>r.id===(typeof id==='string'?id:id?.roomId));
const exteriorSpecs=[
 [[0,'Left facade',-1,0],[1,'Rear · work area',0,-1],[2,'Rear · kitchen',0,-1],[7,'Rear · bedroom',0,-1],[8,'Right · rear facade',1,0],[19,'Right · front facade',1,0],[20,'Front · bedroom',0,1],[17,'Front · living facade',0,1],[18,'Bedroom facing sitout',-1,0]],
 [[0,'Left facade',-1,0],[1,'Rear · new bathroom',0,-1],[2,'Rear bedroom · terrace side',1,0],[5,'Laundry · rear',0,-1],[6,'Laundry · left',-1,0],[7,'Laundry · right',1,0],[8,'Laundry · front',0,1],[9,'Rear · east wing',0,-1],[10,'Right · rear facade',1,0],[16,'Right · front facade',1,0],[17,'Front · bedroom',0,1],[14,'Front · family living',0,1],[15,'Bedroom facing balcony',-1,0]]
];
function face(id,label,roomId,floor,start,end,normal,height,openings=[]){const length=Math.hypot(end[0]-start[0],end[1]-start[1]);return {id,label,roomId,floor,start,end,normal,height,length,tangent:[(end[0]-start[0])/length,(end[1]-start[1])/length],openings};}
export function mountingSurfaces(project={}){
 const result=[];if(project.houseModel)return result;
 for(const floor of [0,1])for(const [index,label,nx,nz] of exteriorSpecs[floor]){
  const [a,b,c,d]=walls[floor][index],horizontal=Math.abs(d-b)<1,ox=meta.origin[floor][0],oz=meta.origin[floor][1];
  const start=[(a-ox)/74+nx*.085,(b-oz)/74+nz*.085],end=[(c-ox)/74+nx*.085,(d-oz)/74+nz*.085],lo=horizontal?a:b,hi=horizontal?c:d;
  const openings=windows[floor].filter(w=>horizontal?Math.abs(w[1]-b)<8&&w[0]>=lo-1&&w[2]<=hi+1:Math.abs(w[0]-a)<8&&w[1]>=lo-1&&w[3]<=hi+1).map(w=>({from:((horizontal?w[0]:w[1])-lo)/74,to:((horizontal?w[2]:w[3])-lo)/74,bottom:horizontal&&Math.abs(b-840)<2?.3:.85,top:2.1}));
  result.push(face(`outer-${floor}-${index}`,label+(walls[floor][index][4]?' · proposed addition':''),floor?'f-exterior':'g-exterior',floor,start,end,[nx,nz],2.84,openings));
 }
 const c=compoundSettings(project.compound),xl=-c.left,xr=8.6+c.right,z=12.85+c.front,a=c.gateSide==='left'?xl+.35:xr-.35-c.gateWidth,b=a+c.gateWidth;
 for(const [key,label,start,end,normal] of [['left','Left boundary',[xl,0],[xl,z],[1,0]],['right','Right boundary',[xr,0],[xr,z],[-1,0]],['front-left','Front · left of gate',[xl,z],[a,z],[0,-1]],['front-right','Front · right of gate',[b,z],[xr,z],[0,-1]]]){
  for(const [side,sign] of [['inside',1],['outside',-1]]){const n=normal.map(v=>v*sign);result.push(face(`boundary-${key}-${side}`,`${label} · ${side}`,'g-compound',0,start.map((v,i)=>v+n[i]*.10),end.map((v,i)=>v+n[i]*.10),n,c.height));}
 }
 return result;
}
export const areaSurfaces=(roomId,project)=>mountingSurfaces(project).filter(s=>s.roomId===roomId);
export const mountSurface=(p,project)=>isMountArea(p)?areaSurfaces(p.roomId,project).find(s=>s.id===p.surface):null;
export function mountPosition(p,project){const s=mountSurface(p,project);if(!s)throw Error('Choose an exterior or compound wall face.');return [s.start[0]+s.tangent[0]*p.u,s.floor*3+p.height,s.start[1]+s.tangent[1]*p.u];}
export function clampMount(p,project){const s=mountSurface(p,project);if(!s)throw Error('Choose a valid exterior or compound wall face.');p.u=Math.max(.05,Math.min(s.length-.05,Number(p.u)||.05));p.v=0;p.height=Math.max(.05,Math.min(s.height-.05,Number(p.height)||.05));return p;}
export function openingAt(p,project){const s=mountSurface(p,project);return s?.openings.some(o=>p.u>o.from-.04&&p.u<o.to+.04&&p.height>o.bottom-.04&&p.height<o.top+.04);}
export function mountWarnings(points,project){const selected=points.filter(isMountArea);return selected.flatMap(p=>openingAt(p,project)?[`${p.tag||p.id}: mounting position overlaps a modelled window; move it onto solid wall.`]:[]).concat(selected.length?['Exterior routes are allowances. Weather protection, cable entry, penetrations and final site routing need coordination.']:[]);}
export const faceOrientation=s=>s.normal[0]===1?'D':s.normal[0]===-1?'B':s.normal[1]===1?'A':'C';
export const surfaceLabel=(p,project)=>mountSurface(p,project)?.label||({A:'Wall A · rear',B:'Wall B · right',C:'Wall C · front',D:'Wall D · left',ceiling:'Ceiling',floor:'Floor'}[p.surface]||p.surface);

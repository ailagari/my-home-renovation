import {byType,roomById,allRooms,origin,worldPoint,makePoint,clampPoint} from './studio-data.js';

export const isBoard=p=>['db1p','db3p'].includes(p?.type);
export const isSource=p=>isBoard(p)||p?.type==='rack';
export const isSwitch=p=>['switch','bedstation','dimmer'].includes(p?.type);
export const isLoad=p=>!!p&&!isSource(p)&&['lighting','general','dedicated'].includes(byType[p.type]?.group);
export const routeLength=ps=>ps.slice(1).reduce((s,p,i)=>s+p.reduce((n,v,j)=>n+Math.abs(v-ps[i][j]),0),0);

export function ensureDesign(p){
  if(!p.designVersion){
    const locate=(type,f,xyz,id,label)=>{
      const [x,y,z]=xyz;
      const candidates=allRooms.filter(r=>r.floor===f&&r.kind!=='site');
      const room=candidates.find(r=>{const [a,b]=origin(r);return x>=a&&x<=a+r.dim[0]&&z>=b&&z<=b+r.dim[1];})||roomById[f?'f-living':'g-dining'];
      const [a,b]=origin(room),u=x-a,v=z-b;
      const sides=[['D',Math.abs(u)],['B',Math.abs(room.dim[0]-u)],['A',Math.abs(v)],['C',Math.abs(room.dim[1]-v)]].sort((a,b)=>a[1]-b[1]);
      const q=clampPoint(makePoint(type,room.id,{id,label,u,v,height:y,surface:sides[0][0],inverter:false,phase:'R'}));
      p.points.push(q);return q.id;
    };
    p.dbIds=[0,1].map(f=>{const d=p.db[f];return locate('db3p',f,[d.x,d.height,d.z],`DB-${f}`,`${f?'First':'Ground'} floor DB`);});
    p.rackId=locate('rack',0,[p.rack.x,p.rack.height,p.rack.z],'RACK-1','Main network rack');
    // Old automatic switch-to-first-light assumptions are deliberately not treated as confirmed links.
    p.connections=[];p.controlCores=0;p.designVersion=2;
  }
  p.connections??=[];p.dbIds??=[null,null];p.controlCores??=0;
  const tags=new Set(p.points.map(q=>q.tag).filter(t=>typeof t==='string'&&/^E[0-9]{3,6}$/.test(t)));let number=Math.max(Number.isSafeInteger(p.nextReference)?p.nextReference:1,...[...tags].map(t=>Number(t.slice(1))+1));
  for(const q of p.points)if(!q.tag){while(tags.has('E'+String(number).padStart(3,'0')))number++;q.tag='E'+String(number++).padStart(3,'0');tags.add(q.tag);}
  p.nextReference=number;
  p.revision=Number.isSafeInteger(p.revision)&&p.revision>0?p.revision:1;
  return p;
}

export function syncSources(project){
  project.db=project.dbIds.map((id,f)=>{const p=project.points.find(q=>q.id===id&&isBoard(q)&&roomById[q.roomId].floor===f);if(!p)return project.db?.[f]||{x:4.25,z:6,height:1.5};const [x,,z]=worldPoint(p);return {x,z,height:p.height};});
  const rack=project.points.find(p=>p.id===project.rackId&&p.type==='rack');
  if(rack){const [x,,z]=worldPoint(rack);project.rack={x,z,height:rack.height,floor:roomById[rack.roomId].floor};}
}

export function removePoint(project,id){
  project.points=project.points.filter(p=>p.id!==id);
  project.connections=project.connections.filter(c=>c.switchId!==id&&c.loadId!==id);
  project.dbIds=project.dbIds.map(v=>v===id?null:v);
  if(project.rackId===id)project.rackId=null;
}

function connectedLoads(project,links,startId){
  const loads=new Set([startId]),switches=new Set();let changed=true;
  while(changed){changed=false;for(const l of links){if(loads.has(l.loadId)&&!switches.has(l.switchId)){switches.add(l.switchId);changed=true;}if(switches.has(l.switchId)&&!loads.has(l.loadId)){loads.add(l.loadId);changed=true;}}}
  return project.points.filter(p=>loads.has(p.id));
}
export function connectionError(project,links){
  const seen=new Set();
  for(const l of links){
    const sw=project.points.find(p=>p.id===l.switchId),load=project.points.find(p=>p.id===l.loadId),key=l.switchId+'|'+l.loadId;
    if(!isSwitch(sw)||!isLoad(load)||sw.id===load.id)return 'Choose an existing switch and a power load.';
    if(seen.has(key))return 'This switch is already linked to that load.';seen.add(key);
    const component=connectedLoads(project,links,load.id);
    const signature=p=>`${roomById[p.roomId].floor}/${p.inverter}/${byType[p.type].group==='dedicated'?p.id:byType[p.type].group}`;
    if(new Set(component.map(signature)).size>1)return 'Loads on one control channel must share the same floor DB, normal/essential supply and compatible circuit group. Use a separate switch for the other circuit.';
  }
  return '';
}
export function setConnection(project,switchId,loadId,enabled){
  const links=project.connections.filter(l=>l.switchId!==switchId||l.loadId!==loadId);
  if(enabled)links.push({switchId,loadId});
  const error=connectionError(project,links);if(error)throw Error(error);
  project.connections=links;
}
export function orthogonalRoute(point,source){
  const room=roomById[point.roomId],end=worldPoint(point),high=room.floor*3+2.65;
  if(room.kind==='site')return [source,[source[0],2.65,source[2]],[4.25,2.65,source[2]],[4.25,2.65,12.85],[4.25,-.5,12.85],[4.25,-.5,end[2]],[end[0],-.5,end[2]],end];
  return [source,[source[0],high,source[2]],[4.25,high,source[2]],[4.25,high,end[2]],[end[0],high,end[2]],end];
}

export function calculate(project){
  ensureDesign(project);syncSources(project);
  const points=project.points,byId=new Map(points.map(p=>[p.id,p])),boards=project.dbIds.map((id,f)=>{const p=byId.get(id);return isBoard(p)&&roomById[p.roomId].floor===f?p:null;}),rack=byId.get(project.rackId);
  const routes=[],groups=new Map(),bom=new Map(),phase={R:0,Y:0,B:0},warnings=[],unrouted=[];
  const item=(name,qty,unit,note)=>{const entry=bom.get(name)||{name,qty:0,unit,note};entry.qty+=qty;bom.set(name,entry);};
  let wiring=0,conduit=0,dataCable=0,dataConduit=0,spareConduit=0,switchWire=0,controlConduit=0,load=0,essential=0,feeder=0;
  const parent=new Map();const find=x=>{if(!parent.has(x))parent.set(x,x);if(parent.get(x)!==x)parent.set(x,find(parent.get(x)));return parent.get(x);};
  const baseKey=p=>byType[p.type].group==='dedicated'||p.type==='rack'?p.id:`${p.roomId}-${byType[p.type].group}-${p.inverter?'E':'N'}`;
  const linkError=connectionError(project,project.connections);
  if(linkError)warnings.push('Switch links need review: '+linkError);
  if(!linkError)for(const sw of points.filter(isSwitch)){
    const targets=project.connections.filter(l=>l.switchId===sw.id).map(l=>byId.get(l.loadId)).filter(isLoad);
    for(const p of targets.slice(1))parent.set(find(baseKey(p)),find(baseKey(targets[0])));
  }
  const poe=points.filter(p=>byType[p.type].group==='poe').reduce((sum,p)=>sum+p.watts*p.qty,0);
  for(const p of points){
    const t=byType[p.type],r=roomById[p.roomId],f=r.floor,n=p.qty;
    item(t.name,n,'pcs',isSource(p)?'Generic reference enclosure; product dimensions, ports / ways and protection to specify.':p.label);
    if(['Power','Controls'].includes(t.category)&&p.surface!=='ceiling')item('Outlet / switch back box',n,'pcs','Final modules/depth, mounting and weather protection to specify.');
    if(isBoard(p))continue;
    if(t.group==='plumbing'||t.group==='control')continue;
    const low=['data','poe','speaker','avpath'].includes(t.group),reserve=t.group==='reserve';
    let source=low&&rack?.type==='rack'?rack:low?null:boards[f];
    if(['speaker','avpath'].includes(t.group))source=points.find(q=>q.roomId===p.roomId&&q.type==='av')||source;
    if(!source){unrouted.push(p.id);continue;}
    const path=orthogonalRoute(p,worldPoint(source)),length=routeLength(path);
    const route={id:p.id,pointId:p.id,sourceId:source.id,floor:f,points:path,length,domain:low?'data':reserve?'reserve':p.inverter?'essential':'power'};routes.push(route);
    if(low){
      dataConduit+=length;
      if(['data','poe'].includes(t.group)){const runs=p.type==='rj45'?2:1;dataCable+=(length+2)*runs*n;item('Data cable home runs',runs*n,'runs','Each RJ45 connector has one home run to the selected rack. Dual outlets have two.');}
      else if(t.group==='speaker')item('Speaker cable route allowance',(length+2)*n,'m','Cable specification pending.');
      continue;
    }
    if(reserve){spareConduit+=length;continue;}
    const key=find(baseKey(p)),c=groups.get(key)||{id:'',key,room:r.name,floor:f,sourceId:source.id,essential:p.inverter,points:[],watts:0,length:0,wireLength:0,kind:t.group};
    c.points.push(p.id);const watts=p.watts*n+(p.id===project.rackId?poe:0);c.watts+=watts;c.length+=length;c.wireLength+=(length+2)*3*n;
    groups.set(key,c);load+=watts;if(p.inverter)essential+=watts;conduit+=length;wiring+=(length+2)*3*n;
  }
  const cs=[...groups.values()].sort((a,b)=>a.floor-b.floor||a.key.localeCompare(b.key));
  cs.forEach((c,i)=>{c.id=`${c.floor?'FF':'GF'}-C${String(i+1).padStart(2,'0')}`;c.room=[...new Set(c.points.map(id=>roomById[byId.get(id).roomId].name))].join(' + ');});
  for(const c of [...cs].sort((a,b)=>Number(b.essential)-Number(a.essential)||b.watts-a.watts)){const board=boards[c.floor];c.phase=board.type==='db1p'?(board.phase||'R'):c.essential?'R':Object.keys(phase).sort((a,b)=>phase[a]-phase[b])[0];phase[c.phase]+=c.watts;}
  const controls=[];
  for(const l of project.connections){
    const sw=byId.get(l.switchId),p=byId.get(l.loadId);if(!isSwitch(sw)||!isLoad(p))continue;
    const path=orthogonalRoute(p,worldPoint(sw)),length=routeLength(path),c=cs.find(c=>c.points.includes(p.id));
    const row={...l,switchName:sw.label,loadName:p.label,circuitId:c?.id||'UNROUTED',sourceId:c?.sourceId||'',length,multiway:project.connections.filter(q=>q.loadId===p.id).length>1};controls.push(row);
    if(linkError)continue;
    routes.push({id:`CTRL-${sw.id}-${p.id}`,pointId:p.id,sourceId:sw.id,floor:roomById[p.roomId].floor,points:path,length,domain:'control'});
    controlConduit+=length;switchWire+=(length+1)*project.controlCores;
  }
  for(const sw of points.filter(isSwitch))if(!project.connections.some(l=>l.switchId===sw.id))warnings.push(`${sw.label} (${sw.id}): no loads assigned.`);
  for(const [f,board] of boards.entries())if(!board)warnings.push(`${f?'First':'Ground'} floor has no selected DB; its power routes and conductor quantities are incomplete.`);
  if(!rack||rack.type!=='rack')warnings.push('No network rack selected; data routes are incomplete.');
  if(unrouted.length)warnings.push(`${unrouted.length} equipment points have no source route. Their cable and circuit quantities are excluded.`);
  if(controls.length&&!project.controlCores)warnings.push('Switch connections are functional relationships. Control wire cores / two-way or relay topology are unassigned; control wire is excluded from the conductor total.');
  for(const p of points.filter(isSource))if(!project.dbIds.includes(p.id)&&p.id!==project.rackId)warnings.push(`${p.label} (${p.id}) is placed but is not an active ${p.type==='rack'?'data source. Its equipment power point is counted, but no data endpoints are assigned.':'floor DB. Its incoming feed is not designed.'}`);
  const factor=1+project.waste/100;
  if(boards[0]?.type==='db1p'&&boards[1]?.type==='db3p')warnings.push('A single-phase ground DB cannot provide the proposed three-phase upper DB feed. Feeder quantities are excluded; choose a compatible supply architecture.');
  if(boards.every(Boolean)&&!(boards[0].type==='db1p'&&boards[1].type==='db3p')){
    const start=worldPoint(boards[0]),end=worldPoint(boards[1]),path=[start,[start[0],end[1],start[2]],[end[0],end[1],start[2]],end];feeder=routeLength(path)+2;
    routes.push({id:'DB-FEEDER',pointId:boards[1].id,sourceId:boards[0].id,floor:1,points:path,length:feeder-2,domain:'feeder'});
    item('Upper DB feeder conductor allowance',feeder*(boards[1].type==='db1p'?3:5)*factor,'m','Independent feeder concept: 1P+N+PE or 3P+N+PE. Backup source feed and protection design excluded.');
    item('Upper DB feeder conduit allowance',feeder*factor,'m','Separate from final point routes; proposed supply from ground DB to first-floor DB.');
  }
  item('Final-circuit conductor allowance, all sizes combined',(wiring+switchWire)*factor,'m',`Three conductors per endpoint home run with 2 m slack. Control allowance uses ${project.controlCores} user-assigned cores per functional link. Sizes/topology require design.`);
  item('Power / control conduit allowance',(conduit+controlConduit)*factor,'m','Independent point home runs plus provisional control paths; shared runs, bends, fill and routing not resolved.');
  item('Switch-control path allowance (subset)',controlConduit*factor,'m','Included in conduit allowance; not additional. Functional graph does not specify terminals or safe multiway wiring.');
  item('Data cable allowance',dataCable*factor,'m','Each connector to selected rack; 2 m slack per run and selected waste.');
  item('Data / AV conduit allowance',dataConduit*factor,'m','Separate from mains; actual segregation/fill needs design.');
  item('Empty future conduit allowance',spareConduit*factor,'m','No cables counted for empty reserved routes.');
  item('Final circuit protective-device positions',cs.length,'positions','Proposed groups only; device type, poles, ratings and spare ways not assigned.');
  return {routes,circuits:cs,controls,bom:[...bom.values()],phase,load,essential,warnings,unrouted,unresolved:warnings.length,raw:{wiring,switchWire,conduit:conduit+controlConduit,controlConduit,dataCable,dataConduit,spareConduit,feeder},excluded:'Incoming supply, inverter/solar transfer and source wiring, earthing/bonding, control terminal topology and unassigned control conductors, inactive source feeds, AC services, plumbing pipework, conduit fittings, supports and structural clash checks require measured professional design. Hardware ratings are labels, not proof of circuit capacity.'};
}

import assert from 'node:assert/strict';
import {defaultProject,calculate,makePoint,clampPoint,worldPoint,isBoard,isSource,setConnection,removePoint,ensureDesign,connectionError,byType} from './studio-data.js';
import {engineerPack,drawing,pointRows} from './electrical-report.js';
const seeded=defaultProject();
for(const type of ['downlight','fan','ac','socket13','socket16','appliance13','appliance16','rj45single','rack','db1p','db3p'])assert.ok(byType[type],type+' is available');
assert.equal(seeded.points.filter(p=>p.type==='ac').length,7);
assert.equal(seeded.points.filter(p=>p.type==='pc').length,7);
for(const id of ['g-bed-rear','g-bed-front','f-bed-rear','f-bed-front']){
 assert.equal(seeded.points.filter(p=>p.roomId===id&&p.type==='sconce').length,2);
 assert.equal(seeded.points.filter(p=>p.roomId===id&&p.type==='bedstation').length,2);
}
function empty(){const p=structuredClone(seeded);p.points=p.points.filter(isSource);p.connections=[];p.waste=0;p.points.find(p=>p.type==='rack').watts=0;return p;}
function add(p,type,room,id,patch={}){const q=clampPoint(makePoint(type,room,{id,...patch}));p.points.push(q);return q;}
const p=empty(),normal=add(p,'socket13','g-prayer','S',{watts:180,inverter:false});
let stats=calculate(p),route=stats.routes.find(r=>r.id==='S');
assert.equal(stats.load,180);assert.equal(stats.essential,0);
assert.equal(route.sourceId,p.dbIds[0]);assert.deepEqual(route.points[0],worldPoint(p.points.find(q=>q.id===p.dbIds[0])));assert.deepEqual(route.points.at(-1),worldPoint(normal));
const independent=route.points.slice(1).reduce((s,v,i)=>s+v.reduce((n,x,j)=>n+Math.abs(x-route.points[i][j]),0),0);assert.equal(route.length,independent);
assert.equal(stats.circuits.find(c=>c.points.includes('S')).wireLength,(independent+2)*3);
normal.inverter=true;stats=calculate(p);assert.equal(stats.essential,180);assert.equal(stats.circuits.find(c=>c.points.includes('S')).phase,'R');
add(p,'appliance16','f-living','UP',{watts:1500});stats=calculate(p);assert.equal(stats.routes.find(r=>r.id==='UP').sourceId,p.dbIds[1]);
const firstBoard=p.points.find(q=>q.id===p.dbIds[1]);firstBoard.type='db1p';firstBoard.phase='Y';stats=calculate(p);assert.equal(stats.circuits.find(c=>c.points.includes('UP')).phase,'Y');
assert.equal(stats.bom.find(b=>b.name==='Upper DB feeder conductor allowance').qty,stats.raw.feeder*3);
const beforeMove=stats.routes.find(r=>r.id==='UP').length;firstBoard.u-=.35;clampPoint(firstBoard);stats=calculate(p);assert.notEqual(stats.routes.find(r=>r.id==='UP').length,beforeMove);
const beforeData=calculate(p);add(p,'rj45single','f-living','RJ1');stats=calculate(p);assert.equal(stats.raw.wiring,beforeData.raw.wiring);assert.equal(stats.routes.find(r=>r.id==='RJ1').sourceId,p.rackId);
assert.equal(stats.raw.dataCable,stats.routes.find(r=>r.id==='RJ1').length+2);
add(p,'rj45','g-living','RJ2');stats=calculate(p);assert.equal(stats.bom.find(b=>b.name==='Data cable home runs').qty,3);
const networkRack=p.points.find(q=>q.id===p.rackId);networkRack.roomId='f-living';networkRack.u=1;networkRack.v=1;networkRack.surface='B';clampPoint(networkRack);stats=calculate(p);
assert.deepEqual(stats.routes.find(r=>r.id==='RJ1').points[0],worldPoint(networkRack));assert.equal(stats.routes.find(r=>r.id===networkRack.id).sourceId,p.dbIds[1]);
const oldLoad=stats.load;add(p,'camera','g-living','CAM',{watts:12});stats=calculate(p);assert.equal(stats.load,oldLoad+12);assert.equal(stats.circuits.find(c=>c.points.includes(networkRack.id)).watts,12);
const beforeWater=stats.raw.wiring;add(p,'cold','g-prayer','WATER');assert.equal(calculate(p).raw.wiring,beforeWater);
const controls=empty(),l1=add(controls,'downlight','g-living','L1',{watts:9}),l2=add(controls,'fan','g-prayer','L2',{watts:35}),sw1=add(controls,'switch','g-living','SW1'),sw2=add(controls,'switch','g-prayer','SW2');
setConnection(controls,sw1.id,l1.id,true);setConnection(controls,sw1.id,l2.id,true);setConnection(controls,sw2.id,l1.id,true);
stats=calculate(controls);assert.equal(stats.controls.length,3);assert.equal(stats.load,44,'Controls must not duplicate loads');assert.equal(stats.circuits.filter(c=>c.points.includes('L1')||c.points.includes('L2')).length,1);assert.equal(stats.controls.filter(c=>c.multiway).length,2);
assert.equal(stats.raw.switchWire,0,'Unassigned topology must not invent cores');controls.controlCores=3;stats=calculate(controls);assert.equal(stats.raw.switchWire,stats.controls.reduce((s,c)=>s+(c.length+1)*3,0));
add(controls,'downlight','f-living','OTHER');assert.throws(()=>setConnection(controls,'SW1','OTHER',true),/floor DB/);
l2.inverter=false;assert.ok(connectionError(controls,controls.connections));l2.inverter=true;
removePoint(controls,'L1');stats=calculate(controls);assert.equal(stats.controls.length,1);assert.ok(!stats.routes.some(r=>r.pointId==='L1'));
const originalLength=stats.routes.find(r=>r.id==='L2').length;l2.u+=.3;clampPoint(l2);stats=calculate(controls);assert.notEqual(stats.routes.find(r=>r.id==='L2').length,originalLength);
const bom0=stats.bom.find(b=>b.name.startsWith('Power / control conduit')).qty;controls.waste=20;stats=calculate(controls);assert.ok(Math.abs(stats.bom.find(b=>b.name.startsWith('Power / control conduit')).qty-bom0*1.2)<1e-8);
const missing=empty();add(missing,'socket13','g-living','NO-DB');removePoint(missing,missing.dbIds[0]);stats=calculate(missing);assert.ok(stats.unrouted.includes('NO-DB'));assert.ok(!stats.routes.some(r=>r.id==='NO-DB'));assert.ok(stats.warnings.some(w=>w.includes('Ground floor has no selected DB')));
const migrated=structuredClone(seeded);delete migrated.designVersion;delete migrated.dbIds;delete migrated.rackId;migrated.points=migrated.points.filter(p=>!isSource(p));ensureDesign(migrated);const n=migrated.points.length;ensureDesign(migrated);assert.equal(migrated.points.length,n);assert.equal(migrated.points.filter(isBoard).length,2);
const roundtrip=JSON.parse(JSON.stringify(controls));assert.deepEqual(calculate(roundtrip).controls,calculate(controls).controls);
const full=calculate(seeded);assert.ok(full.bom.every(b=>Number.isFinite(b.qty)&&b.qty>=0));assert.equal(new Set(seeded.points.map(p=>p.tag)).size,seeded.points.length);
const incompatible=empty();incompatible.points.find(p=>p.id===incompatible.dbIds[0]).type='db1p';const incompleteFeed=calculate(incompatible);assert.ok(incompleteFeed.warnings.some(w=>w.includes('cannot provide')));assert.equal(incompleteFeed.raw.feeder,0);
const references=empty(),first=add(references,'downlight','g-living','REF1');ensureDesign(references);const retiredTag=first.tag;removePoint(references,first.id);const second=add(references,'downlight','g-living','REF2');ensureDesign(references);assert.notEqual(second.tag,retiredTag,'Retired drawing references are not reused');
const svg=drawing(controls,calculate(controls),{floor:0,kind:'ceiling'});assert.ok(svg.includes(l2.tag));assert.ok(!svg.includes('<script'));
const pack=engineerPack(controls,calculate(controls),calculate(controls).bom);assert.ok(pack.includes('Switch-to-load connections'));assert.ok(pack.includes('Concealed route coordinate schedule'));assert.equal(pointRows(controls,calculate(controls)).length,controls.points.length);
console.log('PASS: floor DB routing, board phases, source movement, rack relocation, RJ45 runs, PoE loads, many-to-many switches, circuit merging, incompatible-link rejection, deletion, arithmetic, waste, migration, JSON round-trip and drawing schedules.');

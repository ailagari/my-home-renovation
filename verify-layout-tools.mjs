import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {furnitureById,furniturePlacement,fitFurniture,validateFurnitureLayout,resolvedFurniture} from './furniture-data.js';
import {parseModelRecord,validateModelReference} from './model-assets.js';
import {defaultProject,calculate,makePoint,worldPoint,byType} from './studio-data.js';
import {compoundSettings,compoundQuantities} from './compound.js';

const sofa='F-g-living-sofa',initial=furniturePlacement(sofa),turned=fitFurniture(sofa,{...initial,angle:90,u:-5,v:100});
assert.equal(turned.angle,90);assert.ok(turned.u>=furnitureById[sofa].depth/2);assert.ok(turned.v<3.45);
const moved=fitFurniture(sofa,{roomId:'f-living',u:1.5,v:1.5,angle:90}),layout={[sofa]:moved};
assert.equal(resolvedFurniture(layout).filter(f=>f.id===sofa).length,1);assert.equal(resolvedFurniture(layout).find(f=>f.id===sofa).roomId,'f-living');
assert.deepEqual(validateFurnitureLayout(JSON.parse(JSON.stringify(layout))),layout);assert.deepEqual(furniturePlacement(sofa),initial);
assert.throws(()=>validateFurnitureLayout({invalid:{roomId:'g-living',u:1,v:1,angle:0}}));assert.throws(()=>fitFurniture(sofa,{...initial,angle:NaN}));
assert.equal(compoundSettings().height,2);const wall=compoundQuantities();assert.ok(Math.abs(wall.length-42.7)<.0001);assert.ok(Math.abs(wall.finishArea-170.8)<.0001);
assert.equal(compoundQuantities({height:2.5}).length,wall.length);assert.ok(compoundQuantities({height:2.5}).finishArea>wall.finishArea);
assert.throws(()=>compoundSettings({gateWidth:20}));
for(const format of ['stl','obj','fbx','glb']){
 const file=await readFile(new URL(`./test-fixtures/sample-cube.${format}`,import.meta.url));
 const result=await parseModelRecord({main:`cube.${format}`,unitScale:format==='stl'?.001:1,upAxis:'Y',files:[{name:`cube.${format}`,bytes:file.buffer.slice(file.byteOffset,file.byteOffset+file.byteLength)}]});
 for(const dim of result.dimensions)assert.ok(Math.abs(dim-1)<.001,format+' dimensions');
 console.log('PASS: '+format.toUpperCase()+' parses and normalizes to a one-metre cube.');
}
const project=defaultProject(),before=calculate(project),model={assetId:'M-00000000-0000-4000-8000-000000000001',format:'stl',name:'Custom table',dimensions:[1,1,1],scale:1,angle:0};
validateModelReference(model);assert.throws(()=>validateModelReference({...model,scale:0}));
const decor=makePoint('model','g-living',{id:'CUSTOM-DECOR',customModel:model});project.points.push(decor);let stats=calculate(project);
assert.equal(stats.connectedLoad,before.connectedLoad);assert.equal(stats.routes.length,before.routes.length);assert.ok(stats.bom.some(row=>row.name.startsWith('Custom table')));
const lamp=makePoint('downlight','g-living',{id:'CUSTOM-LAMP',customModel:{...model,name:'Custom light'},watts:12});project.points.push(lamp);stats=calculate(project);
assert.equal(stats.connectedLoad,before.connectedLoad+12);assert.ok(stats.routes.some(route=>route.id===lamp.id));
const oldRoute=stats.routes.find(route=>route.id===lamp.id).length;lamp.u+=.5;stats=calculate(project);assert.notEqual(stats.routes.find(route=>route.id===lamp.id).length,oldRoute);assert.equal(stats.connectedLoad,before.connectedLoad+12);
project.dbIds[0]=null;stats=calculate(project);assert.equal(stats.connectedLoad,before.connectedLoad+12);assert.ok(stats.unrouted.includes(lamp.id));assert.ok(stats.load<stats.connectedLoad);
console.log('PASS: furniture moves/rotation/transfers, boundary quantities, imported decor vs electrical equipment, load updates and missing-source accounting.');

import * as THREE from './vendor/three.module.js';
import {FBXLoader} from './vendor/addons/loaders/FBXLoader.js';
import {STLLoader} from './vendor/addons/loaders/STLLoader.js';
import {GLTFLoader} from './vendor/addons/loaders/GLTFLoader.js';
import {OBJLoader} from './vendor/addons/loaders/OBJLoader.js';
import {clone} from './vendor/addons/utils/SkeletonUtils.js';

export const modelFormats=['glb','gltf','fbx','stl','obj'];
const cache=new Map(),pending=new Map(),failed=new Set(),MAX_ASSET=30*1024*1024,MAX_BUNDLE=120*1024*1024;
let database;
async function db(){if(database)return database;database=await new Promise((resolve,reject)=>{const request=indexedDB.open('myhome-model-assets',1);request.onupgradeneeded=()=>request.result.createObjectStore('assets',{keyPath:'id'});request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(Error('Local model storage is unavailable.'));});return database;}
export async function assetRecord(id){const database=await db();return new Promise((resolve,reject)=>{const q=database.transaction('assets').objectStore('assets').get(id);q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error);});}
async function saveRecord(record){const database=await db();await new Promise((resolve,reject)=>{const tx=database.transaction('assets','readwrite');tx.objectStore('assets').put(record);tx.oncomplete=resolve;tx.onerror=()=>reject(Error('Could not save the model locally. Export a backup or free browser storage.'));});}
const extension=name=>name.split('.').pop().toLowerCase(),basename=name=>decodeURIComponent(name.replace(/\\/g,'/').split('/').pop()).toLowerCase();
export async function parseModelRecord(record){
 const main=record.files.find(f=>f.name===record.main);if(!main)throw Error('The main model file is missing.');
 const format=extension(main.name);if(!modelFormats.includes(format))throw Error('Use GLB, glTF, FBX, STL or OBJ.');
 const manager=new THREE.LoadingManager(),urls=[],files=new Map(record.files.map(f=>[basename(f.name),f]));
 let awaitingImages=false,loadError=null,finish;const imagesDone=new Promise(resolve=>finish=resolve);
 manager.onStart=()=>awaitingImages=true;manager.onLoad=()=>finish();manager.onError=url=>{loadError=Error('A model texture could not load. Include its local texture files or use a self-contained GLB.');};
 manager.setURLModifier(url=>{
  if(url.startsWith('blob:')||url.startsWith('data:'))return url;
  const file=files.get(basename(url));if(!file)throw Error('Missing local model resource: '+basename(url)+'. Select its texture / BIN file together with the model.');
  const local=URL.createObjectURL(new Blob([file.bytes],{type:file.mime||'application/octet-stream'}));urls.push(local);return local;
 });
 try{
  let object;
  if(format==='stl'){const geometry=new STLLoader(manager).parse(main.bytes);geometry.computeVertexNormals();object=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color:'#bbb6ac',roughness:.7}));}
  else if(format==='obj')object=new OBJLoader(manager).parse(new TextDecoder().decode(main.bytes));
  else if(format==='fbx')object=new FBXLoader(manager).parse(main.bytes,'');
  else object=(await new GLTFLoader(manager).parseAsync(main.bytes,'')).scene;
  if(awaitingImages)await imagesDone;if(loadError)throw loadError;
  const orient=new THREE.Group();orient.add(object);if(record.upAxis==='Z')orient.rotation.x=-Math.PI/2;
  const root=new THREE.Group();root.add(orient);root.scale.setScalar(record.unitScale);
  root.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(root),size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3());
  if(bounds.isEmpty()||![size.x,size.y,size.z].every(Number.isFinite)||Math.max(size.x,size.y,size.z)<=0)throw Error('This file has no usable 3D geometry.');
  let vertices=0;root.traverse(n=>{if(n.geometry){vertices+=n.geometry.attributes.position?.count||0;n.geometry.userData.customAsset=true;}if(n.isLight||n.isCamera)n.visible=false;if(n.isMesh){n.castShadow=true;n.receiveShadow=true;}for(const m of Array.isArray(n.material)?n.material:n.material?[n.material]:[])m.userData.customAsset=true;});
  if(vertices>1500000)throw Error('This model is too detailed. Export a simplified model below 1.5 million vertices.');
  const normalized=new THREE.Group();normalized.add(root);root.position.set(-center.x,-bounds.min.y,-center.z);
  return {object:normalized,dimensions:[size.x,size.y,size.z]};
 }finally{for(const url of urls)URL.revokeObjectURL(url);}
}
export async function importModelFiles(files,settings){
 const total=files.reduce((sum,f)=>sum+f.size,0);if(total>MAX_ASSET)throw Error('Keep each model and its textures below 30 MB.');
 const models=files.filter(f=>modelFormats.includes(extension(f.name)));if(models.length!==1)throw Error('Select one model file, plus any of its textures and BIN file.');
 const id='M-'+crypto.randomUUID(),record={id,main:models[0].name,unitScale:settings.unitScale,upAxis:settings.upAxis,files:await Promise.all(files.map(async f=>({name:f.name,mime:f.type,bytes:await f.arrayBuffer()})))};
 const parsed=await parseModelRecord(record);await saveRecord(record);cache.set(id,parsed);failed.delete(id);
 return {assetId:id,dimensions:parsed.dimensions,format:extension(record.main),name:settings.name||record.main.replace(/\.[^.]+$/,''),scale:1,angle:0};
}
export function validateModelReference(value){
 if(!value||typeof value!=='object'||!/^M-[a-f0-9-]{36}$/i.test(value.assetId)||!modelFormats.includes(value.format)||typeof value.name!=='string'||value.name.length>120||!Array.isArray(value.dimensions)||value.dimensions.length!==3||!value.dimensions.every(n=>Number.isFinite(n)&&n>=0&&n<10000)||!Number.isFinite(value.scale)||value.scale<=0||value.scale>10000||!Number.isFinite(value.angle))throw Error('Invalid imported model metadata');
 return value;
}
export function modelInstance(reference,surface='floor'){
 const asset=cache.get(reference.assetId);if(!asset)return null;
 const object=clone(asset.object),wrapper=new THREE.Group();object.scale.setScalar(reference.scale);object.rotation.y=reference.angle*Math.PI/180;
 // The chosen point is the floor base, ceiling attachment or back face of the object.
 if(surface==='ceiling')object.position.y=-asset.dimensions[1]*reference.scale;
 else if(['A','B','C','D'].includes(surface)){object.position.y=-asset.dimensions[1]*reference.scale/2;object.position.z=asset.dimensions[2]*reference.scale/2;wrapper.rotation.y={A:0,B:-Math.PI/2,C:Math.PI,D:Math.PI/2}[surface];}
 wrapper.add(object);return wrapper;
}
export function ensureModelAssets(points,onReady,onError=()=>{}){
 const ids=[...new Set(points.map(p=>p.customModel?.assetId).filter(Boolean))].filter(id=>!cache.has(id)&&!failed.has(id));if(!ids.length)return;
 Promise.all(ids.map(id=>{
  if(!pending.has(id))pending.set(id,(async()=>{const record=await assetRecord(id);if(!record)throw Error('A 3D model is missing in this browser. Import the project backup with its model files.');cache.set(id,await parseModelRecord(record));})().catch(error=>{failed.add(id);onError(error.message);}).finally(()=>pending.delete(id)));
  return pending.get(id);
 })).then(onReady);
}
function encode(bytes){const a=new Uint8Array(bytes);let s='';for(let i=0;i<a.length;i+=32768)s+=String.fromCharCode(...a.subarray(i,i+32768));return btoa(s);}
function decode(text){const s=atob(text),a=new Uint8Array(s.length);for(let i=0;i<s.length;i++)a[i]=s.charCodeAt(i);return a.buffer;}
export async function portableProject(project){
 const result=structuredClone(project),ids=[...new Set(project.points.map(p=>p.customModel?.assetId).filter(Boolean))];let total=0;result.assetBundle=[];
 for(const id of ids){const record=await assetRecord(id);if(!record)throw Error('Cannot create a complete backup: a model file is missing from this browser.');total+=record.files.reduce((s,f)=>s+f.bytes.byteLength,0);if(total>MAX_BUNDLE)throw Error('The model backup exceeds 120 MB. Remove unused model placements or use simpler models.');result.assetBundle.push({...record,files:record.files.map(f=>({...f,bytes:undefined,base64:encode(f.bytes)}))});}
 return result;
}
export async function restoreModelBundle(project){
 const bundle=project.assetBundle;if(bundle===undefined)return;
 if(!Array.isArray(bundle)||bundle.length>100)throw Error('Invalid model backup');
 const ids=new Set(project.points.map(p=>p.customModel?.assetId).filter(Boolean)),records=[];let total=0;
 for(const item of bundle){if(!ids.has(item.id)||!Array.isArray(item.files)||item.files.length>100||!['Y','Z'].includes(item.upAxis)||![1,.01,.001].includes(item.unitScale))throw Error('Invalid model backup');
  const files=item.files.map(f=>{if(typeof f.name!=='string'||f.name.length>250||typeof f.base64!=='string'||f.base64.length>MAX_ASSET*1.4)throw Error('Invalid model resource');const bytes=decode(f.base64);total+=bytes.byteLength;if(total>MAX_BUNDLE)throw Error('Model backup exceeds 120 MB');return {name:f.name,mime:typeof f.mime==='string'?f.mime:'',bytes};});
  records.push({id:item.id,main:item.main,unitScale:item.unitScale,upAxis:item.upAxis,files});
 }
 for(const record of records){await saveRecord(record);cache.delete(record.id);failed.delete(record.id);}
 delete project.assetBundle;
}

import {byType,roomById,isBoard,isLoad,isSwitch,connectionError} from './studio-data.js?v=20260913-structure-navigation-1';

export const emergencyEligible=p=>!!p&&!isBoard(p)&&!['plumbing','data','speaker','avpath','reserve','model','poe'].includes(byType[p.type]?.group)&&(p.watts>0||isLoad(p)||p.type==='rack');
export function emergencyGroup(project,id){
 const start=project.points.find(p=>p.id===id);if(!emergencyEligible(start)&&!isSwitch(start))throw Error('Choose a powered item. PoE devices follow the network rack.');
 const ids=new Set([id]);let changed=true;
 while(changed){changed=false;for(const link of project.connections){if(ids.has(link.loadId)||ids.has(link.switchId)){for(const key of [link.loadId,link.switchId])if(!ids.has(key)){ids.add(key);changed=true;}}}}
 return project.points.filter(p=>ids.has(p.id));
}
export function setEmergency(project,id,enabled){
 const group=emergencyGroup(project,id),before=group.map(p=>p.inverter);
 group.forEach(p=>p.inverter=!!enabled);const error=connectionError(project,project.connections);
 if(error){group.forEach((p,i)=>p.inverter=before[i]);throw Error(error);}return group;
}
export function emergencyWatts(project,p){return p.watts*p.qty+(p.id===project.rackId?project.points.filter(q=>byType[q.type].group==='poe').reduce((sum,q)=>sum+q.watts*q.qty,0):0);}
export function switchChoice(project,switchId,load){
 const sw=project.points.find(p=>p.id===switchId),checked=project.connections.some(c=>c.switchId===switchId&&c.loadId===load.id);
 if(!isSwitch(sw)||!isLoad(load)||load.id===switchId)return {checked,reason:'Choose a switch and a different powered load.'};
 if(roomById[sw.roomId].floor!==roomById[load.roomId].floor)return {checked,reason:'Different floor DB; choose a switch on that floor.'};
 return {checked,reason:checked?'':connectionError(project,[...project.connections,{switchId,loadId:load.id}])};
}
export function assignSwitchLoads(project,switchId,ids,enabled){
 const before=project.connections;
 let links=before.filter(c=>!(c.switchId===switchId&&ids.includes(c.loadId)));
 if(enabled)links=links.concat(ids.map(loadId=>({switchId,loadId})));
 const error=connectionError(project,links);if(error)throw Error(error);
 project.connections=links;
}
